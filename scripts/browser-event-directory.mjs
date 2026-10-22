import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {startTestRuntime} from '../test/support/runtime.js';
const app=await startTestRuntime({config:{COMMUNITY_SELF_SERVICE_ENABLED:'true',COMMUNITY_REGISTRATION_MODE:'public',COMMUNITY_ACCESS_ENABLED:'false'}});let browser;
try{
 for(const id of ['bob','eve']){
  await app.request(id,'/v1/me');
  assert.equal((await app.request(id,'/v1/profile','PUT',{handle:id,displayName:id==='bob'?'Sandbox Founder':'Hidden legacy profile',roles:['Founder'],discoverable:true,eventDirectory:id==='bob'})).status,200);
 }
 browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox']});
 const page=await (await browser.newContext({viewport:{width:390,height:844}})).newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(app.origin);await page.getByRole('button',{name:'Get started',exact:true}).click();await page.getByLabel('Email').fill('alice@example.test');await page.getByLabel('Password').fill('sandbox-alice');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByLabel('Display name',{exact:true}).fill('Sandbox pre-arrival');await page.getByLabel('Username',{exact:true}).fill('sandbox_prearrival');
 const consent=page.getByRole('checkbox',{name:'Include me in the event directory'});assert.equal(await consent.isChecked(),false);assert.equal(await consent.isDisabled(),true);
 await page.getByLabel('Make my profile discoverable',{exact:true}).check();await consent.check();await page.getByRole('button',{name:'Save profile',exact:true}).click();
 await page.getByText('Sandbox Founder',{exact:true}).waitFor();assert.equal(await page.getByText('Hidden legacy profile',{exact:true}).count(),0);
 const arrival=page.getByRole('region',{name:'Plan your arrival'});await arrival.getByRole('heading',{name:'Jio World Centre',exact:true}).waitFor();assert((await arrival.getByRole('link',{name:'Directions to public venue'}).getAttribute('href')).includes(encodeURIComponent('Jio World Centre, G Block, Bandra Kurla Complex, Mumbai, India')));
 assert.equal(await app.db.collection('presence').countDocuments(),0);assert.equal(await app.db.collection('shares').countDocuments(),0);assert.equal(await app.db.collection('invitations').countDocuments(),0);assert.equal(await app.db.collection('tickets').countDocuments(),0);
 assert.equal((await app.db.collection('profiles').findOne({userId:'alice'})).eventDirectory,true);
 await page.getByRole('button',{name:'View profile',exact:true}).click();await page.getByRole('button',{name:'Follow',exact:true}).click();await page.getByRole('button',{name:'Following',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Arrange a meetup',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Connections',exact:true}).click();await page.getByRole('button').filter({hasText:'Sandbox Founder'}).waitFor();
 await page.getByRole('button',{name:'Me',exact:true}).click();await page.getByRole('button',{name:'Edit profile',exact:true}).click();await page.getByRole('checkbox',{name:'Include me in the event directory'}).uncheck();await page.getByRole('button',{name:'Save profile',exact:true}).click();
 assert.equal((await app.request('bob','/v1/directory?scope=event')).body.attendees.some(p=>p.userId==='alice'),false);
 await page.getByRole('button',{name:'Discover',exact:true}).click();await page.getByText('Sandbox Founder',{exact:true}).waitFor();
 assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id),[]);
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await mkdir('artifacts/event-directory',{recursive:true});await page.screenshot({path:'artifacts/event-directory/prearrival.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS: public sandbox signup without ticket/invitation, explicit event-directory consent/revocation, off-site search/profile/follow/retained connection, no GPS/presence, blocked off-site meetup action, axe and 200% reflow.');
}finally{await browser?.close();await app.close()}
