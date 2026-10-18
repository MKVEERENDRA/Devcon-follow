import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DISCOVERY_MINUTES,MAX_SHARE_MS} from '../src/domain.js';
const root = path => readFileSync(new URL(path, import.meta.url),'utf8');
test('server enforces 30-minute opt-in discovery but does not alter 15 minute meeting grants',()=>{
 assert.equal(DISCOVERY_MINUTES,30);assert.equal(MAX_SHARE_MS,1800000);
 const code=root('../src/app.js');
 assert.match(code,/if\(duration!==DISCOVERY_MINUTES\)/);
 assert.match(code,/if\(activeShare\(current\)\)/);
 assert.match(code,/status:'approved'/);
});
test('web and native use the same fixed session, with server-issued countdown and no public feed tab',()=>{
 const web=root('../web/src/App.jsx'), mobile=root('../mobile/App.tsx');
 assert.match(web,/const DISCOVERY_DURATION_MINUTES=30/);
 assert.match(web,/Session remaining:/);
 assert.doesNotMatch(web,/name:'feed',label:'Feed'/);
 assert.match(mobile,/Date\.parse\(session\.expiresAt\)/);
 assert.match(mobile,/Session: /);
 assert.doesNotMatch(mobile,/\['home','feed','messages'/);
});
