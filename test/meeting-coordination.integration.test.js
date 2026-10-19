import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {startTestRuntime} from './support/runtime.js';
import {createMeetingNotifications} from '../src/meeting-notifications.js';
async function fixture(t,options){
 const app=await startTestRuntime(options);t.after(()=>app.close());const now=Date.now(),users=['alice','bob','charlie','dan'];
 await app.db.collection('venues').insertOne({venueId:'sandbox',name:'Sandbox only',enabled:true,center:{lat:19.01,lon:72.85},radiusMeters:300,startAt:new Date(now-1000),endAt:new Date(now+86400000)});
 for(const userId of users){await app.db.collection('tickets').insertOne({userId,status:'verified',ticketDigest:userId});await app.db.collection('profiles').insertOne({userId,handle:userId,displayName:userId,roles:['Builder'],discoverable:true});await app.db.collection('presence').insertOne({userId,venueId:'sandbox',expiresAt:new Date(now+86400000)})}
 await app.db.collection('landmarks').insertOne({landmarkId:'coffee',venueId:'sandbox',name:'Sandbox coffee',lat:19.01,lon:72.85,enabled:true});
 const call=async(who,path,method='GET',body,status=200)=>{const r=await app.request(who,'/v1'+path,method,body);assert.equal(r.status,status,JSON.stringify(r.body));return r.body};
 const invite=(targetId='bob')=>({targetId,landmarkId:'coffee',startsAt:new Date(now+3600000).toISOString(),reason:'Sandbox conversation',requestId:randomUUID()});
 return {...app,call,invite,now};
}
test('meeting retries, duplicate prevention, concurrent conflicts, cancellation and durable private updates',async t=>{
 const app=await fixture(t),{call,invite,db}=app;const body=invite();const first=await call('alice','/meetups','POST',body,201);
 const retries=await Promise.all([call('alice','/meetups','POST',body,201),call('alice','/meetups','POST',body,201)]);assert(retries.every(r=>r.meetupId===first.meetupId));assert.equal(await db.collection('meetups').countDocuments(),1);
 await call('alice','/meetups','POST',{...body,reason:'Changed payload'},409);
 await call('alice','/meetups','POST',invite(),409);
 const second=await call('charlie','/meetups','POST',invite(),201);
 const decisions=await Promise.all([app.request('bob','/v1/meetups/'+first.meetupId+'/decision','POST',{decision:'accepted'}),app.request('bob','/v1/meetups/'+second.meetupId+'/decision','POST',{decision:'accepted'})]);assert.deepEqual(decisions.map(r=>r.status).sort(),[200,409]);assert.equal(await db.collection('meetingBookings').countDocuments(),1);
 const accepted=await db.collection('meetups').findOne({status:'accepted'});await call('bob','/meetups/'+accepted.meetupId+'/decision','POST',{decision:'accepted'});assert.equal(await db.collection('meetingBookings').countDocuments(),1,'lost-response retry must retain the booking');
 const notices=await call('bob','/meeting-notifications');assert(notices.notifications.some(n=>n.meetupId===accepted.meetupId&&n.type==='accepted'));assert(!/Sandbox conversation|coffee|lat|token/.test(JSON.stringify(notices)),'alerts contain no reason, landmark, coordinates or push token');
 const notice=notices.notifications[0];await call('dan','/meeting-notifications/'+notice.notificationId+'/read','POST');assert.equal((await db.collection('meetingNotifications').findOne({_id:notice.notificationId})).readAt,null);await call('bob','/meeting-notifications/'+notice.notificationId+'/read','POST');assert((await db.collection('meetingNotifications').findOne({_id:notice.notificationId})).readAt);
 await call('bob','/meetups/'+accepted.meetupId+'/decision','POST',{decision:'cancelled'});assert.equal(await db.collection('meetingBookings').countDocuments(),0);
 const pending=await db.collection('meetups').findOne({status:'pending'});await call('bob','/meetups/'+pending.meetupId+'/decision','POST',{decision:'accepted'});
 await db.collection('meetups').updateOne({meetupId:pending.meetupId},{$set:{startsAt:new Date(Date.now()-1900000)}});
 const history=await call('bob','/meetups');assert(history.meetups.some(m=>m.meetupId===pending.meetupId&&m.status==='elapsed'),'history persists beyond the old 30-minute deletion horizon');
 await db.collection('tickets').updateOne({userId:'charlie'},{$set:{status:'revoked'}});assert(!(await call('bob','/meetups')).meetups.some(m=>m.requesterId==='charlie'));
 const expired=await call('alice','/meetups','POST',invite('dan'),201);await db.collection('meetups').updateOne({meetupId:expired.meetupId},{$set:{startsAt:new Date(Date.now()-60000)}});assert((await call('dan','/meetups')).meetups.some(m=>m.meetupId===expired.meetupId&&m.status==='expired'));await call('dan','/meetups/'+expired.meetupId+'/decision','POST',{decision:'accepted'},409);
 await db.collection('meetingBookings').insertOne({_id:'orphaned-after-cancellation',participants:['alice','dan'],slots:['sandbox-only'],expiresAt:new Date(Date.now()+60000)});await call('dan','/meeting-notifications');assert.equal(await db.collection('meetingBookings').countDocuments({_id:'orphaned-after-cancellation'}),0);
 await call('bob','/push-devices','POST',{token:'ExpoPushToken[sandbox_token_123]'},409);
 await call('bob','/account','DELETE');for(const [collection,query] of [['meetingNotifications',{$or:[{userId:'bob'},{otherId:'bob'}]}],['meetingBookings',{participants:'bob'}],['pushDevices',{userId:'bob'}]])assert.equal(await db.collection(collection).countDocuments(query),0,collection);
});
test('durable push outbox retries, checks receipts, retires invalid devices and never sends while disabled',async t=>{
 const app=await fixture(t);let at=new Date(app.now),calls=[],failSend=true;const col=name=>app.db.collection(name);
 const service=(pushEnabled=true)=>createMeetingNotifications({col,eligibleIds:async ids=>new Set((await col('tickets').find({userId:{$in:ids},status:'verified'}).toArray()).map(x=>x.userId)),isBlocked:async()=>false,notify:()=>{},pushEnabled,now:()=>at,fetchImpl:async(url,options)=>{
  calls.push({url,body:JSON.parse(options.body)});if(url.endsWith('/send')&&failSend){failSend=false;return {ok:false,status:429}}
  return {ok:true,json:async()=>({data:url.endsWith('/send')?{status:'ok',id:'sandbox-ticket'}:{'sandbox-ticket':{status:'error',details:{error:'DeviceNotRegistered'}}}})};
 }});
 const m={meetupId:'sandbox-meeting',requesterId:'alice',targetId:'bob',status:'accepted',notificationPending:true,startsAt:new Date(+at+3600000),expiresAt:new Date(+at+86400000)};await col('meetups').insertOne(m);await col('pushDevices').insertOne({_id:'sandbox-device',userId:'bob',token:'ExpoPushToken[sandbox_device_123]',expiresAt:new Date(+at+86400000)});
 await service(false).tick();assert.equal(calls.length,0);
 await service().tick();assert.equal(calls.length,1);assert.equal(await col('pushDeliveries').countDocuments({state:'pending'}),1);
 at=new Date(+at+120000);await service().tick();assert.equal(calls.length,2);assert.equal(await col('pushDeliveries').countDocuments({state:'receipt'}),1);
 await service().tick();assert.equal(calls.length,2,'a restarted worker must not duplicate a ticketed send');
 at=new Date(+at+900000);await service().tick();assert.equal(calls.length,3);assert(calls[2].url.endsWith('/getReceipts'));assert.equal(await col('pushDevices').countDocuments(),0);assert.equal(await col('pushDeliveries').countDocuments({state:'failed'}),1);
 assert.deepEqual(calls[1].body.data,{screen:'meetups'});assert(!JSON.stringify(calls[1].body).includes('bob'));
 // A queued future reminder is invalidated by authoritative cancellation, even across service restart.
 await col('meetups').updateOne({meetupId:m.meetupId},{$set:{status:'cancelled'}});at=new Date(+m.startsAt-240000);await service().tick();assert.equal(calls.length,3);
});

