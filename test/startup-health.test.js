import test from 'node:test';
import assert from 'node:assert/strict';
import {startStartupHealth} from '../src/startup-health.js';
import {startTestRuntime} from './support/runtime.js';

test('Database bootstrap exposes liveness but fails readiness and all attendee routes closed',async()=>{
  const startup=await startStartupHealth({port:0,host:'127.0.0.1'});
  try{
    const origin=`http://127.0.0.1:${startup.server.address().port}`;
    const live=await fetch(origin+'/health/live');assert.equal(live.status,200);
    assert.equal((await live.json()).phase,'initializing');
    for(const path of ['/health/ready','/health/release','/client-config','/v1/me','/v1/nearby','/']){
      const r=await fetch(origin+path);assert.equal(r.status,503);
      assert.equal((await r.json()).ok,false);assert.equal(r.headers.get('cache-control'),'no-store');
    }
  }finally{await startup.close()}
});

test('Staging registration switch hides login despite valid configured identity provider',async()=>{
  const app=await startTestRuntime({config:{REGISTRATION_ENABLED:'false',WEB_OIDC_CLIENT_ID:'configured-public-client'}});
  try{
    const response=await fetch(app.origin+'/client-config');
    assert.equal(response.status,200);assert.equal((await response.json()).authReady,false);
  }finally{await app.close()}
});
