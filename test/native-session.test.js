import test from 'node:test';
import assert from 'node:assert/strict';
import {TOKEN_KEY,SESSION_KEY,clearStoredSession,restoreStoredSession,renewActiveSession} from '../mobile/session.js';
test('native session removal clears private state immediately, deletes both credentials, and surfaces storage failure',async()=>{
 const events=[],pending=[];
 const operation=clearStoredSession({deleteItemAsync:key=>{events.push(key);return new Promise(resolve=>pending.push(resolve))}},()=>events.push('private-state-cleared'));
 assert.deepEqual(events,['private-state-cleared',TOKEN_KEY,SESSION_KEY]);pending.forEach(resolve=>resolve());await operation;
 let cleared=false;const deleted=[];
 await assert.rejects(clearStoredSession({deleteItemAsync:async key=>{deleted.push(key);throw Error('Keystore unavailable')}},()=>{cleared=true}),/Keystore unavailable/);
 assert.equal(cleared,true);assert.deepEqual(deleted,[TOKEN_KEY,SESSION_KEY]);
});
// Synthetic transport credentials only; provider/JWT validation has separate
// signed sandbox integration coverage. These tests never contact Auth0.
const session={refreshToken:'synthetic-refresh-old',idToken:'synthetic-id',expiresAt:1000};
const fresh={accessToken:'synthetic-access-new',refreshToken:'synthetic-refresh-new',expiresIn:600};
test('native cold start renews expired access before exposing the session and preserves the rotated credential across API outage',async()=>{
 const calls=[];let persisted;
 const options={token:'synthetic-access-old',session,now:()=>2000,
  refresh:async value=>{calls.push(['refresh',value]);return fresh},
  persist:async(token,stored)=>{calls.push(['persist',token]);persisted=stored},
  loadAccount:async token=>{calls.push(['account',token]);return Response.json({userId:'sandbox-owner'})},
  clear:async()=>{calls.push(['clear'])}};
 const restored=await restoreStoredSession(options);
 assert.equal(restored.token,fresh.accessToken);assert.equal(restored.account.userId,'sandbox-owner');assert.equal(persisted.refreshToken,fresh.refreshToken);
 assert.deepEqual(calls.map(c=>c[0]),['refresh','persist','account']);
 calls.length=0;
 await assert.rejects(restoreStoredSession({...options,loadAccount:async()=>new Response(null,{status:503})}),/503/);
 assert.equal(persisted.refreshToken,fresh.refreshToken);assert(!calls.some(c=>c[0]==='clear'),'API outage must not delete the rotated refresh token');
});
test('native restore retries an unexpected 401 once, clears invalid grants and preserves credentials on transient provider failure',async()=>{
 let cleared=0,refreshed=0,loaded=0;
 const options={token:'synthetic-access-old',session:{...session,expiresAt:1000000},now:()=>2000,
  refresh:async()=>{refreshed++;return fresh},persist:async()=>{},clear:async()=>{cleared++},
  loadAccount:async()=>++loaded===1?new Response(null,{status:401}):Response.json({userId:'sandbox-owner'})};
 assert.equal((await restoreStoredSession(options)).token,fresh.accessToken);assert.equal(refreshed,1);assert.equal(cleared,0);
 await assert.rejects(restoreStoredSession({...options,session,refresh:async()=>{throw Error('Offline')}}),/Offline/);assert.equal(cleared,0);
 const revoked=await restoreStoredSession({...options,session,refresh:async()=>{throw Object.assign(Error('Revoked'),{code:'invalid_grant'})}});
 assert.equal(revoked,null);assert.equal(cleared,1);
 const refused=await restoreStoredSession({...options,session,loadAccount:async()=>new Response(null,{status:401})});assert.equal(refused,null);assert.equal(cleared,2);
 const keystoreFailure={...options,session,persist:async()=>{throw Error('Keystore unavailable')}};
 await assert.rejects(restoreStoredSession(keystoreFailure),/Keystore/);assert.equal(cleared,2);
});


test('foreground renewal preserves expired sessions on provider outage and succeeds on retry',async()=>{
 let cleared=0,rotated=0,persisted=0;
 const options={session,now:()=>2000,refresh:async()=>{throw Error('Network unavailable')},
  onRotated:()=>{rotated++},persist:async()=>{persisted++},clear:async()=>{cleared++}};
 await assert.rejects(renewActiveSession(options),/Network unavailable/);
 assert.deepEqual([cleared,rotated,persisted],[0,0,0]);
 const result=await renewActiveSession({...options,refresh:async()=>fresh});
 assert.equal(result.token,fresh.accessToken);assert.equal(result.session.refreshToken,fresh.refreshToken);
 assert.deepEqual([cleared,rotated,persisted],[0,1,1]);
});
test('foreground renewal keeps a consumed credential rotated after keystore failure',async()=>{
 let memory=session,cleared=0;const used=[];
 const options={session:memory,refresh:async token=>{used.push(token);return fresh},
  onRotated:next=>{memory=next},persist:async()=>{throw Error('Keystore unavailable')},clear:async()=>{cleared++}};
 await assert.rejects(renewActiveSession(options),/Keystore unavailable/);
 assert.equal(memory.refreshToken,fresh.refreshToken);assert.equal(cleared,0);
 await renewActiveSession({...options,session:memory,persist:async()=>{}});
 assert.deepEqual(used,[session.refreshToken,fresh.refreshToken]);
});
test('foreground renewal clears explicit revocation but ignores results after logout',async()=>{
 let cleared=0,stored=0,active=true;
 const options={session,refresh:async()=>{throw Object.assign(Error('Revoked'),{code:'invalid_grant'})},
  isActive:()=>active,onRotated:()=>{stored++},persist:async()=>{stored++},clear:async()=>{cleared++}};
 assert.equal(await renewActiveSession(options),null);assert.equal(cleared,1);
 active=false;
 assert.equal(await renewActiveSession(options),null);assert.equal(cleared,1);
 assert.equal(await renewActiveSession({...options,refresh:async()=>fresh}),null);assert.equal(stored,0);
});
