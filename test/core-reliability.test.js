import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activePresence,activeShare,freshLocation,insideVenue,conservativeDistanceBand,DISCOVERY_MINUTES} from '../src/domain.js';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('discovery has an absolute 30-minute server expiry and does not accept a 24-hour share',()=>{
  assert.equal(DISCOVERY_MINUTES,30);
  const server=read('../src/app.js');
  assert.match(server,/if\(duration!==DISCOVERY_MINUTES\)/);
  assert.match(server,/if\(activeShare\(current\)\)/);
  const start=Date.now();
  assert.equal(activeShare({enabled:true,expiresAt:new Date(start+30*60_000)},start+30*60_000),false);
  assert.equal(activeShare({enabled:true,expiresAt:new Date(start+30*60_000)},start+1000),true);
  assert.equal(activeShare({enabled:true,revoked:true,expiresAt:new Date(start+30*60_000)},start),false);
});

test('stale presence or GPS must not be counted as nearby',()=>{
  const now=Date.now();
  assert.equal(activePresence({venueId:'v1',expiresAt:new Date(now-1)},now),false);
  assert.equal(freshLocation({observedAt:new Date(now-76_000),expiresAt:new Date(now+1000)},now),false);
  assert.equal(freshLocation({observedAt:new Date(now-10_000),expiresAt:new Date(now+1000)},now),true);
  const venue={enabled:true,center:{lat:19.059,lon:72.864},radiusMeters:350,startAt:new Date(now-1000).toISOString(),endAt:new Date(now+10_000).toISOString()};
  assert.equal(insideVenue({lat:19.059,lon:72.864,accuracyMeters:20},venue,now),true);
  assert.equal(insideVenue({lat:19.059,lon:72.864,accuracyMeters:400},venue,now),false);
});

test('uncertain indoor GPS may not claim two strangers are standing side by side',()=>{
  assert.equal(conservativeDistanceBand(4,80,65),'same venue · GPS distance uncertain');
  assert.equal(conservativeDistanceBand(4,5,4),'very close (approximate)');
  assert.equal(conservativeDistanceBand(NaN,5,4),'same venue · GPS distance uncertain');
});

test('ticket verification upgrades an existing pending record only after authenticated organizer attestation',()=>{
  const source=read('../src/app.js');
  assert.match(source,/ticketVerifier\.verify\(\{ticketSecret,subject:actor\.userId,email:actor\.email\}\)/);
  assert.match(source,/updateOne\(\{userId:actor\.userId\},\{\$set:attestation\},\{upsert:true\}\)/);
  assert.match(source,/Ticket is already bound to an account/);
});

test('meeting requests are same-venue and recipient-specific; approval uses a fresh GPS sample',()=>{
  const server=read('../src/app.js'), web=read('../web/src/App.jsx'), mobile=read('../mobile/App.tsx');
  assert.match(server,/Meeting requests require the same approved venue/);
  assert.match(server,/Attendees must be checked in at the same venue/);
  assert.match(server,/approvedGrant\(grant,actor\.userId,targetId\)/);
  assert.match(web,/await api\('\/location\/sample','POST',position\)/);
  assert.match(mobile,/await api\('\/location\/sample','POST',sample\)/);
});

test('GPS discovery does not require BLE and uses real check-in before starting',()=>{
  const mobile=read('../mobile/App.tsx');
  const checkin=mobile.indexOf("await api('/presence/check-in','POST',locationSample)");
  const start=mobile.indexOf("const session=await api('/location/share','POST'");
  assert.ok(checkin>-1&&start>checkin);
  assert.match(mobile,/setRadioState\('GPS only · Bluetooth unavailable'\)/);
  assert.match(mobile,/api\('\/nearby'\)/);
  assert.match(mobile,/Date\.now\(\)>=discoveryExpiresAt\.current/);
});

test('public in-app map reveals a venue marker, not attendees or their coordinates',()=>{
  const server=read('../src/app.js'),web=read('../web/src/App.jsx');
  assert.match(server,/return \{venue:\{venueId:venue\.venueId,name:venue\.name,lat:venue\.center\.lat,lon:venue\.center\.lon,radiusMeters:venue\.radiusMeters\},kind:'public_venue_only'\}/);
  assert.match(web,/function PublicVenueMap/);
  assert.match(web,/openstreetmap\.org\/export\/embed\.html/);
});

test('nearby and BLE resolution use batched authorization queries to avoid per-person query storms',()=>{
  const source=read('../src/app.js');
  const gps=source.slice(source.indexOf("app.get('/v1/nearby'"),source.indexOf("app.post('/v1/proximity/token'"));
  const ble=source.slice(source.indexOf("app.post('/v1/proximity/resolve'"),source.indexOf("app.post('/v1/location/requests'"));
  assert.match(gps,/access\.eligibleIds\(ids\)/);
  assert.match(ble,/access\.eligibleIds\(ids\)/);
  assert.doesNotMatch(gps,/await isBlocked\(actor\.userId,p\.userId\)/);
});

test('QR scan opens an attendee profile rather than silently following somebody',()=>{
 const mobile=read('../mobile/App.tsx');
 const scanned=mobile.slice(mobile.indexOf('const scanned=async'),mobile.indexOf('if(loading)return'));
 assert.match(scanned,/setSelectedPerson\(result\.profile\)/);
 assert.match(scanned,/setTab\('attendee'\)/);
 assert.doesNotMatch(scanned,/\/follows\//);
});
