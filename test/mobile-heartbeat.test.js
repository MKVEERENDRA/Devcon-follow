import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('native BLE session refreshes venue presence and foreground GPS sampling',()=>{
  const code=readFileSync(new URL('../mobile/App.tsx',import.meta.url),'utf8');
  assert.match(code,/if\(!radioActive \|\| !token \|\| !me\?\.accessEligible\)return;/);
  assert.match(code,/AppState\.currentState!=='active'/);
  assert.match(code,/api\('\/presence\/check-in','POST',sample\)/);
  assert.match(code,/api\('\/location\/sample','POST',sample\)/);
  assert.match(code,/setInterval\(\(\)=>\{void heartbeat\(\);\},45_000\)/);
  assert.match(code,/Date\.now\(\)>=discoveryExpiresAt\.current/);
});

test('native profile edits preserve photo and social links and allow interests to be edited',()=>{
  const code=readFileSync(new URL('../mobile/App.tsx',import.meta.url),'utf8');
  assert.match(code,/setInterestText\(\(p\?\.interests\|\|\[\]\)\.join/);
  assert.match(code,/interests:interestText\.split/);
  assert.match(code,/setGithub\(p\?\.socials\?\.github/);
  assert.match(code,/socials:\{github,linkedin,x,website\}/);
  assert.match(code,/setAvatar\(p\?\.avatar\|\|null\)/);
  assert.doesNotMatch(code,/if\(value.profile\)\{setHandle/,'background refresh must not reset profile edit drafts');
  assert.match(code,/tab==='connections'/);
  assert.match(code,/api\('\/following'\)/);
});
