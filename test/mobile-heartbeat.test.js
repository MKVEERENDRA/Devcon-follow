import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('native BLE session refreshes venue presence and foreground GPS sampling',()=>{
  const code=readFileSync(new URL('../mobile/App.tsx',import.meta.url),'utf8');
  assert.match(code,/if\(!radioActive \|\| !token\)return;/);
  assert.match(code,/AppState\.currentState!=='active'/);
  assert.match(code,/api\('\/presence\/check-in','POST',sample\)/);
  assert.match(code,/api\('\/location\/sample','POST',sample\)/);
  assert.match(code,/setInterval\(\(\)=>\{void heartbeat\(\);\},45_000\)/);
  assert.match(code,/Date\.now\(\)>=discoveryExpiresAt\.current/);
});

test('native social profile edits preserve existing photo, interests and social links',()=>{
  const code=readFileSync(new URL('../mobile/App.tsx',import.meta.url),'utf8');
  assert.match(code,/interests:me\?\.profile\?\.interests\|\|\[\]/);
  assert.match(code,/socials:me\?\.profile\?\.socials\|\|\{\}/);
  assert.match(code,/avatar:me\?\.profile\?\.avatar\|\|null/);
  assert.match(code,/tab==='connections'/);
  assert.match(code,/api\('\/following'\)/);
});
