import test from 'node:test';
import assert from 'node:assert/strict';
import {TOKEN_KEY,SESSION_KEY,clearStoredSession} from '../mobile/session.js';
test('native session removal clears private state immediately, deletes both credentials, and surfaces storage failure',async()=>{
 const events=[],pending=[];
 const operation=clearStoredSession({deleteItemAsync:key=>{events.push(key);return new Promise(resolve=>pending.push(resolve))}},()=>events.push('private-state-cleared'));
 assert.deepEqual(events,['private-state-cleared',TOKEN_KEY,SESSION_KEY]);pending.forEach(resolve=>resolve());await operation;
 let cleared=false;const deleted=[];
 await assert.rejects(clearStoredSession({deleteItemAsync:async key=>{deleted.push(key);throw Error('Keystore unavailable')}},()=>{cleared=true}),/Keystore unavailable/);
 assert.equal(cleared,true);assert.deepEqual(deleted,[TOKEN_KEY,SESSION_KEY]);
});
