import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineMeters,insideVenue,activePresence,activeShare,freshLocation,approvedGrant,
  approxDistance,conservativeDistanceBand,validLocation,validMinutes,safeHandle,publicProfile
} from '../src/domain.js';
const now=Date.parse('2026-11-03T10:30:00+05:30');
const active={name:'Conference',enabled:true,startAt:'2026-11-03T08:00:00+05:30',endAt:'2026-11-03T20:00:00+05:30',center:{lat:19.051,lon:72.865},radiusMeters:350};
test('distance between same point is zero',()=>assert.equal(haversineMeters({lat:0,lon:0},{lat:0,lon:0}),0));
test('GPS venue check accounts for inaccuracy, never just position center',()=>{
  assert.equal(insideVenue({lat:19.051,lon:72.865,accuracyMeters:50},active,now),true);
  assert.equal(insideVenue({lat:19.051,lon:72.865,accuracyMeters:500},active,now),false);
  assert.equal(insideVenue({lat:19.09,lon:72.865,accuracyMeters:20},active,now),false);
});
test('venue discovery unavailable before and after event',()=>{
  const pos={lat:19.051,lon:72.865,accuracyMeters:20};
  assert.equal(insideVenue(pos,active,Date.parse('2026-11-02T19:00:00+05:30')),false);
  assert.equal(insideVenue(pos,active,Date.parse('2026-11-04T12:00:00+05:30')),false);
});
test('venue cannot enable discovery without admin enable',()=>{
  assert.equal(insideVenue({lat:19.051,lon:72.865,accuracyMeters:10},{...active,enabled:false},now),false);
});
test('invalid GPS coordinates and accuracy are rejected',()=>{
  assert.equal(validLocation({lat:91,lon:22,accuracyMeters:1}),false);
  assert.equal(validLocation({lat:10,lon:22,accuracyMeters:101}),false);
  assert.equal(validLocation({lat:10,lon:22,accuracyMeters:10}),true);
});
test('presence expires even without cleanup',()=>{
  assert.equal(activePresence({venueId:'v1',expiresAt:new Date(now+1)},now),true);
  assert.equal(activePresence({venueId:'v1',expiresAt:new Date(now)},now),false);
  assert.equal(activePresence({venueId:'v1',expiresAt:new Date(now+3000),revoked:true},now),false);
});
test('location share revocation and server-side expiry',()=>{
  assert.equal(activeShare({enabled:true,expiresAt:new Date(now+1)},now),true);
  assert.equal(activeShare({enabled:true,expiresAt:new Date(now)},now),false);
  assert.equal(activeShare({enabled:false,expiresAt:new Date(now+100)},now),false);
  assert.equal(activeShare({enabled:true,expiresAt:new Date(now+100),revoked:true},now),false);
});
test('stale location is rejected even if TTL deletion has not run',()=>{
  const sample={observedAt:new Date(now-75001),expiresAt:new Date(now+30000)};
  assert.equal(freshLocation(sample,now),false);
  assert.equal(freshLocation({...sample,observedAt:new Date(now-10)},now),true);
});
test('navigation requires explicitly approved unexpired grant and correct identities',()=>{
  const g={status:'approved',requesterId:'alice',targetId:'bob',expiresAt:new Date(now+100)};
  assert.equal(approvedGrant(g,'alice','bob',now),true);
  assert.equal(approvedGrant(g,'carol','bob',now),false);
  assert.equal(approvedGrant(g,'alice','dave',now),false);
  assert.equal(approvedGrant(g,'alice','bob',now+101),false);
  assert.equal(approvedGrant({...g,status:'revoked'},'alice','bob',now),false);
});
test('privacy bands avoid misleading precise metre values',()=>{
  assert.equal(approxDistance(85),'within ~100 m');
  assert.equal(approxDistance(300),'within ~500 m');
});
test('location duration limit 24 hours',()=>{
  assert.equal(validMinutes(30),true);
  assert.equal(validMinutes(900),true);
  assert.equal(validMinutes(1440),true);
  assert.equal(validMinutes(1441),false);
  assert.equal(validMinutes(0),false);
});
test('handle validation prevents unsafe profiles',()=>{
  assert.equal(safeHandle('some_founder'),'some_founder');
  assert.equal(safeHandle('<script>'),null);
});
test('public profile cannot contain raw ticket/location/internal values',()=>{
  const p={userId:'1',handle:'alice_eth',displayName:'Alice',roles:['Founder'],bio:'Builder',interests:['ZK'],socials:{},discoverable:true,ticketSecret:'NO',lat:19.1,privateEmail:'a@b.c'};
  const out=publicProfile(p);
  assert.equal(out.ticketSecret,undefined);
  assert.equal(out.lat,undefined);
  assert.equal(out.privateEmail,undefined);
});

// Profile images are canvas-compressed locally; never accept embedded SVG/HTML.
test('avatar field only accepts small base64 raster images',async()=>{
 const {safeAvatar}=await import('../src/domain.js');
 assert.equal(safeAvatar('data:image/png;base64,iVBORw0KGgo='),'data:image/png;base64,iVBORw0KGgo=');
 assert.equal(safeAvatar('data:image/svg+xml;base64,PHN2Zz4='),null);
 assert.equal(safeAvatar('data:text/html;base64,PHNjcmlwdD4='),null);
 assert.equal(safeAvatar('data:image/jpeg;base64,'+'A'.repeat(46000)),null);
});

test('GPS accuracy avoids claiming a very close encounter from uncertain indoor readings',()=>{
  assert.equal(conservativeDistanceBand(10,75,65),'same venue · GPS distance uncertain');
  assert.equal(conservativeDistanceBand(120,15,15),'within ~250 m');
  assert.equal(conservativeDistanceBand(20,3,4),'very close (approximate)');
});