test('real sandbox JWTs bind opt-in push tokens to their owner and allow revoked-user cleanup without external calls',async t=>{
 const calls=[];const app=await fixture(t,{config:{PUSH_ENABLED:'true',EXPO_PUSH_ACCESS_TOKEN:'sandbox-only-not-a-credential'},notificationFetch:async(...args)=>{calls.push(args);throw Error('No external provider is permitted in this sandbox test')}});
 const token='ExpoPushToken[synthetic_device_token_123]';
 await app.call('alice','/push-devices','POST',{token:'https://not-a-token.example.test'},400);
 await app.call('alice','/push-devices','POST',{token});
 await app.call('bob','/push-devices','POST',{token},409);
 assert.equal((await app.db.collection('pushDevices').findOne({token})).userId,'alice');assert(!JSON.stringify(await app.call('alice','/meeting-notifications')).includes(token));
 await app.db.collection('tickets').updateOne({userId:'alice'},{$set:{status:'revoked'}});
 await app.call('alice','/push-devices','POST',{token:'ExpoPushToken[another_synthetic_device]'},403);
 await app.call('alice','/push-devices','DELETE');assert.equal(await app.db.collection('pushDevices').countDocuments(),0);
 await app.call('bob','/push-devices','POST',{token});await app.call('bob','/account','DELETE');assert.equal(await app.db.collection('pushDevices').countDocuments(),0);assert.equal(calls.length,0);
});
