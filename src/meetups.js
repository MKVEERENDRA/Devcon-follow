import {randomUUID,createHash} from 'node:crypto';
import {safeText,validLocation,insideVenue} from './domain.js';

const fail=(statusCode,message)=>Object.assign(new Error(message),{statusCode});
export function registerMeetups(app,{col,authenticate,admins,requireUser,requireOnSite,requireAllowedPerson,currentVenue,isBlocked,notify,audit,meetingNotifications}){
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
    const actor=await requireOnSite(req),{targetId,landmarkId,startsAt,reason,requestId}=req.body||{};
    if(requestId!==undefined&&(typeof requestId!=='string'||! /^[a-zA-Z0-9_-]{16,80}$/.test(requestId)))throw fail(400,'Invalid meeting request identifier');
    await meetingNotifications.reconcile(actor.userId);
    const fingerprint=createHash('sha256').update(JSON.stringify([targetId,landmarkId,startsAt,reason])).digest('hex');
    const meetingKey=createHash('sha256').update(JSON.stringify([actor.userId,requestId||fingerprint])).digest('hex');
    const existing=await col('meetups').findOne({_id:meetingKey,requesterId:actor.userId});
    if(existing){if(existing.fingerprint!==fingerprint)throw fail(409,'This request identifier belongs to a different invitation');await requireAllowedPerson(actor,existing.targetId);await meetingNotifications.sync(existing);return reply.code(201).send({meetupId:existing.meetupId,status:existing.status})}
    if(reason!==undefined&&(typeof reason!=='string'||reason.trim().length>280))throw fail(400,'Meeting reason must be text of at most 280 characters');
    await requireAllowedPerson(actor,targetId);
    if(!(await col('profiles').findOne({userId:targetId,discoverable:true})))throw fail(404,'Profile not discoverable');
    const target=await currentVenue(targetId);
    if(target.venue.venueId!==actor.venue.venueId)throw fail(403,'Meetups require the same approved venue');
    if(typeof landmarkId!=='string'||typeof startsAt!=='string')throw fail(400,'Landmark and meeting time required');
    const landmark=await col('landmarks').findOne({landmarkId,venueId:actor.venue.venueId,enabled:true});
    const time=Date.parse(startsAt),now=Date.now();
    if(!landmark||!Number.isFinite(time)||time<now||time>now+86_400_000||time>Date.parse(actor.venue.endAt))throw fail(400,'Choose an approved landmark and a future time within the event and next 24 hours');
    const meetup={_id:meetingKey,fingerprint,notificationPending:true,meetupId:randomUUID(),requesterId:actor.userId,targetId,venueId:actor.venue.venueId,landmarkId,reason:safeText(reason,280),status:'pending',startsAt:new Date(time),expiresAt:new Date(time+30*86_400_000),createdAt:new Date()};
    try{await col('meetups').insertOne(meetup)}catch(error){if(error.code===11000){const retry=await col('meetups').findOne({_id:meetingKey});if(retry?.fingerprint===fingerprint){await meetingNotifications.sync(retry);return reply.code(201).send({meetupId:retry.meetupId,status:retry.status})}throw fail(409,'You already have a pending invitation to this attendee. Review it in Meetups before sending another.')}throw error}
    await meetingNotifications.sync(meetup);
    notify(targetId,'meetup:requested',{meetupId:meetup.meetupId});
    return reply.code(201).send({meetupId:meetup.meetupId,status:meetup.status});
  });
  app.get('/v1/meetups',async req=>{
    const actor=await requireUser(req);await meetingNotifications.reconcile(actor.userId);
    const participant={$or:[{requesterId:actor.userId},{targetId:actor.userId}],expiresAt:{$gt:new Date()}};
    // Old history must never crowd upcoming invitations out of the response.
    const [upcoming,history]=await Promise.all([col('meetups').find({...participant,status:{$in:['pending','accepted']}},{projection:{_id:0}}).sort({startsAt:1}).limit(100).toArray(),col('meetups').find({...participant,status:{$nin:['pending','accepted']}},{projection:{_id:0}}).sort({startsAt:-1}).limit(50).toArray()]);
    const entries=[...upcoming,...history];
    const meetups=[];
    for(const m of entries){
      const otherId=m.requesterId===actor.userId?m.targetId:m.requesterId;
      if(await isBlocked(actor.userId,otherId))continue;
      try{await requireAllowedPerson(actor,otherId)}catch{continue}
      const [person,landmark,venue]=await Promise.all([
        col('profiles').findOne({userId:otherId,discoverable:true}),
        col('landmarks').findOne({landmarkId:m.landmarkId,enabled:true},{projection:{_id:0}}),
        col('venues').findOne({venueId:m.venueId,enabled:true})
      ]);
      if(!person||!landmark||!venue)continue;
      delete m.fingerprint;delete m.notificationSyncedStatus;delete m.notificationPending;
      meetups.push({...m,durationMinutes:30,incoming:m.targetId===actor.userId,otherName:person.displayName,landmark});
    }
    return {meetups};
  });
  app.post('/v1/meetups/:id/decision',async req=>{
    const actor=await requireUser(req),decision=req.body?.decision;await meetingNotifications.reconcile(actor.userId);
    if(!['accepted','declined','cancelled'].includes(decision))throw fail(400,'Invalid decision');
    const m=await col('meetups').findOne({meetupId:req.params.id,expiresAt:{$gt:new Date()},$or:[{requesterId:actor.userId},{targetId:actor.userId}]});
    if(!m)throw fail(404,'Meeting unavailable');
    const other=m.requesterId===actor.userId?m.targetId:m.requesterId;
    if(await isBlocked(actor.userId,other))throw fail(403,'Meeting unavailable');
    if(m.status===decision&&(decision==='cancelled'||m.targetId===actor.userId))return {status:decision};
    if(decision!=='cancelled'&&(m.targetId!==actor.userId||m.status!=='pending'))throw fail(409,'Only the recipient can answer a pending invitation');
    if(decision==='cancelled'&&!['pending','accepted'].includes(m.status))throw fail(409,'Meeting already handled');
    if(decision!=='cancelled')await requireAllowedPerson(actor,other);
    if(decision==='accepted'){
      const [a,b,landmark]=await Promise.all([currentVenue(actor.userId),currentVenue(other),col('landmarks').findOne({landmarkId:m.landmarkId,enabled:true})]);
      if(!landmark||a.venue.venueId!==m.venueId||b.venue.venueId!==m.venueId||Date.now()>+new Date(m.startsAt))throw fail(403,'Meeting time or venue is no longer available');
    }
    if(decision==='accepted'){
      const start=Math.floor(+new Date(m.startsAt)/60000),end=Math.ceil((+new Date(m.startsAt)+1800000)/60000);
      const slots=[m.requesterId,m.targetId].flatMap(id=>Array.from({length:end-start},(_,i)=>JSON.stringify([id,start+i])));
      try{await col('meetingBookings').insertOne({_id:m.meetupId,participants:[m.requesterId,m.targetId],slots,expiresAt:new Date(+new Date(m.startsAt)+1800000)})}catch(error){if(error.code===11000){if(!await col('meetingBookings').findOne({_id:m.meetupId}))throw fail(409,'One attendee already has a confirmed meeting during this 30-minute window. Cancel or choose another time.')}else throw error}
    }
    const result=await col('meetups').updateOne({meetupId:m.meetupId,status:m.status},{$set:{status:decision,notificationPending:true,decidedAt:new Date()}});
    if(result.modifiedCount!==1){const current=await col('meetups').findOne({meetupId:m.meetupId});if(current?.status===decision)return {status:decision};if(decision==='accepted'&&current?.status!=='accepted')await col('meetingBookings').deleteOne({_id:m.meetupId});throw fail(409,'Meeting already handled');}
    if(decision==='cancelled')await col('meetingBookings').deleteOne({_id:m.meetupId});
    await meetingNotifications.sync({...m,status:decision});
    notify(other,'meetup:decision',{meetupId:m.meetupId,status:decision});
    return {status:decision};
  });
}
