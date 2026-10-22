import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {startTestRuntime} from '../test/support/runtime.js';
const app=await startTestRuntime({config:{COMMUNITY_SELF_SERVICE_ENABLED:'true',COMMUNITY_REGISTRATION_MODE:'public'}});let browser;
try{
 await app.db.collection('venues').insertOne({venueId:'sandbox-arrival',name:'SANDBOX future venue',center:{lat:19.01,lon:72.85},radiusMeters:200,startAt:new Date(Date.now()+3600000).toISOString(),endAt:new Date(Date.now()+7200000).toISOString(),enabled:true});
 browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 await page.goto(app.origin);await page.getByRole('button',{name:'Get started',exact:true}).click();await page.getByLabel('Email').fill('alice@example.test');await page.getByLabel('Password').fill('sandbox-alice');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByLabel('Display name',{exact:true}).fill('Sandbox arrival');await page.getByLabel('Username',{exact:true}).fill('sandbox_arrival');await page.getByRole('button',{name:'Save profile',exact:true}).click();
 const section=page.getByRole('region',{name:'Plan your arrival'});await section.getByRole('heading',{name:'SANDBOX future venue'}).waitFor();
 const link=section.getByRole('link',{name:'Directions to public venue'});assert.equal(await link.getAttribute('href'),'https://www.google.com/maps/dir/?api=1&destination=19.01%2C72.85');
 assert.equal(await app.db.collection('presence').countDocuments({}),0);assert.equal(await app.db.collection('shares').countDocuments({}),0);
 assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await mkdir('artifacts/arrival',{recursive:true});await page.screenshot({path:'artifacts/arrival/offsite-directions.png',fullPage:true});
 console.log('PASS: sandbox sign-in and profile -> future public venue and India time -> directions without GPS/check-in; WCAG and 200% text pass. No real venue created.');
}finally{await browser?.close();await app.close()}
