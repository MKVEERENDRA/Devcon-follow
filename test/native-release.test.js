import test from 'node:test';
import assert from 'node:assert/strict';
import {androidRelease,iosRelease,androidSecurityDisposition} from '../web/src/native-release.js';
test('native install link fails closed without verified signed APK evidence',()=>{
 assert.equal(androidRelease(null),null);assert.equal(androidRelease({schemaVersion:1,android:null}),null);
 const a={verified:true,kind:'apk',apiBaseUrl:'https://devcon-follow.vercel.app',distribution:'public-release',securityGatePassed:true,delivery:'binary',downloadVerifiedAt:'2026-10-19T00:00:00Z',sourceCommit:'c'.repeat(40),packageId:'com.proofofaudits.devconfollow',downloadUrl:'https://github.com/MKVEERENDRA/Devcon-follow/releases/download/v0.3.0/devcon-follow.apk',sha256:'a'.repeat(64),signingCertificateSha256:'b'.repeat(64),buildId:'synthetic-test-only',version:'0.3.0',versionCode:1};
 assert.equal(androidRelease({schemaVersion:1,android:a}),a);
 for(const patch of [{apiBaseUrl:undefined},{apiBaseUrl:'https://devcon-follow-api-staging.up.railway.app'},{apiBaseUrl:'http://api.example.test'},{apiBaseUrl:'https://api.example.test/path'},{securityGatePassed:false},{delivery:'html'},{downloadVerifiedAt:''},{sourceCommit:''},{downloadUrl:'https://github.com:8443/MKVEERENDRA/Devcon-follow/releases/download/v0.3.0/devcon-follow.apk'},{downloadUrl:'https://expo.dev/accounts/team/projects/app/builds/build-id'},{verified:false},{kind:'aab'},{distribution:'production'},{packageId:'another.app'},{sha256:''},{signingCertificateSha256:''},{downloadUrl:'javascript:alert(1)'},{downloadUrl:'https://user:secret@example.test/a.apk'},{downloadUrl:'https://example.test/a.apk?token=secret'}])assert.equal(androidRelease({schemaVersion:1,android:{...a,...patch}}),null);
 assert.equal(iosRelease({schemaVersion:1,ios:{verified:true,kind:'testflight',downloadUrl:'https://untrusted.example.test/join/a'}}),null);
 assert.equal(iosRelease({schemaVersion:1,ios:{verified:true,kind:'testflight',downloadUrl:'https://testflight.apple.com/join/synthetic'}})?.verified,true);
});
test('an explicitly recorded residual-risk decision is bounded to source, APK, audit and expiry without turning a red audit green',()=>{
 const now=Date.parse('2026-10-20T00:00:00Z');
 const decision={status:'accepted-residual-risk',auditStatus:'fail',sourceCommit:'c'.repeat(40),apkSha256:'a'.repeat(64),auditSha256:'d'.repeat(64),advisories:['GHSA-vfj7-8cjw-p6xm','GHSA-86w9-cpqp-85rv'],approvedAt:'2026-10-19T00:00:00Z',expiresAt:'2026-11-07T00:00:00Z',recordUrl:'https://github.com/MKVEERENDRA/Devcon-follow/blob/'+ 'e'.repeat(40)+'/docs/releases/synthetic-decision.md'};
 const a={verified:true,kind:'apk',apiBaseUrl:'https://devcon-follow.vercel.app',distribution:'public-release',securityGatePassed:false,releaseSecurityDecision:decision,delivery:'binary',downloadVerifiedAt:'2026-10-19T00:00:00Z',sourceCommit:'c'.repeat(40),packageId:'com.proofofaudits.devconfollow',downloadUrl:'https://github.com/MKVEERENDRA/Devcon-follow/releases/download/v0.3.0/synthetic.apk',sha256:'a'.repeat(64),signingCertificateSha256:'b'.repeat(64),buildId:'synthetic-test-only',version:'0.3.0',versionCode:1};
 assert.equal(androidRelease({schemaVersion:1,android:a},now),a);
 assert.equal(androidSecurityDisposition(a,now),'accepted-residual-risk');assert.equal(a.securityGatePassed,false);
 for(const patch of [{status:'approved'},{auditStatus:'pass'},{sourceCommit:'f'.repeat(40)},{apkSha256:'f'.repeat(64)},{auditSha256:''},{advisories:[]},{advisories:[...decision.advisories,'GHSA-unknown-risk']},{approvedAt:'2026-10-21T00:00:00Z'},{expiresAt:'2026-10-20T00:00:00Z'},{expiresAt:'2027-01-01T00:00:00Z'},{expiresAt:''},{recordUrl:'https://example.test/decision.md'},{recordUrl:decision.recordUrl+'?token=x'},{recordUrl:decision.recordUrl.replace('github.com/','github.com:8443/')}]){
  assert.equal(androidRelease({schemaVersion:1,android:{...a,releaseSecurityDecision:{...decision,...patch}}},now),null);
 }
 assert.equal(androidRelease({schemaVersion:1,android:a},Date.parse(decision.expiresAt)),null);
 assert.equal(androidRelease({schemaVersion:1,android:{...a,sourceCommit:'f'.repeat(40)}},now),null);
 assert.equal(androidRelease({schemaVersion:1,android:{...a,sha256:'f'.repeat(64)}},now),null);
});
