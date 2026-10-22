import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import {Server as SocketServer} from 'socket.io';
import {randomUUID} from 'node:crypto';
import {newPeerToken,validPeerToken,tokenDigest,PROXIMITY_LIFETIME_MS} from './peer.js';
import fastifyStatic from '@fastify/static';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {createAuth,tokenFromHeader} from './auth.js';
import {createTicketVerifier} from './tickets.js';
import {registerSocialRoutes} from './social.js';
import {createAccess} from './access.js';
import {registerDirectory} from './directory.js';
import {EVENT_INFO} from './event.js';
import {registerMeetups,cancelPlaceMeetups} from './meetups.js';
import {registerAndroidPreview} from './android-preview.js';
import {createMeetingNotifications} from './meeting-notifications.js';
import {
  MAX_LOCATION_AGE_MS,MAX_PRESENCE_AGE_MS,DISCOVERY_MINUTES,activePresence,activeShare,approvedGrant,
  freshLocation,insideVenue,validLocation,validMinutes,normalizeRole,safeHandle,safeText,safeAvatar,
  publicProfile,haversineMeters,approxDistance,conservativeDistanceBand
} from './domain.js';

const DATE = () => new Date();
const plus=(minutes)=>new Date(Date.now()+minutes*60_000);
const jsonError=(status,message)=>Object.assign(new Error(message),{statusCode:status});
const isString=x=>typeof x==='string'&&x.length>0;

