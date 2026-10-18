import {randomUUID} from 'node:crypto';
import {safeText,validLocation,insideVenue} from './domain.js';

const fail=(statusCode,message)=>Object.assign(new Error(message),{statusCode});
export function registerMeetups(app,{col,authenticate,admins,requireUser,requireOnSite,requireAllowedPerson,currentVenue,isBlocked,notify,audit}){
  app.post('/v1/admin/landmarks',async(req,reply)=>{
    const actor=await authenticate(req);
    if(!admins.has(actor.userId))throw fail(403,'Administrator authorization required');
    const b=req.body||{},point={lat:b.lat,lon:b.lon,accuracyMeters:0};
    if(typeof b.venueId!=='string'||!validLocation(point)||typeof b.name!=='string'||!safeText(b.name,80))throw fail(400,'Valid public landmark required');
    const venue=await col('venues').findOne({venueId:b.venueId});
    // Validate geofence separately from event time, so operators can prepare before the event.
    if(!venue||!insideVenue(point,{...venue,enabled:true,startAt:new Date(Date.now()-1000),endAt:new Date(Date.now()+1000)}))throw fail(400,'Landmark must be inside its approved venue');
    const landmark={landmarkId:randomUUID(),venueId:b.venueId,name:safeText(b.name,80),lat:b.lat,lon:b.lon,enabled:true,createdAt:new Date()};
    await col('landmarks').insertOne(landmark);
    await audit(actor.userId,'public_landmark_created',{landmarkId:landmark.landmarkId});
    return reply.code(201).send({landmark});
  });
  app.get('/v1/landmarks',async req=>{
    const actor=await requireOnSite(req);
    return {landmarks:await col('landmarks').find({venueId:actor.venue.venueId,enabled:true},{projection:{_id:0}}).limit(100).toArray()};
  });
  app.post('/v1/meetups',{config:{rateLimit:{max:8,timeWindow:'1 hour'}}},async(req,reply)=>{
    const actor=await requireOnSite(req),{targetId,landmarkId,startsAt}=req.body||{};
    await requireAllowedPerson(actor,targetId);
    if(!(await col('profiles').findOne({userId:targetId,discoverable:true})))throw fail(404,'Profile not discoverable');
    const target=await currentVenue(targetId);
    if(target.venue.venueId!==actor.venue.venueId)throw fail(403,'Meetups require the same approved venue');
    if(typeof landmarkId!=='string'||typeof startsAt!=='string')throw fail(400,'Landmark and meeting time required');
    const landmark=await col('landmarks').findOne({landmarkId,venueId:actor.venue.venueId,enabled:true});
    const time=Date.parse(startsAt),now=Date.now();
    if(!landmark||!Number.isFinite(time)||time<now||time>now+86_400_000||time>Date.parse(actor.venue.endAt))throw fail(400,'Choose an approved landmark and a future time within the event and next 24 hours');
    const meetup={meetupId:randomUUID(),requesterId:actor.userId,targetId,venueId:actor.venue.venueId,landmarkId,status:'pending',startsAt:new Date(time),expiresAt:new Date(time+30*60_000),createdAt:new Date()};
    await col('meetups').insertOne(meetup);
    notify(targetId,'meetup:requested',{meetupId:meetup.meetupId});
    return reply.code(201).send({meetupId:meetup.meetupId,status:meetup.status});
  });
  app.get('/v1/meetups',async req=>{
    const actor=await requireUser(req);
    const entries=await col('meetups').find({$or:[{requesterId:actor.userId},{targetId:actor.userId}],expiresAt:{$gt:new Date()}},{projection:{_id:0}}).sort({startsAt:1}).limit(100).toArray();
    const meetups=[];
    for(const m of entries){
      const otherId=m.requesterId===actor.userId?m.targetId:m.requesterId;
      if(await isBlocked(actor.userId,otherId))continue;
      const [person,landmark,venue]=await Promise.all([
        col('profiles').findOne({userId:otherId,discoverable:true}),
        col('landmarks').findOne({landmarkId:m.landmarkId,enabled:true},{projection:{_id:0}}),
        col('venues').findOne({venueId:m.venueId,enabled:true})
      ]);
      if(!person||!landmark||!venue)continue;
      meetups.push({...m,incoming:m.targetId===actor.userId,otherName:person.displayName,landmark});
    }
    return {meetups};
  });
  app.post('/v1/meetups/:id/decision',async req=>{
    const actor=await requireUser(req),decision=req.body?.decision;
    if(!['accepted','declined','cancelled'].includes(decision))throw fail(400,'Invalid decision');
    const m=await col('meetups').findOne({meetupId:req.params.id,expiresAt:{$gt:new Date()},$or:[{requesterId:actor.userId},{targetId:actor.userId}]});
    if(!m)throw fail(404,'Meeting unavailable');
    const other=m.requesterId===actor.userId?m.targetId:m.requesterId;
    if(await isBlocked(actor.userId,other))throw fail(403,'Meeting unavailable');
    if(decision!=='cancelled'&&(m.targetId!==actor.userId||m.status!=='pending'))throw fail(409,'Only the recipient can answer a pending invitation');
    if(decision==='cancelled'&&!['pending','accepted'].includes(m.status))throw fail(409,'Meeting already handled');
    if(decision==='accepted'){
      const [a,b,landmark]=await Promise.all([currentVenue(actor.userId),currentVenue(other),col('landmarks').findOne({landmarkId:m.landmarkId,enabled:true})]);
      if(!landmark||a.venue.venueId!==m.venueId||b.venue.venueId!==m.venueId||Date.now()>+new Date(m.startsAt))throw fail(403,'Meeting time or venue is no longer available');
    }
    const result=await col('meetups').updateOne({meetupId:m.meetupId,status:m.status},{$set:{status:decision,decidedAt:new Date()}});
    if(result.modifiedCount!==1)throw fail(409,'Meeting already handled');
    notify(other,'meetup:decision',{meetupId:m.meetupId,status:decision});
    return {status:decision};
  });
}
