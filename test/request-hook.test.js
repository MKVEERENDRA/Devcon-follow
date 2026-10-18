import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Catches a past outage: the request hook named its argument `_req` but used `req`.
// Dependency-free guard, complemented by HTTP integration tests when packages are available.
test('HTTP request security hook references its declared request argument', () => {
  const code=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(code,/addHook\('onRequest',async\(req,reply\)=>\{/);
  assert.match(code,/if\(req\.url\.startsWith\('\/v1\/'\)/);
});
