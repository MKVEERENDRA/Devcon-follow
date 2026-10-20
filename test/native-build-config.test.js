import test from 'node:test';
import assert from 'node:assert/strict';
import buildConfig from '../mobile/build-config.cjs';

test('production native builds reject missing, insecure and nonproduction API wiring',()=>{
 for(const value of [undefined,'','http://api.example.com','https://localhost','https://127.0.0.1','https://[::1]','https://api.local','https://user:secret@api.example.com','https://api.example.com/','https://api.example.com/?token=secret','https://devcon-follow-api-staging.up.railway.app','https://app-preview.example.com']){
  assert.throws(()=>buildConfig.validateNativeBuildConfig({EAS_BUILD_PROFILE:'production',EXPO_PUBLIC_API_BASE_URL:value}));
 }
 assert.doesNotThrow(()=>buildConfig.validateNativeBuildConfig({EAS_BUILD_PROFILE:'production',EXPO_PUBLIC_API_BASE_URL:'https://api.example.com'}));
 assert.doesNotThrow(()=>buildConfig.validateNativeBuildConfig({EAS_BUILD_PROFILE:'preview',EXPO_PUBLIC_API_BASE_URL:'https://devcon-follow-api-staging.up.railway.app'}));
 // Local/native compile diagnostics must not depend on live release credentials.
 assert.doesNotThrow(()=>buildConfig.validateNativeBuildConfig({}));
});
