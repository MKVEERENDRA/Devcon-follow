import test from 'node:test';
import assert from 'node:assert/strict';
import {startTestRuntime} from './support/runtime.js';
test('rate-limited requests return 429 with retry guidance instead of being converted into 500',async t=>{
 const app=await startTestRuntime();t.after(()=>app.close());
 for(let n=0;n<100;n++){const response=await fetch(app.origin+'/health/live');assert.equal(response.status,200);await response.arrayBuffer()}
 const limited=await fetch(app.origin+'/health/live');assert.equal(limited.status,429);assert(Number(limited.headers.get('retry-after'))>0);assert.deepEqual(await limited.json(),{error:'Rate limit exceeded'});
 const headers={Authorization:'Bearer '+await app.sign('alice')};
 for(let n=0;n<120;n++){const response=await fetch(app.origin+'/health/live',{headers});assert.equal(response.status,200);await response.arrayBuffer()}
 const write=await fetch(app.origin+'/v1/profile',{method:'PUT',headers:{...headers,'content-type':'application/json'},body:'{}'});
 assert.equal(write.status,403,'read traffic must not consume the independent write budget or bypass access checks');await write.arrayBuffer();
});
