import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {startTestRuntime} from '../test/support/runtime.js';
const app=await startTestRuntime({config:{ADMIN_SUBJECTS:'alice',COMMUNITY_SELF_SERVICE_ENABLED:'true',COMMUNITY_REGISTRATION_MODE:'public',COMMUNITY_ACCESS_ENABLED:'false'}});let browser;
try{
 browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Kolkata'}),page=await context.newPage();
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(app.origin);await page.getByRole('button',{name:'Get started',exact:true}).click();await page.getByLabel('Email').fill('alice@example.test');await page.getByLabel('Password').fill('sandbox-alice');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByLabel('Display name',{exact:true}).fill('Sandbox administrator');await page.getByLabel('Username',{exact:true}).fill('sandbox_admin');await page.getByRole('button',{name:'Save profile',exact:true}).click();
 await page.getByRole('button',{name:'Me',exact:true}).click();await page.getByRole('button',{name:'Venue admin',exact:true}).click();
 await page.getByLabel('Venue name',{exact:true}).fill('SANDBOX PUBLIC VENUE');await page.getByLabel('Latitude',{exact:true}).fill('19.01');await page.getByLabel('Longitude',{exact:true}).fill('72.85');
 const times=await page.evaluate(()=>{const local=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);return [local(new Date(Date.now()-3600000)),local(new Date(Date.now()+3600000))]});
 await page.getByLabel('Start (venue local time)',{exact:true}).fill(times[0]);await page.getByLabel('End (venue local time)',{exact:true}).fill(times[1]);await page.getByRole('button',{name:'Add disabled venue',exact:true}).click();
 await page.getByText('Meeting places for SANDBOX PUBLIC VENUE',{exact:true}).click();
 await page.getByLabel('Public meeting place',{exact:true}).fill('SANDBOX COFFEE');await page.getByLabel('Meeting place latitude',{exact:true}).fill('19.01');await page.getByLabel('Meeting place longitude',{exact:true}).fill('72.85');
 assert(await page.getByRole('button',{name:'Add disabled meeting place',exact:true}).isDisabled());await page.getByLabel('I confirmed this is a public meeting point inside the approved venue.',{exact:true}).check();await page.getByRole('button',{name:'Add disabled meeting place',exact:true}).click();
 const enable=page.getByRole('button',{name:'Enable SANDBOX COFFEE',exact:true});await enable.waitFor();assert.equal((await app.db.collection('landmarks').findOne({name:'SANDBOX COFFEE'})).enabled,false);
 await enable.click();await page.getByRole('button',{name:'Disable SANDBOX COFFEE',exact:true}).waitFor();assert.equal((await app.db.collection('venues').findOne({name:'SANDBOX PUBLIC VENUE'})).enabled,false);
 await page.getByRole('button',{name:'Enable',exact:true}).click();await page.getByRole('button',{name:'Disable',exact:true}).waitFor();
 const release=(await app.request('alice','/health/release')).body;assert.equal(release.checks.approvedVenue,true);assert.equal(release.checks.approvedLandmark,true);
 await page.getByRole('button',{name:'Disable SANDBOX COFFEE',exact:true}).click();await enable.waitFor();assert.equal((await app.request('alice','/health/release')).body.checks.approvedLandmark,false);
 assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');await mkdir('artifacts/admin',{recursive:true});await page.screenshot({path:'artifacts/admin/landmarks-large-text.png',fullPage:true});const overflow=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,type:e.getAttribute('type'),className:e.className,right:e.getBoundingClientRect().right,text:e.textContent?.slice(0,50)})));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,JSON.stringify(overflow));
 console.log('PASS: sandbox administrator signs in, creates a disabled venue and public place, explicitly enables them, disables the place, and passes axe/large-text checks. No production venue or attendee was created.');
}finally{await browser?.close();await app.close()}
