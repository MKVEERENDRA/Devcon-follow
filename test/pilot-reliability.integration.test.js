import test from 'node:test';
import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
import {startTestRuntime} from './support/runtime.js';
const point={lat:19.01,lon:72.85,accuracyMeters:10};
async function fixture(t){
 const app=await startTestRuntime();t.after(()=>app.close());
 const call=async(who,path,method='GET',body,status=200)=>{const r=await app.request(who,path,method,body);assert.equal(r.status,status,JSON.stringify(r.body));return r.body};
 const grants={};
 for(const id of ['alice','bob','eve']){const invite=await call('admin','/v1/admin/invitations','POST',{email:id+'@example.test'},201);grants[id]=invite.invitationId;await call(id,'/v1/access/redeem','POST',{code:invite.code});await call(id,'/v1/profile','PUT',{handle:id,displayName:id,roles:['Builder'],discoverable:true});}
 const {venueId}=await call('admin','/v1/admin/venues','POST',{name:'SANDBOX',...point,radiusMeters:300,startAt:new Date(Date.now()-60000).toISOString(),endAt:new Date(Date.now()+3600000).toISOString(),enabled:true},201);
 const {landmark}=await call('admin','/v1/admin/landmarks','POST',{venueId,name:'SANDBOX entrance',lat:point.lat,lon:point.lon},201);
 for(const id of ['alice','bob'])await call(id,'/v1/presence/check-in','POST',point);
 return {app,call,grants,landmark};
}
test('30-minute expiry and Stop reject stale GPS/BLE without waiting for Mongo TTL cleanup',async t=>{
 const {app,call}=await fixture(t);
 const race=await Promise.all([app.request('alice','/v1/location/share','POST',{durationMinutes:30,audience:'verified'}),app.request('alice','/v1/location/share','POST',{durationMinutes:30,audience:'verified'})]);
 assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
 const expires=Date.parse(race.find(r=>r.status===200).body.expiresAt);assert(Math.abs(expires-Date.now()-1800000)<5000);
 await call('bob','/v1/location/share','POST',{durationMinutes:30,audience:'verified'});
 for(const id of ['alice','bob'])await call(id,'/v1/location/sample','POST',point);
 const radio=await call('bob','/v1/proximity/token','POST',{});
 assert.equal((await call('alice','/v1/nearby')).attendees.length,1);
 // Advance persisted consent to the expiry boundary; keep records physically present.
 await app.db.collection('shares').updateOne({userId:'bob'},{$set:{expiresAt:new Date(Date.now()-1)}});
 assert.equal((await call('alice','/v1/nearby')).attendees.length,0);
 assert.equal((await call('alice','/v1/proximity/resolve','POST',{tokens:[radio.token]})).attendees.length,0);
 await call('bob','/v1/location/sample','POST',point,403);
 await call('bob','/v1/proximity/token','POST',{},403);
 await call('bob','/v1/location/share','POST',{durationMinutes:30,audience:'verified'});
 const req=await call('alice','/v1/location/requests','POST',{targetId:'bob'},201);
 await call('bob','/v1/location/requests/'+req.requestId+'/decision','POST',{decision:'approved',durationMinutes:15});
 await call('bob','/v1/location/sample','POST',point);
 assert.equal((await call('alice','/v1/location/bob')).kind,'consented_navigation');
 await call('bob','/v1/location/share','DELETE');
 assert.equal(await app.db.collection('locations').countDocuments({userId:'bob'}),0);
 assert.equal(await app.db.collection('peerTokens').countDocuments({userId:'bob'}),0);
 await call('alice','/v1/location/bob','GET',undefined,404);
 await call('bob','/v1/location/sample','POST',point,403);
});
test('cancel, block, invitation revocation and account deletion preserve connection privacy',async t=>{
 const {app,call,grants,landmark}=await fixture(t);
 const meeting=await call('alice','/v1/meetups','POST',{targetId:'bob',landmarkId:landmark.landmarkId,startsAt:new Date(Date.now()+600000).toISOString(),reason:'Sandbox meeting'},201);
 await call('eve','/v1/meetups/'+meeting.meetupId+'/decision','POST',{decision:'cancelled'},404);
 await call('alice','/v1/meetups/'+meeting.meetupId+'/decision','POST',{decision:'cancelled'});
 await call('bob','/v1/meetups/'+meeting.meetupId+'/decision','POST',{decision:'accepted'},409);
 assert.equal((await call('bob','/v1/meetups')).meetups[0].status,'cancelled');
 // A profile/QR lookup must not implicitly create a follow.
 await call('alice','/v1/profiles/bob');assert.equal(await app.db.collection('follows').countDocuments(),0);
 for(const [a,b] of [['alice','bob'],['bob','alice']])await call(a,'/v1/follows/'+b,'POST',undefined,201);
 await call('alice','/v1/connections/bob/note','PUT',{note:'Private audit note'});
 assert.equal((await call('bob','/v1/connections/alice/note')).note,'');
 await call('eve','/v1/connections/bob/note','GET',undefined,404);
 await call('alice','/v1/follows/bob','DELETE');assert.equal(await app.db.collection('notes').countDocuments({ownerId:'alice'}),0);
 await call('alice','/v1/follows/bob','POST',undefined,201);
 await call('bob','/v1/blocks/alice','POST');
 await call('alice','/v1/profiles/bob','GET',undefined,403);
 await call('alice','/v1/messages/bob','POST',{body:'Must not arrive'},403);
 assert.equal((await call('alice','/v1/meetups')).meetups.length,0);
 await call('admin','/v1/admin/invitations/'+grants.alice,'DELETE');
 await call('alice','/v1/following','GET',undefined,403);
 // Cleanup remains available after access revocation.
 await call('alice','/v1/location/share','DELETE');await call('alice','/v1/account','DELETE');
 for(const [collection,query] of [['profiles',{userId:'alice'}],['follows',{$or:[{followerId:'alice'},{followedId:'alice'}]}],['notes',{$or:[{ownerId:'alice'},{targetId:'alice'}]}],['meetups',{$or:[{requesterId:'alice'},{targetId:'alice'}]}]])assert.equal(await app.db.collection(collection).countDocuments(query),0,collection);
});
test('socket reconnect authenticates again and rejected identities receive no connection',async t=>{
 const {app}=await fixture(t);
 const socket=io(app.origin,{auth:{token:await app.sign('alice')},transports:['websocket'],autoConnect:false,reconnection:false});t.after(()=>socket.disconnect());
 const connected=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Local socket timeout')),5000);socket.once('connected',value=>{clearTimeout(timer);resolve(value)});socket.once('connect_error',e=>{clearTimeout(timer);reject(e)});socket.connect()});
 assert.deepEqual(await connected(),{authenticated:true});socket.disconnect();assert.deepEqual(await connected(),{authenticated:true});socket.disconnect();
 socket.auth={token:'not-a-token'};
 const failure=new Promise(resolve=>socket.once('connect_error',e=>resolve(e.message)));socket.connect();assert.equal(await failure,'Authentication required');
});
