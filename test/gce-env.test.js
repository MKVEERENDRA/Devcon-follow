import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('GCE configuration keeps credentials private, starts enrollment closed and refuses overwrite',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'devcon-env-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const input=join(directory,'uri'),output=join(directory,'app.env');
  const uri='mongodb+srv://devcon_follow_gce_staging:synthetic-test-only@devconfollow.0esz7ob.mongodb.net/';
  await writeFile(input,uri,{mode:0o600});
  const run=()=>spawnSync(process.execPath,['scripts/prepare-gce-env.mjs',input,'https://migration.example.test',output],{encoding:'utf8'});
  const result=run();assert.equal(result.status,0);assert.ok(!result.stdout.includes(uri));assert.ok(!result.stderr.includes(uri));
  const config=await readFile(output,'utf8');assert.ok(config.includes('MONGODB_URI='+uri));
  assert.match(config,/REGISTRATION_ENABLED=false/);assert.match(config,/COMMUNITY_REGISTRATION_MODE=closed/);
  assert.equal((await stat(output)).mode&0o077,0);
  assert.notEqual(run().status,0);assert.equal(await readFile(output,'utf8'),config);
});

test('GCE configuration rejects template credentials and credentials for another database user',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'devcon-env-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const input=join(directory,'uri'),output=join(directory,'app.env');
  for(const uri of ['mongodb+srv://<db_username>:<db_password>@devconfollow.0esz7ob.mongodb.net/',
    'mongodb+srv://devcon_follow_gce_staging:%3Cdb_password%3E@devconfollow.0esz7ob.mongodb.net/',
    'mongodb+srv://another_user:synthetic@devconfollow.0esz7ob.mongodb.net/']){
    await writeFile(input,uri,{mode:0o600});
    const result=spawnSync(process.execPath,['scripts/prepare-gce-env.mjs',input,'https://migration.example.test',output],{encoding:'utf8'});
    assert.notEqual(result.status,0);assert.ok(!result.stdout.includes(uri));assert.ok(!result.stderr.includes(uri));
  }
  await assert.rejects(stat(output),{code:'ENOENT'});
});
