import {createHash,randomUUID} from 'node:crypto';
const idFor=(...parts)=>createHash('sha256').update(JSON.stringify(parts)).digest('hex');
const fail=(statusCode,message)=>Object.assign(new Error(message),{statusCode});
const DAY=86400000;
export function createMeetingNotifications({col,eligibleIds,isBlocked,notify,pushEnabled=false,pushAccessToken='',fetchImpl=fetch,now=()=>new Date()}){
  const valid=async n=>{
    const m=await col('meetups').findOne({meetupId:n.meetupId});
    if(!m||![m.requesterId,m.targetId].includes(n.userId)||await isBlocked(n.userId,n.otherId))return false;
    if((await eligibleIds([n.userId,n.otherId])).size!==2)return false;
    return n.type==='reminder'?m.status==='accepted'&&+m.startsAt>+now():n.type===m.status;
  };
  const sync=async m=>{
    const at=now(),recipients=m.status==='pending'?[m.targetId]:[m.requesterId,m.targetId];
    for(const userId of recipients){
      const otherId=userId===m.requesterId?m.targetId:m.requesterId;
      const add=async(type,deliverAt,until)=>{
        const _id=idFor(m.meetupId,userId,type);
        const inserted=await col('meetingNotifications').updateOne({_id},{$setOnInsert:{userId,otherId,meetupId:m.meetupId,type,deliverAt,expiresAt:until,createdAt:at,readAt:null,pushQueued:false}},{upsert:true});
        if(inserted.upsertedCount&&+deliverAt<=+at)notify(userId,'meetup:update',{});
      };
      await add(m.status,at,new Date(+at+7*DAY));
      if(m.status==='accepted')await add('reminder',new Date(Math.max(+at,+m.startsAt-300000)),new Date(+m.startsAt));
    }
    await col('meetups').updateOne({meetupId:m.meetupId,status:m.status},{$set:{notificationSyncedStatus:m.status,notificationPending:false}});
  };
  const reconcile=async(userId)=>{
    const participant=userId?{$or:[{requesterId:userId},{targetId:userId}]}:{};
    await col('meetups').updateMany({...participant,status:'pending',startsAt:{$lte:now()}},{$set:{status:'expired',notificationPending:true}});
    await col('meetups').updateMany({...participant,status:'accepted',startsAt:{$lte:new Date(+now()-1800000)}},{$set:{status:'elapsed',notificationPending:true}});
    // Recover a crash after cancellation/account erasure but before booking cleanup.
    for(const booking of await col('meetingBookings').find(userId?{participants:userId}:{},{limit:100}).toArray()){const m=await col('meetups').findOne({meetupId:booking._id});if(!m||!['pending','accepted'].includes(m.status))await col('meetingBookings').deleteOne({_id:booking._id});}
    const unsynced=await col('meetups').find(userId?{$and:[participant,{$or:[{notificationPending:true},{notificationSyncedStatus:{$exists:false}}]}]}:{notificationPending:true},{limit:100}).toArray();
    for(const m of unsynced)await sync(m);
  };
  const request=async(path,body)=>{
    const response=await fetchImpl('https://exp.host/--/api/v2/push/'+path,{method:'POST',headers:{'content-type':'application/json',...(pushAccessToken?{Authorization:'Bearer '+pushAccessToken}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
    if(!response.ok){const error=Error('Push service unavailable');error.retryable=response.status===429||response.status>=500;throw error}
    return (await response.json()).data;
  };
  const invalidate=async job=>col('pushDevices').deleteOne({_id:job.deviceId,userId:job.userId});
  const tick=async()=>{
    await reconcile();
    if(!pushEnabled)return; // No external traffic until separately configured and authorized.
    const at=now();
    const due=await col('meetingNotifications').find({deliverAt:{$lte:at,$gte:new Date(+at-3600000)},expiresAt:{$gt:at},readAt:null,pushQueued:false},{limit:100}).toArray();
    for(const n of due){
      if(await valid(n))for(const device of await col('pushDevices').find({userId:n.userId,expiresAt:{$gt:at}},{limit:5}).toArray()){
        const _id=idFor(n._id,device._id);
        await col('pushDeliveries').updateOne({_id},{$setOnInsert:{notificationId:n._id,deviceId:device._id,userId:n.userId,state:'pending',attempts:0,nextAt:at,expiresAt:new Date(Math.max(+n.expiresAt,+at+DAY))}},{upsert:true});
      }
      await col('meetingNotifications').updateOne({_id:n._id},{$set:{pushQueued:true}});
    }
    // A lease permits multiple workers; a crash retries after expiry. Delivery is at-least-once.
    for(let i=0;i<20;i++){
      const lease=randomUUID();
      const job=await col('pushDeliveries').findOneAndUpdate({state:{$in:['pending','receipt']},nextAt:{$lte:at},expiresAt:{$gt:at},$or:[{leaseUntil:{$exists:false}},{leaseUntil:{$lte:at}}]},{$set:{lease,leaseUntil:new Date(+at+60000)}},{returnDocument:'after'});
      if(!job)break;
      const update=fields=>col('pushDeliveries').updateOne({_id:job._id,lease},{$set:fields,$unset:{lease:'',leaseUntil:''}});
      try{
        const [n,device]=await Promise.all([col('meetingNotifications').findOne({_id:job.notificationId}),col('pushDevices').findOne({_id:job.deviceId,userId:job.userId,expiresAt:{$gt:at}})]);
        if(!device||(job.state==='pending'&&(!n||+n.expiresAt<=+at||!await valid(n)))){await update({state:'cancelled'});continue}
        const result=job.state==='receipt'?(await request('getReceipts',{ids:[job.ticketId]}))?.[job.ticketId]:await request('send',{to:device.token,title:'Devcon Follow',body:'You have a meeting update. Open Meetups for current details.',data:{screen:'meetups'},channelId:'meetups',ttl:Math.max(1,Math.min(3600,Math.floor((+n.expiresAt-+at)/1000)))});
        if(!result){if(job.state==='receipt'&&+at-+job.sentAt<DAY){await update({nextAt:new Date(+at+900000)});continue}throw Error('Push result unavailable')}
        if(result.status==='error'){
          const code=result.details?.error;
          if(code==='DeviceNotRegistered')await invalidate(job);
          if(code==='MessageRateExceeded')throw Error('Push rate limited');
          await update({state:'failed',errorCode:code||'ProviderError'});continue;
        }
        if(result.status!=='ok')throw Error('Invalid push result');
        await update(job.state==='receipt'?{state:'provider-accepted'}:{state:'receipt',ticketId:result.id,sentAt:at,nextAt:new Date(+at+900000)});
      }catch(error){
        const attempts=job.attempts+1;
        await update({attempts,state:error.retryable===false||attempts>=6?'failed':job.state,nextAt:new Date(+at+Math.min(900000,30000*2**attempts)),errorCode:'DeliveryUnavailable'});
      }
    }
  };
  function routes(app,{requireUser,authenticate}){
    app.get('/v1/meeting-notifications',async req=>{
      const actor=await requireUser(req);await reconcile(actor.userId);
      const rows=await col('meetingNotifications').find({userId:actor.userId,readAt:null,deliverAt:{$lte:now()},expiresAt:{$gt:now()}},{limit:100}).sort({createdAt:-1}).toArray();const notifications=[];
      for(const n of rows)if(await valid(n))notifications.push({notificationId:n._id,meetupId:n.meetupId,type:n.type,createdAt:n.createdAt,readAt:n.readAt});
      return {notifications};
    });
    app.post('/v1/meeting-notifications/:id/read',async req=>{const actor=await requireUser(req);await col('meetingNotifications').updateOne({_id:req.params.id,userId:actor.userId},{$set:{readAt:now()}});return {read:true}});
    app.post('/v1/push-devices',{config:{rateLimit:{max:10,timeWindow:'1 minute'}}},async req=>{
      const actor=await requireUser(req),token=req.body?.token;
      if(!pushEnabled)throw fail(409,'Device push is not configured; meeting updates remain in Meetups');
      if(typeof token!=='string'||! /^(Expo(nent)?PushToken)\[[A-Za-z0-9_-]{10,256}\]$/.test(token))throw fail(400,'Valid Expo device token required');
      const _id=idFor(token),old=await col('pushDevices').findOne({_id});
      if(old&&old.userId!==actor.userId)throw fail(409,'Disable notifications in the previous account before registering this device');
      if(!old&&await col('pushDevices').countDocuments({userId:actor.userId})>=5)throw fail(409,'Remove an old device before adding another');
      try{await col('pushDevices').updateOne({_id,userId:actor.userId},{$set:{token,expiresAt:new Date(+now()+30*DAY)}},{upsert:true})}catch(e){if(e.code===11000)throw fail(409,'Device is already registered');throw e}
      return {enabled:true};
    });
    app.delete('/v1/push-devices',async req=>{const actor=await authenticate(req);await col('pushDevices').deleteMany({userId:actor.userId});return {enabled:false}});
  }
  return {sync,reconcile,tick,routes};
}
