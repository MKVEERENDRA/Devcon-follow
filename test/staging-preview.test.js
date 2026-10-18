import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {request} from 'node:http';
import {startStagingPreview} from '../scripts/staging-preview.mjs';
import {readFile} from 'node:fs/promises';
const settings=JSON.parse(await readFile(new URL('../deploy/auth0/public-settings.json',import.meta.url)));
test('Private staging view keeps public guard, rejects foreign origins and records only API-accepted verified identity',async()=>{
 let forwarded;
 const backend=createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.url==='/client-config')return res.end(JSON.stringify({authReady:false,issuer:settings.OIDC_ISSUER,clientId:settings.WEB_OIDC_CLIENT_ID,audience:settings.OIDC_AUDIENCE}));
  forwarded=req.headers.authorization;
  if(forwarded!=='Bearer accepted'){res.statusCode=401;return res.end('{}')}
  if(req.url!=='/v1/me'){res.statusCode=403;return res.end('{}')}
  res.end(JSON.stringify({userId:'provider|one',accessTier:'pending',officiallyVerified:false}));
 });
 await new Promise(r=>backend.listen(0,'127.0.0.1',r));
 const preview=await startStagingPreview({port:0,upstream:`http://127.0.0.1:${backend.address().port}/`,adminEmail:'owner@example.test',verify:async token=>{assert.equal(token,'accepted');return {userId:'provider|one',email:'owner@example.test'}}});
 try{
  const config=await fetch(preview.origin+'/client-config');assert.equal((await config.json()).authReady,true);
  const realConfig=await fetch(`http://127.0.0.1:${backend.address().port}/client-config`);assert.equal((await realConfig.json()).authReady,false);
  assert.equal((await fetch(preview.origin+'/v1/me',{headers:{Origin:'https://untrusted.test'}})).status,403);
  assert.equal((await fetch(preview.origin+'/v1/me',{headers:{Authorization:'Bearer rejected'}})).status,401);
  assert.deepEqual((await (await fetch(preview.origin+'/__acceptance')).json()).identities,[]);
  assert.equal((await fetch(preview.origin+'/v1/me',{headers:{Authorization:'Bearer accepted'}})).status,200);
  const evidence=await (await fetch(preview.origin+'/__acceptance')).json();assert.equal(evidence.identities[0].intendedAdmin,true);assert.equal(evidence.identities[0].officiallyVerified,false);assert.equal(JSON.stringify(evidence).includes('accepted'),false);assert.ok(Object.values(evidence.identities[0].pendingPrivacyChecks).every(s=>s===403));
  const foreignHost=await new Promise(resolve=>{const r=request(preview.origin,{headers:{Host:'untrusted.test'}},s=>{s.resume();resolve(s.statusCode)});r.end()});assert.equal(foreignHost,403);
  const absolutePath=await new Promise(resolve=>{const r=request(preview.origin,{path:'http://untrusted.test/v1/me'},s=>{s.resume();resolve(s.statusCode)});r.end()});assert.equal(absolutePath,400);
 }finally{await preview.close();await new Promise(r=>backend.close(r))}
});
