import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {startTestRuntime} from '../test/support/runtime.js';

// Loopback identities/geometry only. This is not real-provider or device evidence.
const app=await startTestRuntime({config:{COMMUNITY_SELF_SERVICE_ENABLED:'true',COMMUNITY_REGISTRATION_MODE:'public',COMMUNITY_ACCESS_ENABLED:'false'}});
let browser;
try{
 const point={lat:19.01,lon:72.85,accuracyMeters:10};
 for(const id of ['alice','bob']){
  assert.equal((await app.request(id,'/v1/me')).status,200);
  assert.equal((await app.request(id,'/v1/profile','PUT',{handle:id,displayName:id,roles:['Builder'],discoverable:true})).status,200);
 }
 assert.equal((await app.request('admin','/v1/admin/venues','POST',{name:'SANDBOX QR venue',...point,radiusMeters:300,startAt:new Date(Date.now()-60000).toISOString(),endAt:new Date(Date.now()+3600000).toISOString(),enabled:true})).status,201);
 for(const id of ['alice','bob'])assert.equal((await app.request(id,'/v1/presence/check-in','POST',point)).status,200);
 browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(app.origin+'/?profile=bob');
 await page.getByRole('button',{name:'Get started'}).waitFor();
 assert.equal(new URL(page.url()).searchParams.get('profile'),'bob','signed-out mount must retain the QR intent until sign-in');
 await page.getByRole('button',{name:'Get started'}).click();
 await page.getByLabel('Email').fill('alice@example.test');await page.getByLabel('Password').fill('sandbox-alice');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('heading',{name:'bob',exact:true}).waitFor({timeout:10000});
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('pendingProfile')),null,'consume QR intent only after authenticated return');
 assert.equal(await app.db.collection('follows').countDocuments(),0,'opening a QR never follows automatically');
 await page.getByRole('button',{name:'Follow',exact:true}).click();await page.getByRole('button',{name:'Following',exact:true}).waitFor();
 assert.equal(await app.db.collection('follows').countDocuments({followerId:'alice',followedId:'bob'}),1);
 assert.deepEqual(errors,[]);
 console.log('PASS: signed-out QR → sandbox PKCE → intended profile → explicit follow. No real-provider/device claim.');
}finally{await browser?.close();await app.close()}
