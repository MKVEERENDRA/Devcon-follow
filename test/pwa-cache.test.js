import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sw=readFileSync(new URL('../web/public/sw.js',import.meta.url),'utf8');
function fixture(path,destination='document'){
  const listeners={};
  const context={
    self:{location:{origin:'https://follow.example'},addEventListener:(type,fn)=>listeners[type]=fn},
    URL,
  };
  vm.runInNewContext(sw,context);
  let cached=false;
  listeners.fetch({request:{method:'GET',url:`https://follow.example${path}`,destination},respondWith:()=>{cached=true}});
  return cached;
}
test('service worker never intercepts authenticated, location, config, or health responses',()=>{
  for(const path of ['/v1/me','/v1/location/other','/v1/directory','/client-config','/health/ready']){
    assert.equal(fixture(path),false,`${path} should bypass service worker`);
  }
});

test('service worker refuses OAuth callback codes and user-specific query URLs',()=>{
  for(const path of ['/?code=secret-authorization-code&state=secret-state','/?profile=another-attendee','/privacy.html?invite=person']){
    assert.equal(fixture(path),false,`${path} must never be cached`);
  }
});
