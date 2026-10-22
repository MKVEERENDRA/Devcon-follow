import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {startTestRuntime} from './support/runtime.js';

// Synthetic transport fixture only: never presented as a signed APK or uploaded.
async function fixture(t){
 const directory=await mkdtemp(join(tmpdir(),'devcon-private-download-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const bytes=Buffer.concat([Buffer.from('PK'),Buffer.alloc(10000,7)]);
 const metadata={kind:'apk',packageId:'com.proofofaudits.devconfollow',version:'0.3.1',versionCode:2,buildId:'6583ca87-7174-4907-8c8b-df10c38ceee9',sourceCommit:'a'.repeat(40),sha256:createHash('sha256').update(bytes).digest('hex'),signingCertificateSha256:'b'.repeat(64),sizeBytes:bytes.length,standaloneBundle:true,debuggable:false,apiBaseUrl:'https://devcon-follow-api-staging.up.railway.app'};
 await writeFile(join(directory,'devcon-follow.apk'),bytes);await writeFile(join(directory,'android.json'),JSON.stringify(metadata));
 return {directory,bytes,metadata};
}
test('private APK transport rechecks verified cohort and revocation; streams bytes with no public redirect/cache',async t=>{
 const {directory,bytes,metadata}=await fixture(t);
 const app=await startTestRuntime({config:{NODE_ENV:'test',ANDROID_PREVIEW_DIRECTORY:directory,COMMUNITY_SELF_SERVICE_ENABLED:'true',COMMUNITY_REGISTRATION_MODE:'pilot',COMMUNITY_PILOT_EMAILS:'alice@example.test',COMMUNITY_ACCESS_ENABLED:'false'}});t.after(()=>app.close());
 for(const path of ['/v1/releases/android','/v1/releases/android/apk']){
  assert.equal((await fetch(app.origin+path)).status,401);
  assert.equal((await app.request('bob',path)).status,403);
  const unverified=await fetch(app.origin+path,{headers:{Authorization:'Bearer '+await app.sign('alice',{emailVerified:false})}});assert.equal(unverified.status,403);
 }
 const info=await app.request('alice','/v1/releases/android');assert.equal(info.status,200);assert.equal(info.body.sha256,metadata.sha256);assert.equal(info.body.securityStatus,'blocked-public-release');assert(!JSON.stringify(info.body).includes(directory));assert(!('downloadUrl' in info.body));
 const headers={Authorization:'Bearer '+await app.sign('alice')};
 const response=await fetch(app.origin+'/v1/releases/android/apk',{headers});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^application\/vnd.android.package-archive/);assert.match(response.headers.get('content-disposition'),/^attachment; filename="devcon-follow-0.3.1-2.apk"$/);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('location'),null);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
 assert.equal((await fetch(app.origin+'/private-release/devcon-follow.apk')).status,404);
 await app.db.collection('communityMembers').updateOne({userId:'alice'},{$set:{status:'revoked'}});
 assert.equal((await fetch(app.origin+'/v1/releases/android/apk',{headers})).status,403);
});
test('private APK fails closed for missing/tampered files and production environments',async t=>{
 const {directory}=await fixture(t);await writeFile(join(directory,'devcon-follow.apk'),'corrupted');
 const config={NODE_ENV:'test',ANDROID_PREVIEW_DIRECTORY:directory,COMMUNITY_SELF_SERVICE_ENABLED:'true',COMMUNITY_REGISTRATION_MODE:'pilot',COMMUNITY_PILOT_EMAILS:'alice@example.test'};
 const broken=await startTestRuntime({config});t.after(()=>broken.close());assert.equal((await broken.request('alice','/v1/releases/android')).status,503);
 const fresh=await fixture(t);const production=await startTestRuntime({config:{...config,NODE_ENV:'production',ANDROID_PREVIEW_DIRECTORY:fresh.directory}});t.after(()=>production.close());assert.equal((await production.request('alice','/v1/releases/android')).status,503);
});

test('private staging APK must match the explicitly configured migrated HTTPS API origin',async t=>{
 const {directory,metadata}=await fixture(t);
 const origin='https://migration.example.test';
 const config={NODE_ENV:'production',APP_ENVIRONMENT:'staging',ANDROID_PREVIEW_DIRECTORY:directory,ANDROID_PREVIEW_API_ORIGIN:origin,COMMUNITY_SELF_SERVICE_ENABLED:'true',COMMUNITY_REGISTRATION_MODE:'pilot',COMMUNITY_PILOT_EMAILS:'alice@example.test'};
 const wrong=await startTestRuntime({config});t.after(()=>wrong.close());
 assert.equal((await wrong.request('alice','/v1/releases/android')).status,503);
 await writeFile(join(directory,'android.json'),JSON.stringify({...metadata,apiBaseUrl:origin}));
 const matching=await startTestRuntime({config});t.after(()=>matching.close());
 assert.equal((await matching.request('alice','/v1/releases/android')).status,200);
 assert.equal((await matching.request('bob','/v1/releases/android')).status,403);
});
