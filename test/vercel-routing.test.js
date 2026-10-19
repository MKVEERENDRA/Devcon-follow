import test from 'node:test';
import assert from 'node:assert/strict';
import {vercelConfig} from '../scripts/vercel-config.mjs';
test('API rewrites precede SPA fallback and disable shared caching without changing unrelated projects',()=>{
 const origin='https://devcon-follow-api-staging.up.railway.app',c=vercelConfig(origin);
 assert.deepEqual(c.rewrites.slice(0,3),[{source:'/v1/:path*',destination:origin+'/v1/:path*'},{source:'/client-config',destination:origin+'/client-config'},{source:'/health/:path*',destination:origin+'/health/:path*'}]);
 for(const path of ['/install.html','/native-release.json','/client-config','/.well-known/assetlinks.json'])assert(!new RegExp('^'+c.rewrites.at(-1).source+'$').test(path));
 assert(c.headers.every(h=>h.headers.some(v=>v.key==='Cache-Control'&&v.value.includes('no-store'))));
 assert.equal(vercelConfig().rewrites.length,1);
 for(const bad of ['http://example.com','https://example.com/','https://example.com/path','https://secret@example.com','https://example.com?token=secret'])assert.throws(()=>vercelConfig(bad));
});
