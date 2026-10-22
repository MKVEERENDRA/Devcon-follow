import test from 'node:test';
import assert from 'node:assert/strict';
import {assertScopedDatabaseIdentity} from '../src/database-permissions.js';

test('dedicated database guard accepts only the named user and a single database-scoped readWrite role',()=>{
  const status=(user,roles)=>({authInfo:{authenticatedUsers:[{user,db:'admin'}],authenticatedUserRoles:roles}});
  const scoped={role:'readWrite',db:'devcon_follow_staging'};
  assert.doesNotThrow(()=>assertScopedDatabaseIdentity(status('devcon_follow_gce_staging',[scoped]),'devcon_follow_gce_staging','devcon_follow_staging'));
  for(const unsafe of [
    status('devcon_follow_gce_staging',[{role:'atlasAdmin',db:'admin'}]),
    status('devcon_follow_gce_staging',[scoped,{role:'readAnyDatabase',db:'admin'}]),
    status('devcon_follow_gce_staging',[{role:'readWrite',db:'devcon_follow'}]),
    status('another_user',[scoped]),status('devcon_follow_gce_staging',[]),{},
  ])assert.throws(()=>assertScopedDatabaseIdentity(unsafe,'devcon_follow_gce_staging','devcon_follow_staging'),/only readWrite/);
});
