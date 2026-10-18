import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {startTestRuntime} from '../test/support/runtime.js';
const app=await startTestRuntime();let browser;
const evidence=new URL('../artifacts/browser-reliability/',import.meta.url);await mkdir(evidence,{recursive:true});
try{
 const point={lat:19.01,lon:72.85,accuracyMeters:10};
 for(const id of ['alice','bob']){const r=await app.request('admin','/v1/admin/invitations','POST',{email:id+'@example.test'});assert.equal(r.status,201);await app.request(id,'/v1/access/redeem','POST',{code:r.body.code});await app.request(id,'/v1/profile','PUT',{handle:id,displayName:id,roles:['Builder'],discoverable:true});}
 await app.request('admin','/v1/admin/venues','POST',{name:'SANDBOX venue',...point,radiusMeters:300,startAt:new Date(Date.now()-60000).toISOString(),endAt:new Date(Date.now()+3600000).toISOString(),enabled:true});
 await app.request('alice','/v1/presence/check-in','POST',point);
 browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({geolocation:{latitude:point.lat,longitude:point.lon,accuracy:10},viewport:{width:390,height:844}});
 const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(app.origin);await page.getByRole('button',{name:'Get started'}).click();await page.getByLabel('Email',{exact:true}).fill('alice@example.test');await page.getByLabel('Password',{exact:true}).fill('sandbox-alice');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('button',{name:'Discover',exact:true}).waitFor();
 await page.getByLabel('Search attendees').fill('no matching person');await page.getByText('No matching attendees',{exact:true}).waitFor();await page.getByRole('button',{name:'Clear filters'}).click();await page.getByRole('button',{name:'View profile',exact:true}).click();
 assert.equal(await app.db.collection('follows').countDocuments(),0,'opening a profile is not consent to follow');
 await page.getByRole('button',{name:'Follow',exact:true}).click();
 // A failed note load must offer recovery without enabling an empty overwrite.
 let failNote=true;await page.route('**/v1/connections/bob/note',async route=>{if(failNote&&route.request().method()==='GET')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Local simulated failure'})});return route.continue()});
 await page.getByRole('button',{name:'Connections',exact:true}).click();await page.getByRole('button').filter({hasText:'bob'}).click();
 await page.getByRole('button',{name:'Retry loading note'}).waitFor();assert.equal(await page.getByRole('button',{name:'Save private note'}).isEnabled(),false);failNote=false;await page.getByRole('button',{name:'Retry loading note'}).click();await page.getByLabel('Private connection note').fill('Temporary private note');await page.getByRole('button',{name:'Save private note'}).click();await page.getByText('Private note saved',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Unfollow',exact:true}).click();await page.getByRole('button',{name:'Follow',exact:true}).waitFor();assert.equal(await app.db.collection('notes').countDocuments({ownerId:'alice'}),0);await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('heading',{name:'Connections',exact:true}).waitFor();
 await page.getByRole('button',{name:'Nearby',exact:true}).click();
 const cdp=await context.newCDPSession(page);await cdp.send('Browser.setPermission',{permission:{name:'geolocation'},setting:'denied',origin:app.origin});
 await page.getByRole('button',{name:'Enable sharing'}).click();await page.getByRole('status').filter({hasText:'Location unavailable'}).waitFor();assert.equal(await app.db.collection('shares').countDocuments({userId:'alice'}),0,'permission denial must not create consent');
 await context.grantPermissions(['geolocation'],{origin:app.origin});await page.getByRole('button',{name:'Enable sharing'}).click();await page.getByRole('button',{name:'Stop location sharing'}).waitFor();
 let writes=0;await page.route('**/v1/location/sample',route=>{writes++;return route.continue()});
 await page.route('**/v1/location/share',route=>route.request().method()==='DELETE'?route.abort('failed'):route.continue());
 await page.getByRole('button',{name:'Stop location sharing'}).click();await page.getByText('Discovery stopped on this device',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Enable sharing'}).isEnabled(),false);
 // Run a full heartbeat interval; pending Stop must suppress subsequent GPS writes.
 await page.clock.install();await page.clock.fastForward(46000);assert.equal(writes,0);
 await page.screenshot({path:new URL('offline-stop.png',evidence).pathname,fullPage:true});
 await page.unroute('**/v1/location/share');await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.getByText('Discovery stopped on this device',{exact:true}).waitFor({state:'hidden'});assert.equal(await app.db.collection('shares').countDocuments({userId:'alice'}),0);
 assert.deepEqual(errors,[]);console.log('PASS: search recovery, QR/profile consent, note retry/isolation, unfollow cleanup, return navigation, GPS denial, offline Stop and reconnect');
}finally{await browser?.close();await app.close()}
