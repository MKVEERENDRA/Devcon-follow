import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {startTestRuntime} from './support/runtime.js';
import {directoryParams,directoryPipeline} from '../src/directory.js';
const digest=s=>createHash('sha256').update(s).digest('hex');
test('directory validates bounded literal filters, never accepts query operators',()=>{
 for(const q of [{q:'x'.repeat(81)},{role:'admin'},{interest:'x'.repeat(33)},{limit:'51'},{limit:'0'},{limit:'NaN'},{openToMeet:'yes'},{q:{$ne:''}},{offset:'1000'},{sort:'paid'}])assert.throws(()=>directoryParams(q),{statusCode:400});
 assert.equal(directoryParams({q:'  protocol  security '}).q,'protocol security');
});
test('secure paginated directory: 5,000 synthetic profiles, complete traversal, filters and audience isolation',async t=>{
 const app=await startTestRuntime();t.after(()=>app.close());const now=Date.now();
 await app.db.collection('venues').insertMany(['venue-a','venue-b'].map(venueId=>({venueId,name:venueId,enabled:true,center:{lat:19.01,lon:72.85},radiusMeters:300,startAt:new Date(now-1000).toISOString(),endAt:new Date(now+3600000).toISOString()})));
 await app.db.collection('tickets').insertMany(['alice','bob'].map(userId=>({userId,status:'verified',ticketDigest:digest(userId)})));
 await app.db.collection('presence').insertMany(['alice','bob'].map(userId=>({userId,venueId:'venue-a',expiresAt:new Date(now+3600000)})));
 const profiles=[],presence=[],tickets=[],invitations=[],blocks=[];const expected=[];
 for(let i=0;i<5000;i++){
  const userId='attendee'+String(i).padStart(5,'0'),kind=i%10;
  profiles.push({userId,handle:userId,displayName:i===4990?'Unique needle beyond the old cap':userId,roles:[i%20===0?'Founder':'Builder'],interests:['Ethereum'],bio:'Sandbox only',lookingFor:'Protocol security',openToMeet:i%2===0,discoverable:kind!==7});
  presence.push({userId,venueId:kind===5?'venue-b':'venue-a',expiresAt:new Date(now+(kind===6?-1000:3600000))});
  if([0,5,6,7,8,9].includes(kind))tickets.push({userId,status:'verified',ticketDigest:digest(userId)});
  if([1,3,4].includes(kind))invitations.push({digest:digest('invite:'+userId),usedBy:userId,status:kind===4?'revoked':'redeemed',accessExpiresAt:new Date(now+(kind===3?-1000:3600000))});
  if(kind===8)blocks.push({blockerId:'alice',blockedId:userId});if(kind===9)blocks.push({blockerId:userId,blockedId:'alice'});
  if(kind===0||kind===1)expected.push(userId);
 }
 for(const [name,docs]of Object.entries({profiles,presence,tickets,invitations,blocks}))if(docs.length)await app.db.collection(name).insertMany(docs);
 const request=async(path,who='alice',status=200)=>{const r=await app.request(who,path);assert.equal(r.status,status,JSON.stringify(r.body));return r.body};
 const seen=[],durations=[];let cursor,first;
 do{const start=performance.now();const page=await request('/v1/directory?limit=50'+(cursor?'&cursor='+encodeURIComponent(cursor):''));durations.push(performance.now()-start);assert(page.attendees.length<=50);assert(!/coordinates|"lat"|"lon"|totalCount/.test(JSON.stringify(page)));seen.push(...page.attendees.map(p=>p.userId));cursor=page.nextCursor;if(!first)first=page;}while(cursor);
 assert.deepEqual(seen,expected);assert.equal(new Set(seen).size,1000);
 assert.equal((await request('/v1/directory?q=Unique%20needle')).attendees[0].userId,'attendee04990');
 // Give unauthorized/off-venue/blocked candidates equally strong matches.
 await app.db.collection('profiles').updateMany({userId:{$in:['attendee00004','attendee00005','attendee00006','attendee00007','attendee00008','attendee00009']}},{$set:{interests:['Ethereum','Zero knowledge'],roles:['Founder'],openToMeet:true}});
 // Ranking considers the whole authorized venue, not just the first loaded page.
 await app.db.collection('profiles').insertOne({userId:'alice',handle:'alice',displayName:'Sandbox alice',roles:['Builder'],interests:['Zero knowledge'],lookingFor:'Founders',discoverable:true});
 await app.db.collection('profiles').updateOne({userId:'attendee04990'},{$set:{interests:['Ethereum','Zero knowledge'],roles:['Founder']}});
 const rankedStart=performance.now(),ranked=await request('/v1/directory?sort=recommended&limit=2');
 t.diagnostic(JSON.stringify({rankedSyntheticProfiles:5000,rankedFirstPageMs:Math.round(performance.now()-rankedStart)}));assert.equal(ranked.attendees[0].userId,'attendee04990');assert.deepEqual(ranked.attendees[0].match,{sharedInterests:['Zero knowledge'],matchingRoles:['Founder'],openToMeet:true});
 assert(!/matchScore|coordinates|"lat"|"lon"/.test(JSON.stringify(ranked)));
 const rankedNext=await request('/v1/directory?sort=recommended&limit=2&cursor='+encodeURIComponent(ranked.nextCursor));assert(!rankedNext.attendees.some(p=>ranked.attendees.some(first=>first.userId===p.userId)));
 await request('/v1/directory?sort=recommended&limit=2&cursor='+encodeURIComponent(ranked.nextCursor),'bob',400);
 await request('/v1/directory?sort=directory&limit=2&cursor='+encodeURIComponent(ranked.nextCursor),'alice',400);
 await app.db.collection('profiles').updateOne({userId:'alice'},{$set:{lookingFor:'Investors'}});await request('/v1/directory?sort=recommended&limit=2&cursor='+encodeURIComponent(ranked.nextCursor),'alice',400);
 assert(performance.now()-rankedStart<10000,'bounded ranked queries and cursor checks stay within ten seconds');
 await app.db.collection('profiles').updateOne({userId:'alice'},{$set:{lookingFor:'Founders'}});
 const rankedFilter=await request('/v1/directory?sort=recommended&role=Founder&openToMeet=true');assert(rankedFilter.attendees.every(p=>p.roles.includes('Founder')&&p.openToMeet));
 const crossFields=await request('/v1/directory?q=Ethereum%20protocol');assert(crossFields.attendees.length>0,'words may match interests and meeting goals across separate fields');assert(crossFields.attendees.every(p=>p.interests.includes('Ethereum')&&p.lookingFor.includes('Protocol')));
 const closed=await request('/v1/directory?openToMeet=false');assert(closed.attendees.every(p=>p.openToMeet===false));
 const filters=await request('/v1/directory?role=Founder&interest=ethereum&openToMeet=true');assert(filters.attendees.length>0);assert(filters.attendees.every(p=>p.roles.includes('Founder')&&p.openToMeet));
 assert.equal((await request('/v1/directory?q='+encodeURIComponent('.*[$ne]'))).attendees.length,0,'regex syntax must be literal');
 await request('/v1/directory?limit=50&cursor='+encodeURIComponent(first.nextCursor),'bob',400);
 await request('/v1/directory?limit=50&q=changed&cursor='+encodeURIComponent(first.nextCursor),'alice',400);
 await request('/v1/directory?limit=50&cursor='+encodeURIComponent(first.nextCursor.slice(0,-5)+'aaaaa'),'alice',400);
 const absent=await request('/v1/profiles/does-not-exist','alice',404),offVenue=await request('/v1/profiles/attendee00005','alice',404),hidden=await request('/v1/profiles/attendee00007','alice',404);assert.deepEqual(absent,offVenue,'unknown and off-venue IDs must not disclose eligibility through errors');assert.deepEqual(absent,hidden,'hidden profile errors must not disclose existence');await app.request('alice','/v1/follows/attendee00005','POST').then(r=>assert.equal(r.status,404));
 await app.db.collection('presence').updateOne({userId:'alice'},{$set:{venueId:'venue-b'}});
 await request('/v1/directory?limit=50&cursor='+encodeURIComponent(first.nextCursor),'alice',400);
 await app.db.collection('presence').updateOne({userId:'alice'},{$set:{venueId:'venue-a'}});
 // Revalidate every page; a previously visible profile loses access before its next response.
 await app.db.collection('tickets').updateOne({userId:'attendee00100'},{$set:{status:'revoked'}});
 const after=await request('/v1/directory?q=attendee00100');assert.equal(after.attendees.length,0);
 const loadStart=performance.now();const responses=await Promise.all(Array.from({length:8},()=>request('/v1/directory?limit=24&role=Founder')));const parallelWallMs=performance.now()-loadStart;assert(responses.every(r=>r.attendees.length===24));
 const explained=await app.db.collection('presence').aggregate(directoryPipeline({actorId:'alice',venueId:'venue-a',params:directoryParams({limit:'24'}),communityEnabled:true}),{hint:{venueId:1,userId:1,expiresAt:1},maxTimeMS:2000}).explain('executionStats');
 const filteredExplain=await app.db.collection('profiles').aggregate(directoryPipeline({actorId:'alice',venueId:'venue-a',params:directoryParams({limit:'24',role:'Founder'}),communityEnabled:true}),{hint:{discoverable:1,userId:1},maxTimeMS:2000}).explain('executionStats');
 const profilePlan=JSON.stringify(filteredExplain);assert(profilePlan.includes('discoverable_1_userId_1'),'filtered traversal must use the profile compound index');assert(!profilePlan.includes('\"stage\":\"COLLSCAN\"'),'filtered path must not use a collection scan');
 const serialized=JSON.stringify(explained);assert(serialized.includes('venueId_1_userId_1_expiresAt_1'),'venue traversal must use the compound index');assert(!serialized.includes('"stage":"COLLSCAN"'),'no unbounded collection scan');
 assert(parallelWallMs<10000,'eight bounded sandbox queries must finish within ten seconds');durations.sort((a,b)=>a-b);assert(durations[Math.ceil(durations.length*.95)-1]<5000,'sandbox page P95 must stay below five seconds including JWT and loopback overhead');t.diagnostic(JSON.stringify({syntheticProfiles:5000,authorizedProfiles:seen.length,pages:durations.length,pageP95Ms:Math.round(durations[Math.ceil(durations.length*.95)-1]),parallelQueries:8,parallelWallMs:Math.round(parallelWallMs)}));
 // A saved connection remains available after the event; arbitrary IDs do not.
 await app.request('alice','/v1/follows/attendee00000','POST').then(r=>assert.equal(r.status,201));
 await app.db.collection('presence').deleteOne({userId:'alice'});
 await request('/v1/directory','alice',403);await request('/v1/profiles/attendee00000');await request('/v1/profiles/attendee00010','alice',404);
 await app.db.collection('tickets').updateOne({userId:'bob'},{$set:{status:'revoked'}});await request('/v1/directory','bob',403);
});
test('ranked pagination traverses every score/tie once and rechecks blocks between pages',async t=>{
 const app=await startTestRuntime();t.after(()=>app.close());const expiresAt=new Date(Date.now()+3600000);
 await app.db.collection('venues').insertOne({venueId:'ranked',name:'Sandbox only',center:{lat:19,lon:72},radiusMeters:100,startAt:new Date(Date.now()-1000),endAt:expiresAt,enabled:true});
 const ids=['alice',...Array.from({length:150},(_,i)=>'rank'+String(i).padStart(3,'0'))];
 await app.db.collection('profiles').insertMany(ids.map((userId,i)=>({userId,handle:userId,displayName:userId,discoverable:true,roles:[i%2?'Founder':'Builder'],interests:i%3?['Ethereum']:['Privacy'],lookingFor:userId==='alice'?'Founders':'',openToMeet:i%2===1})));
 await app.db.collection('presence').insertMany(ids.map(userId=>({userId,venueId:'ranked',expiresAt})));
 await app.db.collection('tickets').insertMany(ids.map(userId=>({userId,status:'verified',ticketDigest:digest(userId)})));
 const all=[];let cursor;
 do{const page=await app.request('alice','/v1/directory?sort=recommended&limit=17'+(cursor?'&cursor='+encodeURIComponent(cursor):''));assert.equal(page.status,200,JSON.stringify(page.body));all.push(...page.body.attendees);cursor=page.body.nextCursor;}while(cursor);
 assert.equal(all.length,150);assert.equal(new Set(all.map(p=>p.userId)).size,150);
 const score=p=>p.match.sharedInterests.length*3+(p.match.matchingRoles.length?4:0)+(p.match.openToMeet?1:0);
 for(let i=1;i<all.length;i++)assert(score(all[i-1])>score(all[i])||score(all[i-1])===score(all[i])&&all[i-1].userId<all[i].userId);
 const page=await app.request('alice','/v1/directory?sort=recommended&limit=1');
 await app.db.collection('blocks').insertOne({blockerId:all[1].userId,blockedId:'alice'});
 const next=await app.request('alice','/v1/directory?sort=recommended&limit=1&cursor='+encodeURIComponent(page.body.nextCursor));assert.equal(next.status,200);assert.notEqual(next.body.attendees[0].userId,all[1].userId);
});
