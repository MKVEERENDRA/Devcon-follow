import test from 'node:test';
import assert from 'node:assert/strict';
import {androidRelease,iosRelease} from '../web/src/native-release.js';
test('native install link fails closed without verified signed APK evidence',()=>{
 assert.equal(androidRelease(null),null);assert.equal(androidRelease({schemaVersion:1,android:null}),null);
 const a={verified:true,kind:'apk',distribution:'private-preview',packageId:'com.proofofaudits.devconfollow',downloadUrl:'https://expo.dev/artifacts/eas/preview.apk',sha256:'a'.repeat(64),signingCertificateSha256:'b'.repeat(64),buildId:'synthetic-test-only',version:'0.3.0',versionCode:1};
 assert.equal(androidRelease({schemaVersion:1,android:a}),a);
 for(const patch of [{verified:false},{kind:'aab'},{distribution:'production'},{packageId:'another.app'},{sha256:''},{signingCertificateSha256:''},{downloadUrl:'javascript:alert(1)'},{downloadUrl:'https://user:secret@example.test/a.apk'},{downloadUrl:'https://example.test/a.apk?token=secret'}])assert.equal(androidRelease({schemaVersion:1,android:{...a,...patch}}),null);
 assert.equal(iosRelease({schemaVersion:1,ios:{verified:true,kind:'testflight',downloadUrl:'https://untrusted.example.test/join/a'}}),null);
 assert.equal(iosRelease({schemaVersion:1,ios:{verified:true,kind:'testflight',downloadUrl:'https://testflight.apple.com/join/synthetic'}})?.verified,true);
});
