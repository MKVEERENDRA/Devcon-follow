import test from 'node:test';
import assert from 'node:assert/strict';
import {profileId,profileUrl} from '../mobile/profile-links.js';
import {fetchWithTimeout} from '../mobile/http.js';
test('web and native share canonical social profile links and reject ticket/foreign/ambiguous URLs',()=>{
 for(const id of ['auth0|abc','google-oauth2|123','alice'])assert.equal(profileId(profileUrl(id)),id);
 for(const url of ['https://evil.test/?profile=alice','https://devcon-follow-api-staging.up.railway.app/?profile=alice','https://attacker@devcon-follow.vercel.app/?profile=alice','https://devcon-follow.vercel.app/ticket?profile=alice','https://devcon-follow.vercel.app/?profile=alice&profile=bob','https://devcon-follow.vercel.app/?profile=alice#ticket','https://devcon-follow.vercel.app/?profile=%00','https://devcon-follow.vercel.app/?profile=','devconfollow://callback?code=secret'])assert.equal(profileId(url),null,url);
});
test('native network timeout and transport errors return retryable messages without backend internals',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('raw networking internals'))));
 await assert.rejects(fetchWithTimeout('https://example.test',{},5),/Connection timed out/);
 globalThis.fetch=async()=>{throw Error('private IP and internal transport details')};
 await assert.rejects(fetchWithTimeout('https://example.test'),/^Error: Could not connect securely/);
 globalThis.fetch=async()=>new Response('{}');assert.equal((await fetchWithTimeout('https://example.test')).status,200);
});
