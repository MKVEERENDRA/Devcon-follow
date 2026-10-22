import test from 'node:test';
import assert from 'node:assert/strict';
import {startTestRuntime} from './support/runtime.js';

test('public signup and pre-arrival directory require explicit profile consent, not GPS or tickets',async t=>{
 const app=await startTestRuntime({config:{COMMUNITY_SELF_SERVICE_ENABLED:'true',COMMUNITY_REGISTRATION_MODE:'public',COMMUNITY_ACCESS_ENABLED:'false'}});t.after(()=>app.close());
 const call=async(id,path,method='GET',body,status=200)=>{const r=await app.request(id,path,method,body);assert.equal(r.status,status,JSON.stringify(r.body));return r.body};
 assert.equal((await fetch(app.origin+'/v1/directory?scope=event')).status,401);
 assert.equal((await fetch(app.origin+'/v1/event')).status,401);
 for(const id of ['alice','bob','eve']){
  assert.equal((await call(id,'/v1/me')).accessEligible,true);
  await call(id,'/v1/profile','PUT',{handle:id,displayName:id,roles:['Founder'],interests:['Ethereum'],discoverable:true,...(id==='bob'?{eventDirectory:true}:{})});
 }
 const page=await call('alice','/v1/directory?scope=event&sort=recommended');
 const event=await call('alice','/v1/event');assert.equal(event.grantsPresence,false);assert.equal(event.sourceUrl,'https://devcon.org/en/travel-guide/');assert.equal(event.displayDates,'3–6 November 2026');assert(!('lat' in event));
 assert.equal(page.kind,'event_directory');assert.deepEqual(page.attendees.map(p=>p.userId),['bob']);
 assert(!/coordinates|"lat"|"lon"|example.test|expiresAt/.test(JSON.stringify(page)));
 assert.equal((await call('alice','/v1/profiles/bob')).profile.eventDirectory,true);
 await call('alice','/v1/profiles/eve',undefined,undefined,404);
 await call('alice','/v1/follows/bob','POST',undefined,201);
 await call('alice','/v1/directory',undefined,undefined,403);
 await call('alice','/v1/nearby',undefined,undefined,403);
 for(const name of ['presence','locations','shares','peerTokens','tickets','invitations'])assert.equal(await app.db.collection(name).countDocuments(),0,name+' must stay empty');
 // Hiding the directory revokes new viewers without deleting saved connections.
 await call('bob','/v1/profile','PUT',{handle:'bob',displayName:'bob',roles:['Founder'],discoverable:true,eventDirectory:false});
 assert.equal((await call('alice','/v1/directory?scope=event')).attendees.length,0);
 await call('eve','/v1/profiles/bob',undefined,undefined,404);
 assert.equal((await call('alice','/v1/following')).attendees.length,1);
 await call('bob','/v1/profile','PUT',{handle:'bob',displayName:'bob',roles:['Founder'],discoverable:true,eventDirectory:true});
 await call('bob','/v1/blocks/alice','POST');
 assert.equal((await call('alice','/v1/directory?scope=event')).attendees.length,0);
 await call('alice','/v1/profiles/bob',undefined,undefined,403);
 await call('admin','/v1/admin/community/bob','DELETE');
 assert.equal((await call('eve','/v1/directory?scope=event')).attendees.length,0);
 await call('eve','/v1/directory?scope=all',undefined,undefined,400);
});

test('event-directory cursors are viewer/filter/scope-bound and legacy discoverable profiles stay private off-site',async t=>{
 const app=await startTestRuntime({config:{COMMUNITY_SELF_SERVICE_ENABLED:'true',COMMUNITY_REGISTRATION_MODE:'public',COMMUNITY_ACCESS_ENABLED:'false'}});t.after(()=>app.close());
 for(const id of ['alice','bob','eve']){
  await app.request(id,'/v1/me');
  await app.request(id,'/v1/profile','PUT',{handle:id,displayName:id,roles:['Builder'],discoverable:true,eventDirectory:true});
 }
 const first=await app.request('alice','/v1/directory?scope=event&limit=1');assert.equal(first.status,200);assert(first.body.nextCursor);
 const cursor=encodeURIComponent(first.body.nextCursor);
 const second=await app.request('alice','/v1/directory?scope=event&limit=1&cursor='+cursor);assert.equal(second.status,200);
 assert.notEqual(first.body.attendees[0].userId,second.body.attendees[0].userId);
 assert.equal((await app.request('bob','/v1/directory?scope=event&limit=1&cursor='+cursor)).status,400);
 assert.equal((await app.request('alice','/v1/directory?scope=event&limit=1&role=Founder&cursor='+cursor)).status,400);
 await app.request('bob','/v1/profile','PUT',{handle:'bob',displayName:'bob',roles:['Builder'],discoverable:false,eventDirectory:true});
 assert.equal((await app.db.collection('profiles').findOne({userId:'bob'})).eventDirectory,false);
});
