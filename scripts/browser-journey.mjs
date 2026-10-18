import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {startTestRuntime} from '../test/support/runtime.js';
const app=await startTestRuntime();let browser;
const evidence=new URL('../artifacts/browser/',import.meta.url);await mkdir(evidence,{recursive:true});
try{
  const invites={};
  for(const id of ['alice','bob']){
    const r=await app.request('admin','/v1/admin/invitations','POST',{email:id+'@example.test'});assert.equal(r.status,201);invites[id]=r.body.code;
  }
  const point={lat:19.01,lon:72.85,accuracyMeters:10};
  const venue=await app.request('admin','/v1/admin/venues','POST',{name:'SANDBOX event',...point,radiusMeters:300,startAt:new Date(Date.now()-60000).toISOString(),endAt:new Date(Date.now()+3600000).toISOString(),enabled:true});
  const landmark=await app.request('admin','/v1/admin/landmarks','POST',{venueId:venue.body.venueId,name:'SANDBOX entrance',lat:point.lat,lon:point.lon});assert.equal(landmark.status,201);
  browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox']});
  const pages={},errors=[];
  for(const id of ['alice','bob']){
    const context=await browser.newContext({permissions:['geolocation'],geolocation:{latitude:point.lat,longitude:point.lon,accuracy:10},viewport:{width:390,height:844},timezoneId:'Asia/Kolkata'});
    const page=await context.newPage();pages[id]=page;page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/admin/status'))console.log('HTTP',r.status(),new URL(r.url()).pathname)});
    await page.goto(app.origin);await page.getByRole('button',{name:'Get started'}).click();
    await page.getByLabel('Email').fill(id+'@example.test');await page.getByLabel('Password').fill('sandbox-'+id);await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.getByLabel('Invitation code').fill(invites[id]);await page.getByRole('button',{name:'Accept community invitation'}).click();
    await page.getByLabel('Display name',{exact:true}).fill(id);await page.getByLabel('Username',{exact:true}).fill(id);await page.getByRole('button',{name:'Save profile'}).click();
    await page.getByRole('button',{name:'Check in with location'}).click();await page.getByText('Venue check-in active',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Nearby',exact:true}).click();await page.getByRole('button',{name:'Enable sharing'}).click();await page.getByRole('button',{name:'Stop location sharing'}).waitFor();
    console.log(id+': browser OIDC authorization-code + PKCE, community access, profile, GPS discovery PASS');
  }
  const alice=pages.alice,bob=pages.bob;
  await alice.getByRole('button',{name:'Refresh nearby'}).click();await alice.getByRole('button').filter({hasText:'bob'}).last().click();
  await alice.getByRole('button',{name:'Arrange a meetup'}).click();await alice.getByLabel('Meeting place').selectOption(landmark.body.landmark.landmarkId);
  const future=await alice.evaluate(()=>{const d=new Date(Date.now()+600000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)});await alice.getByLabel(/^Time/).fill(future);await alice.getByRole('button',{name:'Send meeting invitation'}).click();
  await bob.getByRole('button',{name:'Meetups',exact:true}).click();await bob.getByRole('button',{name:'Accept meeting'}).click();await bob.getByRole('link',{name:'Directions to public landmark'}).waitFor();
  await bob.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await bob.screenshot({path:new URL('accepted-meetup.png',evidence).pathname,fullPage:true});
  for(const [id,target] of [['alice','bob'],['bob','alice']]){
    const page=pages[id];await page.getByRole('button',{name:'Me',exact:true}).click();
    await page.getByRole('button',{name:"Scan someone's profile QR"}).click();await page.getByLabel('Paste a Devcon Follow profile link').fill(app.origin+'/?profile='+target);await page.getByRole('button',{name:'Open profile',exact:true}).click();
    await page.getByRole('button',{name:'Follow',exact:true}).click();await page.getByRole('button',{name:'Following',exact:true}).waitFor();
  }
  await alice.getByRole('button',{name:'Message',exact:true}).click();
  await alice.getByRole('textbox',{name:'Message',exact:true}).fill('See you at the entrance');await alice.getByRole('button',{name:'Send',exact:true}).click();
  await bob.getByRole('button',{name:'Message',exact:true}).click();await bob.getByText('See you at the entrance',{exact:true}).waitFor();
  await bob.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await bob.screenshot({path:new URL('private-chat.png',evidence).pathname,fullPage:true});
  await alice.getByRole('button',{name:'Nearby',exact:true}).click();await alice.getByRole('button',{name:'Stop location sharing'}).click();await alice.getByText('Location hidden',{exact:true}).waitFor();
  await alice.getByRole('button',{name:'Connections',exact:true}).click();await alice.getByRole('button').filter({hasText:'bob'}).waitFor();
  assert.deepEqual(errors,[]);console.log('Two browser contexts: landmark meetup, explicit QR-link follow, mutual private chat, Stop, saved connection PASS');
}catch(error){if(browser){for(const [i,page] of browser.contexts().flatMap(c=>c.pages()).entries()){await page.screenshot({path:new URL('failure-'+i+'.png',evidence).pathname,fullPage:true}).catch(()=>{});console.log((await page.locator('body').innerText().catch(()=>'' )).slice(-1800))}}throw error}finally{await browser?.close();await app.close()}
