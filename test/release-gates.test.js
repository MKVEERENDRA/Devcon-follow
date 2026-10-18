import test from 'node:test';
import assert from 'node:assert/strict';
import {startTestRuntime} from './support/runtime.js';
test('Release configuration requires valid nonexpired venue and an enabled public landmark within that venue',async()=>{
 const app=await startTestRuntime({config:{OIDC_ISSUER:'https://issuer.example.test/',OIDC_JWKS_URL:'https://issuer.example.test/jwks'}});
 const check=async()=>{const r=await fetch(app.origin+'/health/release');return {status:r.status,...await r.json()}};
 try{
  let r=await check();assert.equal(r.status,503);assert.equal(r.checks.approvedVenue,false);assert.equal(r.checks.approvedLandmark,false);
  const venue={venueId:'test-venue',name:'TEST venue',enabled:true,center:{lat:19,lon:72},radiusMeters:100,startAt:new Date(Date.now()-60000).toISOString(),endAt:new Date(Date.now()+3600000).toISOString()};
  await app.db.collection('venues').insertOne({...venue,center:{lat:999,lon:72}});
  r=await check();assert.equal(r.checks.approvedVenue,false);
  await app.db.collection('venues').updateOne({venueId:venue.venueId},{$set:{center:venue.center}});
  r=await check();assert.equal(r.checks.approvedVenue,true);assert.equal(r.checks.approvedLandmark,false);
  await app.db.collection('landmarks').insertOne({landmarkId:'test-landmark',venueId:venue.venueId,name:'TEST entrance',enabled:true,lat:20,lon:72});
  r=await check();assert.equal(r.status,503);assert.equal(r.checks.approvedLandmark,false);
  await app.db.collection('landmarks').updateOne({landmarkId:'test-landmark'},{$set:{lat:19}});
  r=await check();assert.equal(r.status,200);assert.equal(r.scope,'service-configuration');
  await app.db.collection('venues').updateOne({venueId:venue.venueId},{$set:{endAt:new Date(Date.now()-1000).toISOString()}});
  r=await check();assert.equal(r.status,503);assert.equal(r.checks.approvedVenue,false);assert.equal(r.checks.approvedLandmark,false);
 }finally{await app.close()}
});