export async function buildServer({db,config,notificationFetch=fetch}){
  const allowedOrigins=(config.WEB_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
  // Same-origin PWA works without CORS; cross-origin clients require explicit allowlisting.
  const auth=createAuth({issuer:config.OIDC_ISSUER,audience:config.OIDC_AUDIENCE,jwksUrl:config.OIDC_JWKS_URL,emailClaimNamespace:config.OIDC_EMAIL_CLAIM_NAMESPACE});
  const ticketVerifier=createTicketVerifier({url:config.TICKET_VERIFY_URL,token:config.TICKET_VERIFY_TOKEN,hmacKey:config.TICKET_BINDING_HMAC_KEY});
  const admins=new Set((config.ADMIN_SUBJECTS||'').split(',').map(s=>s.trim()).filter(Boolean));
  const app=Fastify({logger:{level:config.LOG_LEVEL||'info',redact:['req.headers.authorization','req.headers.cookie','req.body.ticketSecret','req.body.token','req.body.lat','req.body.lon']},bodyLimit:200_000,trustProxy:config.TRUST_PROXY==='true'});
  await app.register(cors,{origin:(origin,callback)=>callback(null,!origin||allowedOrigins.includes(origin)),methods:['GET','POST','PATCH','PUT','DELETE'],allowedHeaders:['Authorization','Content-Type','Range','If-Match'],exposedHeaders:['Content-Range','Accept-Ranges','ETag']});
  // Background reads must not exhaust the budget for an explicit Stop/meeting
  // response. Keep separate authenticated read/write budgets; route-specific
  // invitation, directory and abuse limits remain independently enforced.
  await app.register(rateLimit,{max:req=>req.authActor?(req.method==='GET'?240:60):100,timeWindow:'1 minute',keyGenerator:async req=>{try{req.authActor=await auth(tokenFromHeader(req.headers.authorization));return JSON.stringify(['user',req.authActor.userId,req.method==='GET'?'read':'write'])}catch{return 'ip:'+req.ip}},errorResponseBuilder:()=>({statusCode:429,message:'Rate limit exceeded',error:'Too Many Requests'})});
  const cspConnect=new Set(["'self'"]);
  try{if(config.OIDC_ISSUER)cspConnect.add(new URL(config.OIDC_ISSUER).origin)}catch{}
  // A Vercel frontend proxies HTTP API requests but connects directly to the
  // configured Railway socket origin. Permit its polling fallback as well as WS.
  try{const socket=new URL(config.SOCKET_PUBLIC_ORIGIN);if(socket.protocol==='https:'&&socket.origin===config.SOCKET_PUBLIC_ORIGIN){cspConnect.add(socket.origin);cspConnect.add('wss://'+socket.host)}}catch{}
  app.addHook('onRequest',async(req,reply)=>{
    // Profiles, verified status, and location grants must never enter shared browser/proxy caches.
    if(req.url.startsWith('/v1/') || req.url.startsWith('/client-config'))reply.header('Cache-Control','no-store, private');
    reply.header('X-Content-Type-Options','nosniff');
    reply.header('X-Frame-Options','DENY');
    reply.header('Referrer-Policy','no-referrer');
    reply.header('Content-Security-Policy',`default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; frame-src https://www.openstreetmap.org; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src ${[...cspConnect].join(' ')}`);
    reply.header('Permissions-Policy','geolocation=(self), camera=(self), bluetooth=()');
  });
  const io=new SocketServer(app.server,{cors:{origin:allowedOrigins.length?allowedOrigins:false,methods:['GET','POST']},transports:['websocket','polling']});

  const col=name=>db.collection(name);
  const access=createAccess({col,config});
  const audit=async(userId,action,metadata={})=>col('audit').insertOne({userId,action,metadata,createdAt:DATE()});
  const notify=(userId,type,details={})=>io.to(`user:${userId}`).emit('notification',{type,...details});
  async function authenticate(req){
    try{return req.authActor||await auth(tokenFromHeader(req.headers.authorization))}
    catch{throw jsonError(401,'Authentication required')}
  }
  async function requireUser(req){
    const user=await authenticate(req);
    if(access.selfService&&!user.email)throw jsonError(403,'Verify your sign-in email to use community networking');
    if(access.selfService&&!access.canJoin(user))throw jsonError(403,'This private pilot is not open for your account');
    await access.enroll(user);
    const ticket=await col('tickets').findOne({userId:user.userId,status:'verified'});
    if(!ticket && !await access.community(user.userId))throw jsonError(403,access.selfService?'Community access unavailable':'Devcon ticket verification required or community invitation needed');
    return user;
  }
  async function currentVenue(userId){
    const presence=await col('presence').findOne({userId});
    if(!activePresence(presence))throw jsonError(403,'On-site check-in required or expired');
    const venue=await col('venues').findOne({venueId:presence.venueId,enabled:true});
    if(!venue || Date.now()<Date.parse(venue.startAt)||Date.now()>Date.parse(venue.endAt))throw jsonError(403,'Venue not active');
    return {presence,venue};
  }
  async function requireOnSite(req){
    const user=await requireUser(req);
    const {presence,venue}=await currentVenue(user.userId);
    return {...user,presence,venue};
  }
  await registerAndroidPreview(app,{config,requireUser,authenticate});
  async function isBlocked(a,b){
    return !!(await col('blocks').findOne({$or:[{blockerId:a,blockedId:b},{blockerId:b,blockedId:a}]}));
  }
  async function requireAllowedPerson(actor,targetId,notFoundMessage='Attendee not found'){
    if(!isString(targetId)||targetId===actor.userId)throw jsonError(400,'Invalid attendee');
    if(await isBlocked(actor.userId,targetId))throw jsonError(403,'Connection not available');
    const ticket=await col('tickets').findOne({userId:targetId,status:'verified'});
    if(!ticket && !await access.community(targetId))throw jsonError(404,notFoundMessage);
    return targetId;
  }
  const publishRefresh=()=>io.emit('directory:refresh'); // No attendee IDs, coordinates, or presence in the socket payload.

  io.use(async(socket,next)=>{
    try{socket.data.actor=await auth(socket.handshake.auth?.token);await requireUser({headers:{authorization:`Bearer ${socket.handshake.auth?.token||''}`}});next()}
    catch{next(new Error('Authentication required'))}
  });
  io.on('connection',socket=>{const expiry=setTimeout(()=>socket.disconnect(true),Math.max(0,socket.data.actor.expiresAt-Date.now()));socket.on('disconnect',()=>clearTimeout(expiry));socket.join(`user:${socket.data.actor.userId}`);socket.emit('connected',{authenticated:true});});

  app.setErrorHandler((err,req,reply)=>{
    req.log.warn({status:err.statusCode||500,code:err.code},'Request failed');
    const status=Number.isInteger(err.statusCode)&&err.statusCode>=400&&err.statusCode<600?err.statusCode:500;
    reply.code(status).send({error:status===500?'Internal server error':err.message});
  });
  const authConfigured=Boolean(config.OIDC_ISSUER&&config.OIDC_AUDIENCE&&config.OIDC_JWKS_URL&&config.WEB_OIDC_CLIENT_ID);
  const registrationEnabled=config.REGISTRATION_ENABLED!=='false';
  const httpsEndpoint=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash}catch{return false}};
  app.get('/client-config',async(req,reply)=>{reply.header('Cache-Control','no-store');return {authConfigured,registrationEnabled,authReady:registrationEnabled&&authConfigured,ticketReady:ticketVerifier.configured,communityReady:access.enabled,communitySelfService:access.selfService,googleConnection:config.OIDC_GOOGLE_CONNECTION||null,socketOrigin:config.SOCKET_PUBLIC_ORIGIN||null,nativeClientId:config.NATIVE_OIDC_CLIENT_ID||null,issuer:config.OIDC_ISSUER||null,clientId:config.WEB_OIDC_CLIENT_ID||null,audience:config.OIDC_AUDIENCE||null}});
  app.get('/health/live',async()=>({ok:true,service:'devcon-follow-api'}));
  app.get('/health/release',async(req,reply)=>{
    await db.command({ping:1});
    const now=Date.now();
    const venues=(await col('venues').find({enabled:true}).limit(100).toArray()).filter(v=>
      typeof v.venueId==='string'&&v.venueId.length>0&&validLocation({...v.center,accuracyMeters:0})&&typeof v.name==='string'&&v.name.trim()&&
      Number.isFinite(v.radiusMeters)&&v.radiusMeters>=50&&v.radiusMeters<=2500&&
      Number.isFinite(Date.parse(v.startAt))&&Date.parse(v.endAt)>now&&Date.parse(v.startAt)<Date.parse(v.endAt));
    const landmarks=venues.length?await col('landmarks').find({venueId:{$in:venues.map(v=>v.venueId)},enabled:true}).limit(1000).toArray():[];
    const hasLandmark=landmarks.some(l=>typeof l.landmarkId==='string'&&l.landmarkId.length>0&&typeof l.name==='string'&&l.name.trim()&&validLocation({...l,accuracyMeters:0})&&
      venues.some(v=>v.venueId===l.venueId&&haversineMeters(l,v.center)<=v.radiusMeters));
    const checks={auth:Boolean(httpsEndpoint(config.OIDC_ISSUER)&&config.OIDC_AUDIENCE&&httpsEndpoint(config.OIDC_JWKS_URL)&&config.WEB_OIDC_CLIENT_ID),access:ticketVerifier.configured||access.enabled||access.selfService,administrator:admins.size>0,approvedVenue:venues.length>0,approvedLandmark:hasLandmark};
    const ok=Object.values(checks).every(Boolean);return reply.code(ok?200:503).send({ok,scope:'service-configuration',checks});
  });
  app.get('/health/ready',async()=>{await db.command({ping:1});return {ok:true,ticketVerifierConfigured:ticketVerifier.configured}});
  app.get('/v1/me',async(req)=>{
    const actor=await authenticate(req);
    await access.enroll(actor);
    const [ticket,profile,presence,share]=await Promise.all([
      col('tickets').findOne({userId:actor.userId}),col('profiles').findOne({userId:actor.userId}),
      col('presence').findOne({userId:actor.userId}),col('shares').findOne({userId:actor.userId})
    ]);
    const allowed=!access.selfService||access.canJoin(actor);
    const community=allowed?await access.community(actor.userId):null;
    let onSite=false;
    if(activePresence(presence)){try{await currentVenue(actor.userId);onSite=true}catch(error){if(error.statusCode!==403)throw error}}
    return {accessEligible:allowed&&(ticket?.status==='verified'||Boolean(community)),accessTier:ticket?.status==='verified'?'official':community?'community':'pending',officiallyVerified:ticket?.status==='verified',userId:actor.userId,ticketVerified:ticket?.status==='verified',profile:publicProfile(profile),onSite,locationSharing:activeShare(share),sharingExpiresAt:activeShare(share)?share.expiresAt:null};
  });
  // No reviewed Devcon DKIM blueprint or signed per-ticket field is available.
  // Never accept an upload/asserted proof, issue a badge, or gate membership on it.
  app.get('/v1/verification/ticket-email',async req=>{
    await requireUser(req);
    return {status:'unsupported',verified:false,label:'Ticket email verified',officiallyVerified:false,reason:'A reviewed Devcon sender/event blueprint and genuine signed per-ticket identifier are required. Basic community access does not require this proof.'};
  });
  app.post('/v1/verification/ticket-email',async req=>{
    await requireUser(req);
    throw jsonError(503,'Ticket email proof verification is unavailable: no reviewed Devcon blueprint or signed per-ticket schema is configured');
  });
  app.post('/v1/tickets/verify',async(req,reply)=>{
    const actor=await authenticate(req);
    const ticketSecret=req.body?.ticketSecret;
    if(typeof ticketSecret!=='string'||ticketSecret.length<8||ticketSecret.length>2000)throw jsonError(400,'Invalid ticket verification input');
    // Verification MUST NOT call pretix check-in/redeem APIs. Require organizer identity-bound attestation.
    const attestation=await ticketVerifier.verify({ticketSecret,subject:actor.userId,email:actor.email});
    const existing=await col('tickets').findOne({userId:actor.userId});
    if(existing && existing.ticketDigest!==attestation.ticketDigest)throw jsonError(409,'Existing identity-bound ticket requires operator review');
    try {await col('tickets').updateOne({userId:actor.userId},{$set:attestation},{upsert:true});}
    catch(e){if(e.code===11000)throw jsonError(409,'Ticket is already bound to an account');throw e;}
    await audit(actor.userId,'ticket_verified');
    return reply.code(201).send({verified:true});
  });
  app.put('/v1/profile',async(req)=>{
    const actor=await requireUser(req),b=req.body||{};
    const handle=safeHandle(b.handle);
    const displayName=safeText(b.displayName,60),bio=safeText(b.bio,280);
    if(!handle||!displayName)throw jsonError(400,'Valid handle and displayName required');
    if(!Array.isArray(b.roles)||b.roles.length>4||b.roles.some(r=>!normalizeRole(r)))throw jsonError(400,'Invalid roles');
    const roles=[...new Set(b.roles)];
    const interests=Array.isArray(b.interests)?b.interests.slice(0,12).filter(x=>typeof x==='string').map(x=>safeText(x,32)):[];
    const socials={};
    for(const key of ['github','linkedin','x','website']){
      if(!b.socials?.[key])continue;
      try{const u=new URL(b.socials[key]);if(u.protocol!=='https:'||u.username||u.password||u.href.length>300)throw Error();socials[key]=u.href;}
      catch{throw jsonError(400,`Invalid ${key} link`)}
    }
    if(b.avatar&& !safeAvatar(b.avatar))throw jsonError(400,'Invalid avatar image. Use a small JPEG, PNG or WebP.');
    const update={handle,displayName,bio,lookingFor:safeText(b.lookingFor,280),openToMeet:b.openToMeet===true,roles,interests,socials,avatar:safeAvatar(b.avatar),discoverable:b.discoverable===true,eventDirectory:b.discoverable===true&&b.eventDirectory===true,updatedAt:DATE()};
    try{await col('profiles').updateOne({userId:actor.userId},{$set:update,$setOnInsert:{userId:actor.userId,createdAt:DATE()}},{upsert:true});}
    catch(e){if(e.code===11000)throw jsonError(409,'Handle already taken');throw e;}
    if(!update.discoverable){
      await Promise.all([
        col('shares').deleteOne({userId:actor.userId}),
        col('locations').deleteOne({userId:actor.userId}),
        col('peerTokens').deleteMany({userId:actor.userId}),
        col('requests').updateMany({targetId:actor.userId,status:{$in:['pending','approved']}},{$set:{status:'revoked',expiresAt:DATE()}})
      ]);
    }
    publishRefresh();
    return {profile:publicProfile({...update,userId:actor.userId})};
  });
  // Only public organizer-approved venue coordinates appear on the map.
  // Individual attendee coordinates are never returned through this endpoint.
  app.get('/v1/venue/map',async(req)=>{
    const actor=await requireUser(req);
    // Directions to a public event must work before arrival. This does not
    // grant presence, directory access, discovery or attendee location access.
    try{
      const {venue}=await currentVenue(actor.userId);
      return {venue:{venueId:venue.venueId,name:venue.name,lat:venue.center.lat,lon:venue.center.lon,radiusMeters:venue.radiusMeters},kind:'public_venue_only'};
    }catch(error){if(error.statusCode!==403)throw error}
    const now=Date.now();
    const venues=(await col('venues').find({enabled:true},{projection:{_id:0,venueId:1,name:1,center:1,radiusMeters:1,startAt:1,endAt:1}}).limit(1000).toArray()).filter(v=>
      typeof v.venueId==='string'&&v.venueId&&typeof v.name==='string'&&v.name.trim()&&validLocation({...v.center,accuracyMeters:0})&&
      Number.isFinite(v.radiusMeters)&&v.radiusMeters>=50&&v.radiusMeters<=2500&&Number.isFinite(Date.parse(v.startAt))&&Date.parse(v.endAt)>now&&Date.parse(v.startAt)<Date.parse(v.endAt)
    ).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt));
    const venue=venues.find(v=>Date.parse(v.startAt)<=now)||venues[0];
    if(!venue)throw jsonError(404,'No approved upcoming venue has been published. You can still edit your profile and keep existing connections.');
    return {venue:{venueId:venue.venueId,name:venue.name,lat:venue.center.lat,lon:venue.center.lon,radiusMeters:venue.radiusMeters,startAt:venue.startAt,endAt:venue.endAt},kind:'public_venue_only',checkInAvailable:Date.parse(venue.startAt)<=now};
  });
  app.get('/v1/event',async req=>{await requireUser(req);return {...EVENT_INFO,kind:'published_event_information',grantsPresence:false}});
  registerDirectory(app,{col,requireUser,requireOnSite,communityEnabled:access.enabled,selfService:access.selfService,memberFilter:access.memberFilter});
  async function requireProfileAudience(actor,id){
    if(await col('follows').findOne({followerId:actor.userId,followedId:id}))return;
    if(await col('profiles').findOne({userId:id,discoverable:true,eventDirectory:true}))return;
    try{const [self,target]=await Promise.all([currentVenue(actor.userId),currentVenue(id)]);if(self.venue.venueId===target.venue.venueId)return}catch{}
    throw jsonError(404,'Profile unavailable');
  }
  app.get('/v1/profiles/:userId',async(req)=>{
    const actor=await requireUser(req), id=req.params.userId;
    await requireAllowedPerson(actor,id,'Profile unavailable');
    await requireProfileAudience(actor,id);
    const profile=await col('profiles').findOne({userId:id,discoverable:true});
    if(!profile)throw jsonError(404,'Profile unavailable');
    const follow=await col('follows').findOne({followerId:actor.userId,followedId:id});
    return {profile:publicProfile(profile),following:Boolean(follow)};
  });
  app.post('/v1/follows/:userId',async(req,reply)=>{
    const actor=await requireUser(req),id=req.params.userId;
    await requireAllowedPerson(actor,id,'Profile unavailable');
    await requireProfileAudience(actor,id);
    if(!(await col('profiles').findOne({userId:id,discoverable:true})))throw jsonError(404,'Profile unavailable');
    const created=await col('follows').updateOne({followerId:actor.userId,followedId:id},{$setOnInsert:{followerId:actor.userId,followedId:id,createdAt:DATE()}},{upsert:true});
    // Idempotent follow: refreshes must not generate repeated notifications.
    if(created.upsertedCount===1)notify(id,'follow:created',{fromUserId:actor.userId});
    return reply.code(201).send({following:true});
  });
  app.delete('/v1/follows/:userId',async(req)=>{
    const actor=await requireUser(req);
    await col('follows').deleteOne({followerId:actor.userId,followedId:req.params.userId});
    await col('notes').deleteMany({ownerId:actor.userId,targetId:req.params.userId});
    return {following:false};
  });
  app.get('/v1/following',async(req)=>{
    const actor=await requireUser(req);
    const follows=await col('follows').find({followerId:actor.userId},{projection:{followedId:1,_id:0},limit:200}).toArray();
    const profiles=await col('profiles').find({userId:{$in:follows.map(x=>x.followedId)},discoverable:true}).toArray();
    const eligible=await access.eligibleIds(profiles.map(p=>p.userId));
    const result=[];for(const p of profiles){if(eligible.has(p.userId)&&!(await isBlocked(actor.userId,p.userId)))result.push(publicProfile(p));}
    return {attendees:result};
  });
  app.get('/v1/connections/:targetId/note',async req=>{
    const actor=await requireUser(req);
    if(!await col('follows').findOne({followerId:actor.userId,followedId:req.params.targetId}))throw jsonError(404,'Saved connection required');
    const note=await col('notes').findOne({ownerId:actor.userId,targetId:req.params.targetId});
    return {note:note?.body||''};
  });
  app.put('/v1/connections/:targetId/note',async req=>{
    const actor=await requireUser(req);
    if(!await col('follows').findOne({followerId:actor.userId,followedId:req.params.targetId}))throw jsonError(404,'Saved connection required');
    if(typeof req.body?.note!=='string'||req.body.note.length>1000)throw jsonError(400,'Note must be at most 1000 characters');
    await col('notes').updateOne({ownerId:actor.userId,targetId:req.params.targetId},{$set:{body:safeText(req.body.note,1000),updatedAt:DATE()}},{upsert:true});
    return {saved:true};
  });
  app.post('/v1/presence/check-in',async(req)=>{
    const actor=await requireUser(req), p=req.body||{};
    const sample={lat:p.lat,lon:p.lon,accuracyMeters:p.accuracyMeters};
    if(!validLocation(sample))throw jsonError(400,'Accurate foreground location is required (<=100m accuracy)');
    const candidates=await col('venues').find({enabled:true}).toArray();
    const venue=candidates.find(v=>insideVenue(sample,v));
    if(!venue)throw jsonError(403,'Outside active approved Devcon venues or location not accurate enough');
    await col('presence').updateOne({userId:actor.userId},{$set:{venueId:venue.venueId,expiresAt:new Date(Date.now()+MAX_PRESENCE_AGE_MS),lastConfirmedAt:DATE(),revoked:false}},{upsert:true});
    publishRefresh();
    return {onSite:true,venueId:venue.venueId,venueName:venue.name,expiresInSeconds:MAX_PRESENCE_AGE_MS/1000};
  });
  app.delete('/v1/presence',async(req)=>{
    const actor=await authenticate(req);
    // Leaving a venue immediately invalidates all grants and ephemeral radio tokens.
    await Promise.all([
      col('presence').deleteOne({userId:actor.userId}),
      col('locations').deleteOne({userId:actor.userId}),
      col('shares').deleteOne({userId:actor.userId}),
      col('peerTokens').deleteMany({userId:actor.userId}),
      col('requests').updateMany({targetId:actor.userId,status:{$in:['pending','approved']}},{$set:{status:'revoked',expiresAt:DATE()}})
    ]);
    publishRefresh();return {onSite:false};
  });
  app.post('/v1/location/share',async(req)=>{
    const actor=await requireOnSite(req),duration=req.body?.durationMinutes,audience=req.body?.audience;
    if(duration!==DISCOVERY_MINUTES)throw jsonError(400,'Nearby discovery runs for exactly 30 minutes');
    if(audience!=='verified')throw jsonError(400,'Only verified-attendee approximate discovery is supported globally');
    if(!(await col('profiles').findOne({userId:actor.userId,discoverable:true})))throw jsonError(403,'Enable a discoverable profile before sharing location');
    const current=await col('shares').findOne({userId:actor.userId});
    if(activeShare(current))throw jsonError(409,'Stop your current discovery session before starting another');
    const expiresAt=plus(DISCOVERY_MINUTES);
    try{await col('shares').updateOne({userId:actor.userId,$or:[{expiresAt:{$lte:DATE()}},{enabled:false},{revoked:true}]},{$set:{userId:actor.userId,enabled:true,audience,expiresAt,createdAt:DATE(),revoked:false}},{upsert:true});}
    catch(error){if(error.code===11000)throw jsonError(409,'Stop your current discovery session before starting another');throw error;}
    await audit(actor.userId,'location_sharing_enabled',{durationMinutes:duration,audience});
    publishRefresh();return {enabled:true,durationMinutes:DISCOVERY_MINUTES,expiresAt};
  });
  app.delete('/v1/location/share',async(req)=>{
    const actor=await authenticate(req);
    // Stop general sharing and separately approved requests to ensure Stop means Stop.
    await Promise.all([
      col('shares').deleteOne({userId:actor.userId}),
      col('locations').deleteOne({userId:actor.userId}),
      col('peerTokens').deleteMany({userId:actor.userId}),
      col('requests').updateMany({targetId:actor.userId,status:{$in:['pending','approved']}},{$set:{status:'revoked',expiresAt:DATE()}})
    ]);
    await audit(actor.userId,'location_sharing_revoked');publishRefresh();return {enabled:false};
  });
  app.post('/v1/location/sample',async(req)=>{
    const actor=await requireOnSite(req),body=req.body||{};
    const sample={lat:body.lat,lon:body.lon,accuracyMeters:body.accuracyMeters};
    if(!validLocation(sample))throw jsonError(400,'Invalid location reading');
    if(!insideVenue(sample,actor.venue))throw jsonError(403,'Location outside approved venue');
    const [share,grants]=await Promise.all([
      col('shares').findOne({userId:actor.userId}),
      col('requests').countDocuments({targetId:actor.userId,status:'approved',expiresAt:{$gt:DATE()}})
    ]);
    if(!activeShare(share)&&grants===0)throw jsonError(403,'No current location-sharing consent');
    // One latest sample per attendee, not a historical trail.
    await col('locations').updateOne({userId:actor.userId},{$set:{userId:actor.userId,geo:{type:'Point',coordinates:[sample.lon,sample.lat]},accuracyMeters:sample.accuracyMeters,observedAt:DATE(),expiresAt:new Date(Date.now()+MAX_LOCATION_AGE_MS),venueId:actor.venue.venueId}},{upsert:true});
    publishRefresh();return {recorded:true,expiresInSeconds:MAX_LOCATION_AGE_MS/1000};
  });
  app.get('/v1/nearby',async(req)=>{
    const actor=await requireOnSite(req);
    const share=await col('shares').findOne({userId:actor.userId});
    const self=await col('locations').findOne({userId:actor.userId});
    if(!activeShare(share)||!freshLocation(self))throw jsonError(403,'Opt in to location sharing and provide a fresh reading to use radar');
    const positions=await col('locations').find({venueId:actor.venue.venueId,userId:{$ne:actor.userId},expiresAt:{$gt:DATE()}},{limit:200}).toArray();
    const fresh=positions.filter(position=>freshLocation(position));
    const ids=[...new Set(fresh.map(p=>p.userId))];
    if(!ids.length)return {attendees:[],source:'consented_foreground_location',notice:'Indoor distance estimates can be inaccurate'};
    const [shares,presences,profiles,tickets,blocks]=await Promise.all([
      col('shares').find({userId:{$in:ids}}).toArray(),
      col('presence').find({userId:{$in:ids}}).toArray(),
      col('profiles').find({userId:{$in:ids},discoverable:true}).toArray(),
      access.eligibleIds(ids),
      col('blocks').find({$or:[{blockerId:actor.userId,blockedId:{$in:ids}},{blockedId:actor.userId,blockerId:{$in:ids}}]}).toArray()
    ]);
    const byId=items=>new Map(items.map(x=>[x.userId,x]));
    const shareById=byId(shares),presenceById=byId(presences),profileById=byId(profiles);
    const ticketIds=tickets;
    const denied=new Set(blocks.map(x=>x.blockerId===actor.userId?x.blockedId:x.blockerId));
    const attendees=[];
    for(const p of fresh){
      const theirShare=shareById.get(p.userId),presence=presenceById.get(p.userId),profile=profileById.get(p.userId);
      if(denied.has(p.userId)||!ticketIds.has(p.userId)||!profile||!activeShare(theirShare)||!activePresence(presence)||presence.venueId!==actor.venue.venueId)continue;
      const a={lat:self.geo.coordinates[1],lon:self.geo.coordinates[0]},b={lat:p.geo.coordinates[1],lon:p.geo.coordinates[0]};
      attendees.push({profile:publicProfile(profile),distanceBand:conservativeDistanceBand(haversineMeters(a,b),self.accuracyMeters,p.accuracyMeters),kind:'approximate_gps',lastSeenAt:p.observedAt});
    }
    return {attendees,source:'consented_foreground_location',notice:'Indoor distance estimates can be inaccurate'};
  });
  // Rotating anonymous radio tokens. Only a separately installed, tested native app may
  // advertise/scan them. Browser/PWA does not claim BLE/Wi-Fi peer discovery.
  app.post('/v1/proximity/token',async(req)=>{
    const actor=await requireOnSite(req);
    const share=await col('shares').findOne({userId:actor.userId});
    if(!activeShare(share))throw jsonError(403,'Enable temporary discovery first');
    const profile=await col('profiles').findOne({userId:actor.userId,discoverable:true});
    if(!profile)throw jsonError(403,'Profile is hidden');
    if(!config.PROXIMITY_TOKEN_HMAC_KEY||config.PROXIMITY_TOKEN_HMAC_KEY.length<32)throw jsonError(503,'Native proximity not configured');
    const token=newPeerToken();
    const expiresAt=new Date(Math.min(Date.now()+PROXIMITY_LIFETIME_MS,new Date(share.expiresAt).getTime()));
    await col('peerTokens').insertOne({digest:tokenDigest(token,config.PROXIMITY_TOKEN_HMAC_KEY),userId:actor.userId,venueId:actor.venue.venueId,expiresAt,cleanupAt:expiresAt,createdAt:DATE()});
    return {token,expiresAt,kind:'ephemeral_peer_token'};
  });
  app.post('/v1/proximity/resolve',async(req)=>{
    const actor=await requireOnSite(req);
    const share=await col('shares').findOne({userId:actor.userId});
    if(!activeShare(share))throw jsonError(403,'Enable temporary discovery first');
    const tokens=req.body?.tokens;
    if(!Array.isArray(tokens)||tokens.length>30||tokens.some(t=>!validPeerToken(t)))throw jsonError(400,'Invalid token list');
    if(!config.PROXIMITY_TOKEN_HMAC_KEY||config.PROXIMITY_TOKEN_HMAC_KEY.length<32)throw jsonError(503,'Native proximity not configured');
    const digests=[...new Set(tokens)].map(t=>tokenDigest(t,config.PROXIMITY_TOKEN_HMAC_KEY));
    const peers=await col('peerTokens').find({digest:{$in:digests},venueId:actor.venue.venueId,expiresAt:{$gt:DATE()}}).toArray();
    const ids=[...new Set(peers.map(x=>x.userId).filter(id=>id!==actor.userId))];
    if(!ids.length)return {attendees:[],notice:'BLE sightings do not establish exact distance or verified physical co-location'};
    const [presences,shares,tickets,profiles,blocks]=await Promise.all([
      col('presence').find({userId:{$in:ids}}).toArray(),
      col('shares').find({userId:{$in:ids}}).toArray(),
      access.eligibleIds(ids),
      col('profiles').find({userId:{$in:ids},discoverable:true}).toArray(),
      col('blocks').find({$or:[{blockerId:actor.userId,blockedId:{$in:ids}},{blockedId:actor.userId,blockerId:{$in:ids}}]}).toArray()
    ]);
    const byId=items=>new Map(items.map(x=>[x.userId,x]));
    const presenceById=byId(presences),shareById=byId(shares),profileById=byId(profiles);
    const eligible=tickets;
    const denied=new Set(blocks.map(x=>x.blockerId===actor.userId?x.blockedId:x.blockerId));
    const attendees=[];
    for(const id of ids){
      const presence=presenceById.get(id),profile=profileById.get(id);
      if(denied.has(id)||!eligible.has(id)||!profile||!activePresence(presence)||presence.venueId!==actor.venue.venueId||!activeShare(shareById.get(id)))continue;
      attendees.push({profile:publicProfile(profile),kind:'compatible_radio_sighting',distanceMeters:null});
    }
    return {attendees,notice:'BLE sightings do not establish exact distance or verified physical co-location'};
  });
  app.post('/v1/location/requests',async(req,reply)=>{
    const actor=await requireOnSite(req),targetId=req.body?.targetId;
    await requireAllowedPerson(actor,targetId);
    if(!(await col('profiles').findOne({userId:targetId,discoverable:true})))throw jsonError(404,'Profile not discoverable');
    const targetVenue=await currentVenue(targetId); // no off-site location requests
    if(targetVenue.venue.venueId!==actor.venue.venueId)throw jsonError(403,'Meeting requests require the same approved venue');
    const since=new Date(Date.now()-60*60_000);
    if(await col('requests').countDocuments({requesterId:actor.userId,createdAt:{$gt:since}})>=8)throw jsonError(429,'Too many requests');
    const requestId=randomUUID();
    await col('requests').insertOne({requestId,requesterId:actor.userId,targetId,status:'pending',createdAt:DATE(),expiresAt:plus(15)});
    notify(targetId,'location:requested',{requestId,fromUserId:actor.userId});
    return reply.code(201).send({requestId,status:'pending'});
  });
  app.get('/v1/location/requests',async(req)=>{
    const actor=await requireUser(req);
    const requests=await col('requests').find({targetId:actor.userId,status:'pending',expiresAt:{$gt:DATE()}},{projection:{_id:0},limit:50}).toArray();
    return {requests};
  });
  app.get('/v1/location/requests/outgoing',async(req)=>{
    const actor=await requireUser(req);
    const requests=await col('requests').find({requesterId:actor.userId,expiresAt:{$gt:DATE()}},{projection:{_id:0}}).sort({createdAt:-1}).limit(50).toArray();
    const ids=[...new Set(requests.map(x=>x.targetId))];
    const [profiles,blocks]=await Promise.all([
      ids.length?col('profiles').find({userId:{$in:ids},discoverable:true}).toArray():[],
      ids.length?col('blocks').find({$or:[{blockerId:actor.userId,blockedId:{$in:ids}},{blockedId:actor.userId,blockerId:{$in:ids}}]}).toArray():[]
    ]);
    const nameById=new Map(profiles.map(x=>[x.userId,x.displayName]));
    const denied=new Set(blocks.map(x=>x.blockerId===actor.userId?x.blockedId:x.blockerId));
    return {requests:requests.filter(x=>!denied.has(x.targetId)&&nameById.has(x.targetId)).map(x=>({requestId:x.requestId,targetId:x.targetId,targetName:nameById.get(x.targetId),status:x.status,expiresAt:x.expiresAt}))};
  });
  app.post('/v1/location/requests/:requestId/decision',async(req)=>{
    const actor=await requireOnSite(req),{decision,durationMinutes}=req.body||{};
    if(!['approved','declined'].includes(decision))throw jsonError(400,'Invalid decision');
    if(decision==='approved'&&!validMinutes(durationMinutes))throw jsonError(400,'Duration required');
    const request=await col('requests').findOne({requestId:req.params.requestId,targetId:actor.userId,status:'pending',expiresAt:{$gt:DATE()}});
    if(!request)throw jsonError(404,'Pending request not found');
    if(await isBlocked(actor.userId,request.requesterId))throw jsonError(403,'Attendee blocked');
    if(decision==='approved'){
      const requesterVenue=await currentVenue(request.requesterId);
      if(requesterVenue.venue.venueId!==actor.venue.venueId)throw jsonError(403,'Attendees must be checked in at the same venue');
    }
    const expiry=decision==='approved'?plus(Math.min(durationMinutes,60)):plus(15);
    const result=await col('requests').updateOne({requestId:request.requestId,status:'pending',targetId:actor.userId,expiresAt:{$gt:DATE()}},{$set:{status:decision,expiresAt:expiry,decidedAt:DATE()}});
    if(result.modifiedCount!==1)throw jsonError(409,'Request already handled');
    notify(request.requesterId,'location:decision',{requestId:request.requestId,status:decision});
    await audit(actor.userId,'location_request_decided',{decision,requestId:request.requestId});
    return {status:decision,expiresAt:expiry};
  });
  app.get('/v1/location/:targetId',async(req)=>{
    const actor=await requireOnSite(req),targetId=req.params.targetId;
    await requireAllowedPerson(actor,targetId);
    if(!(await col('profiles').findOne({userId:targetId,discoverable:true})))throw jsonError(404,'Profile not discoverable');
    const {presence}=await currentVenue(targetId);
    if(presence.venueId!==actor.venue.venueId)throw jsonError(403,'Not at the same approved venue');
    const [location,grant,share,self]=await Promise.all([
      col('locations').findOne({userId:targetId}),
      col('requests').findOne({requesterId:actor.userId,targetId,status:'approved',expiresAt:{$gt:DATE()}}),
      col('shares').findOne({userId:targetId}),
      col('locations').findOne({userId:actor.userId})
    ]);
    if(!freshLocation(location))throw jsonError(404,'No current location is shared');
    if(approvedGrant(grant,actor.userId,targetId)){
      // Explicitly granted recipient-specific navigation. Every read rechecks consent and expiry.
      return {kind:'consented_navigation',lat:location.geo.coordinates[1],lon:location.geo.coordinates[0],accuracyMeters:location.accuracyMeters,observedAt:location.observedAt,grantExpiresAt:grant.expiresAt};
    }
    if(!activeShare(share)||!freshLocation(self)||!activeShare(await col('shares').findOne({userId:actor.userId})))throw jsonError(403,'No approved sharing permission');
    const a={lat:self.geo.coordinates[1],lon:self.geo.coordinates[0]};
    const b={lat:location.geo.coordinates[1],lon:location.geo.coordinates[0]};
    return {kind:'approximate_only',distanceBand:conservativeDistanceBand(haversineMeters(a,b),self.accuracyMeters,location.accuracyMeters),observedAt:location.observedAt};
  });
  app.post('/v1/blocks/:targetId',async(req)=>{
    const actor=await requireUser(req),targetId=req.params.targetId;
    if(!isString(targetId)||targetId===actor.userId)throw jsonError(400,'Invalid target');
    await col('blocks').updateOne({blockerId:actor.userId,blockedId:targetId},{$setOnInsert:{blockerId:actor.userId,blockedId:targetId,createdAt:DATE()}},{upsert:true});
    await col('requests').updateMany({$or:[{requesterId:actor.userId,targetId},{requesterId:targetId,targetId:actor.userId}]},{$set:{status:'revoked',expiresAt:DATE()}});
    await col('meetingBookings').deleteMany({participants:{$all:[actor.userId,targetId]}});
    await col('meetups').updateMany({$or:[{requesterId:actor.userId,targetId},{requesterId:targetId,targetId:actor.userId}]},{$set:{status:'cancelled',expiresAt:DATE()}});
    await audit(actor.userId,'attendee_blocked',{targetId});
    return {blocked:true};
  });
  access.register(app,{authenticate,admins,audit,onRevoked:userId=>io.in(`user:${userId}`).disconnectSockets(true)});
  const meetingNotifications=createMeetingNotifications({col,eligibleIds:access.eligibleIds,isBlocked,notify,pushEnabled:config.PUSH_ENABLED==='true'&&Boolean(config.EXPO_PUSH_ACCESS_TOKEN),pushAccessToken:config.EXPO_PUSH_ACCESS_TOKEN||'',fetchImpl:notificationFetch});
  meetingNotifications.routes(app,{requireUser,authenticate});
  registerMeetups(app,{col,authenticate,admins,requireUser,requireOnSite,requireAllowedPerson,currentVenue,isBlocked,notify,audit,meetingNotifications});
  let notificationBusy=false;
  const notificationTimer=setInterval(async()=>{if(notificationBusy)return;notificationBusy=true;try{await meetingNotifications.tick()}catch{app.log.warn('Meeting update recovery unavailable')}finally{notificationBusy=false}},30000);notificationTimer.unref();
  app.addHook('onClose',async()=>clearInterval(notificationTimer));
  registerSocialRoutes(app,{col,requireUser,isBlocked,notify,audit,eligibleIds:access.eligibleIds});
  app.post('/v1/reports',async(req,reply)=>{
    const actor=await requireOnSite(req),{targetId,reason}=req.body||{};
    if(!isString(targetId)||!['spam','harassment','impersonation','other'].includes(reason))throw jsonError(400,'Invalid report');
    await requireAllowedPerson(actor,targetId);
    if(await col('reports').countDocuments({fromId:actor.userId,createdAt:{$gt:new Date(Date.now()-86_400_000)}})>=5){
      throw jsonError(429,'Too many reports; contact moderation for an urgent issue');
    }
    await col('reports').insertOne({reportId:randomUUID(),fromId:actor.userId,targetId,reason,createdAt:DATE(),status:'open'});
    return reply.code(201).send({received:true});
  });
  app.get('/v1/admin/status',async(req)=>{
    const actor=await authenticate(req);
    if(!admins.has(actor.userId))throw jsonError(403,'Administrator authorization required');
    return {admin:true,ticketProviderConfigured:ticketVerifier.configured,proximityProtocolConfigured:Boolean(config.PROXIMITY_TOKEN_HMAC_KEY)};
  });
  app.get('/v1/admin/reports',async(req)=>{
    const actor=await authenticate(req);
    if(!admins.has(actor.userId))throw jsonError(403,'Administrator authorization required');
    const reports=await col('reports').find({status:'open'}).sort({createdAt:-1}).limit(100).toArray();
    return {reports:reports.map(({_id,...report})=>report)};
  });
  app.post('/v1/admin/reports/:reportId/decision',async(req)=>{
    const actor=await authenticate(req);
    if(!admins.has(actor.userId))throw jsonError(403,'Administrator authorization required');
    const action=req.body?.action;
    if(!['dismiss','remove'].includes(action))throw jsonError(400,'Invalid moderation action');
    const report=await col('reports').findOne({reportId:req.params.reportId,status:'open'});
    if(!report)throw jsonError(404,'Report not found');
    if(action==='remove'){
      if(report.contentType==='post'){
        await Promise.all([
          col('posts').deleteOne({postId:report.contentId}),
          col('comments').deleteMany({postId:report.contentId}),
          col('postLikes').deleteMany({postId:report.contentId})
        ]);
      }else if(report.contentType==='message'){
        await col('messages').deleteOne({messageId:report.contentId});
      }else throw jsonError(400,'This report requires manual account review');
    }
    const updated=await col('reports').updateOne({reportId:report.reportId,status:'open'},{$set:{status:action==='dismiss'?'dismissed':'removed',resolvedAt:DATE(),resolvedBy:actor.userId}});
    if(updated.modifiedCount!==1)throw jsonError(409,'Already reviewed');
    await audit(actor.userId,'content_moderated',{reportId:report.reportId,action,contentType:report.contentType||'attendee'});
    return {resolved:true,action};
  });
  app.get('/v1/admin/venues',async(req)=>{
    const actor=await authenticate(req);
    if(!admins.has(actor.userId))throw jsonError(403,'Administrator authorization required');
    const venues=await col('venues').find({},{projection:{_id:0},limit:100}).toArray();
    return {venues};
  });
  app.patch('/v1/admin/venues/:venueId',async(req)=>{
    const actor=await authenticate(req);
    if(!admins.has(actor.userId))throw jsonError(403,'Administrator authorization required');
    if(typeof req.body?.enabled!=='boolean')throw jsonError(400,'enabled boolean required');
    const result=await col('venues').updateOne({venueId:req.params.venueId},{$set:{enabled:req.body.enabled,updatedAt:DATE()}});
    if(result.matchedCount===0)throw jsonError(404,'Venue not found');
    const cancelledMeetups=req.body.enabled?0:await cancelPlaceMeetups({col,notify,filter:{venueId:req.params.venueId}});
    await audit(actor.userId,'venue_toggled',{venueId:req.params.venueId,enabled:req.body.enabled,cancelledMeetups});
    publishRefresh();return {enabled:req.body.enabled};
  });
  app.post('/v1/admin/venues',async(req,reply)=>{
    const actor=await authenticate(req);
    if(!admins.has(actor.userId))throw jsonError(403,'Administrator authorization required');
    const b=req.body||{};
    const center={lat:b.lat,lon:b.lon,accuracyMeters:0};
    if(!validLocation(center)||!isString(b.name)||!Number.isFinite(b.radiusMeters)||b.radiusMeters<50||b.radiusMeters>2500||
      !Number.isFinite(Date.parse(b.startAt))||!Number.isFinite(Date.parse(b.endAt))||Date.parse(b.endAt)<=Date.parse(b.startAt))throw jsonError(400,'Invalid venue configuration');
    const venue={venueId:randomUUID(),name:safeText(b.name,100),center:{lat:b.lat,lon:b.lon},radiusMeters:b.radiusMeters,startAt:b.startAt,endAt:b.endAt,enabled:b.enabled===true,createdAt:DATE()};
    await col('venues').insertOne(venue);
    await audit(actor.userId,'venue_created',{venueId:venue.venueId});
    return reply.code(201).send({venueId:venue.venueId});
  });
  app.delete('/v1/account',async(req)=>{
    // An unverified attendee must still be able to erase their account data.
    const actor=await authenticate(req),id=actor.userId;
    const authored=await col('posts').find({authorId:id},{projection:{postId:1,_id:0}}).toArray();
    const authoredIds=authored.map(p=>p.postId);
    await Promise.all([
      col('profiles').deleteMany({userId:id}),col('tickets').deleteMany({userId:id}),
      col('presence').deleteMany({userId:id}),col('locations').deleteMany({userId:id}),
      col('shares').deleteMany({userId:id}),col('follows').deleteMany({$or:[{followerId:id},{followedId:id}]}),
      col('requests').deleteMany({$or:[{requesterId:id},{targetId:id}]}),
      col('blocks').deleteMany({$or:[{blockerId:id},{blockedId:id}]}),
      col('peerTokens').deleteMany({userId:id}),
      col('invitations').deleteMany({usedBy:id}),
      col('communityMembers').deleteMany({userId:id}),
      col('notes').deleteMany({$or:[{ownerId:id},{targetId:id}]}),
      col('meetups').deleteMany({$or:[{requesterId:id},{targetId:id}]}),
      col('meetingBookings').deleteMany({participants:id}),col('pushDevices').deleteMany({userId:id}),col('pushDeliveries').deleteMany({userId:id}),
      col('meetingNotifications').deleteMany({$or:[{userId:id},{otherId:id}]}),
      col('posts').deleteMany({authorId:id}),
      col('comments').deleteMany({authorId:id}),
      col('postLikes').deleteMany({$or:[{userId:id},{postId:{$in:authoredIds}}]}),
      col('comments').deleteMany({postId:{$in:authoredIds}}),
      col('messages').deleteMany({$or:[{senderId:id},{recipientId:id}]})
    ]);
    await audit(id,'account_deleted');
    // Reports retained for moderation and audit log retained under documented retention policy; no GPS stored in audit.
    io.in(`user:${id}`).disconnectSockets(true);return {deleted:true};
  });
  // The built PWA is served from the SAME origin as the authenticated API. Never cache API responses.
  const webRoot=resolve(process.cwd(),'web','dist');
  if(existsSync(webRoot))await app.register(fastifyStatic,{root:webRoot,prefix:'/',wildcard:false,decorateReply:false});
  return {server:app,io};
}
