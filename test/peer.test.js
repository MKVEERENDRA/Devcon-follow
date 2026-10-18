import test from 'node:test';import assert from 'node:assert/strict';
import {newPeerToken,validPeerToken,tokenDigest,PROXIMITY_LIFETIME_MS} from '../src/peer.js';
test('radio advertising rotates anonymous 24-byte random tokens without public identifiers',()=>{
 const one=newPeerToken(),two=newPeerToken();assert(validPeerToken(one));assert(validPeerToken(two));assert.notEqual(one,two);assert.equal(one.length,32);assert.equal(PROXIMITY_LIFETIME_MS,180000);
});
test('radio lookup stores keyed HMAC digest, never the advertised raw token',()=>{
 const t=newPeerToken(),a=tokenDigest(t,'a'.repeat(32)),b=tokenDigest(t,'b'.repeat(32));assert.notEqual(a,b);assert.notEqual(a,t);assert.match(a,/^[0-9a-f]{64}$/);
});
test('invalid radio tokens and weak signing key rejected',()=>{
 assert(!validPeerToken('participant-123'));assert.throws(()=>tokenDigest('participant-123','a'.repeat(32)));assert.throws(()=>tokenDigest(newPeerToken(),'short'));
});
