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

test('GPS fallback works without Bluetooth and rejects uncertain, stale and off-venue samples',async t=>{
 const {app,call}=await fixture(t);
 // Permission denied / no sample cannot establish presence for a third user.
 await call('eve','/v1/presence/check-in','POST',{},400);
 await call('eve','/v1/location/share','POST',{durationMinutes:30,audience:'verified'},403);
 for(const id of ['alice','bob'])await call(id,'/v1/location/share','POST',{durationMinutes:30,audience:'verified'});
 for(const accuracyMeters of [-1,101,null])await call('bob','/v1/location/sample','POST',{...point,accuracyMeters},400);
 await call('bob','/v1/location/sample','POST',{...point,lat:point.lat+0.01},403);
 // Uncertainty overlaps the 300m boundary even though the center reading is inside.
 await call('eve','/v1/presence/check-in','POST',{...point,lat:point.lat+0.002,accuracyMeters:100},403);
 for(const id of ['alice','bob'])await call(id,'/v1/location/sample','POST',{...point,accuracyMeters:90});
 assert.equal(await app.db.collection('peerTokens').countDocuments(),0);
 const nearby=await call('alice','/v1/nearby');
 assert.equal(nearby.attendees.length,1);
 assert.equal(nearby.attendees[0].distanceBand,'same venue · GPS distance uncertain');
 assert.equal(nearby.attendees[0].kind,'approximate_gps');
 assert(!/"(?:lat|lon|coordinates|geo)":/.test(JSON.stringify(nearby)));
 await app.db.collection('locations').updateOne({userId:'bob'},{$set:{observedAt:new Date(Date.now()-76000)}});
 assert.equal((await call('alice','/v1/nearby')).attendees.length,0);
 await call('bob','/v1/location/sample','POST',point);
 await app.db.collection('presence').updateOne({userId:'bob'},{$set:{expiresAt:new Date(Date.now()-1)}});
 assert.equal((await call('alice','/v1/nearby')).attendees.length,0);
 await call('bob','/v1/location/sample','POST',point,403);
 // Venue disable/closure is enforced on every operation, not just initial check-in.
 await app.db.collection('venues').updateMany({},{$set:{enabled:false}});
 await call('alice','/v1/proximity/token','POST',{},403);
 await call('alice','/v1/nearby','GET',undefined,403);
});

test('BLE token resolution enforces expiry, venue isolation, blocks and explicit departure',async t=>{
 const {app,call}=await fixture(t);
 for(const id of ['alice','bob'])await call(id,'/v1/location/share','POST',{durationMinutes:30,audience:'verified'});
 const first=await call('bob','/v1/proximity/token','POST',{});
 const next=await call('bob','/v1/proximity/token','POST',{});
 assert.notEqual(first.token,next.token);
 const resolved=await call('alice','/v1/proximity/resolve','POST',{tokens:[first.token,next.token,next.token]});
 assert.equal(resolved.attendees.length,1);assert.equal(resolved.attendees[0].distanceMeters,null);
 assert(!/"(?:lat|lon|coordinates|geo)":/.test(JSON.stringify(resolved)));
 await call('alice','/v1/proximity/resolve','POST',{tokens:['malformed']},400);
 await call('alice','/v1/proximity/resolve','POST',{tokens:Array(31).fill(first.token)},400);
 await app.db.collection('peerTokens').updateMany({userId:'bob'},{$set:{expiresAt:new Date(Date.now()-1)}});
 assert.equal((await call('alice','/v1/proximity/resolve','POST',{tokens:[first.token,next.token]})).attendees.length,0);
 const fresh=await call('bob','/v1/proximity/token','POST',{});
 await app.db.collection('presence').updateOne({userId:'bob'},{$set:{venueId:'different-sandbox-venue'}});
 assert.equal((await call('alice','/v1/proximity/resolve','POST',{tokens:[fresh.token]})).attendees.length,0);
 await call('bob','/v1/presence/check-in','POST',point);
 await call('bob','/v1/blocks/alice','POST');
 assert.equal((await call('alice','/v1/proximity/resolve','POST',{tokens:[fresh.token]})).attendees.length,0);
 await call('bob','/v1/presence','DELETE');
 assert.equal(await app.db.collection('peerTokens').countDocuments({userId:'bob'}),0);
 for(const collection of ['shares','locations','presence'])assert.equal(await app.db.collection(collection).countDocuments({userId:'bob'}),0);
 await call('bob','/v1/proximity/token','POST',{},403);
});
