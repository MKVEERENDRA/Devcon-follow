import {profileUrl} from '../mobile/profile-links.js';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {startTestRuntime} from '../test/support/runtime.js';
const community=process.argv.includes('--community');
const app=await startTestRuntime({onSandboxError:error=>{if(!error.status||error.status>=500)console.log('SANDBOX API ERROR',JSON.stringify(error))},config:community?{COMMUNITY_SELF_SERVICE_ENABLED:'true',COMMUNITY_REGISTRATION_MODE:'public',COMMUNITY_ACCESS_ENABLED:'false'}:{}});let browser;
const evidence=new URL(community?'../artifacts/browser-community/':'../artifacts/browser/',import.meta.url);await mkdir(evidence,{recursive:true});
try{
  const invites={};
  if(!community)for(const id of ['alice','bob']){
    const r=await app.request('admin','/v1/admin/invitations','POST',{email:id+'@example.test'});assert.equal(r.status,201);invites[id]=r.body.code;
  }
  const point={lat:19.01,lon:72.85,accuracyMeters:10};
  const venue=await app.request('admin','/v1/admin/venues','POST',{name:'SANDBOX event',...point,radiusMeters:300,startAt:new Date(Date.now()-60000).toISOString(),endAt:new Date(Date.now()+3600000).toISOString(),enabled:true});
  const landmark=await app.request('admin','/v1/admin/landmarks','POST',{venueId:venue.body.venueId,name:'SANDBOX entrance',lat:point.lat,lon:point.lon});assert.equal(landmark.status,201);
  browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox']});
  const pages={},errors=[],counts={};
  for(const id of ['alice','bob']){
    const context=await browser.newContext({permissions:['geolocation'],geolocation:{latitude:point.lat,longitude:point.lon,accuracy:10},viewport:{width:390,height:844},timezoneId:'Asia/Kolkata'});
    const page=await context.newPage();pages[id]=page;counts[id]={};page.on('request',r=>{const path=new URL(r.url()).pathname;if(path.startsWith('/v1/'))counts[id][path]=(counts[id][path]||0)+1});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/admin/status'))console.log('HTTP',r.status(),new URL(r.url()).pathname,JSON.stringify(counts[id]))});
    await page.goto(app.origin);await page.getByRole('button',{name:'Get started'}).click();
    await page.getByLabel('Email').fill(id+'@example.test');await page.getByLabel('Password').fill('sandbox-'+id);await page.getByRole('button',{name:'Sign in',exact:true}).click();
    if(!community){await page.getByLabel('Invitation code').fill(invites[id]);await page.getByRole('button',{name:'Accept community invitation'}).click()}
    else {await page.getByLabel('Display name',{exact:true}).waitFor();assert.equal(await page.getByLabel('Invitation code').count(),0)}
    await page.getByLabel('Display name',{exact:true}).fill(id);await page.getByLabel('Username',{exact:true}).fill(id);await page.getByLabel('Who would you like to meet?').fill(id==='bob'?'Protocol security researchers':'Founders building developer tools');if(id==='bob')await page.getByLabel('Open to meetup requests',{exact:true}).check();await page.getByLabel('Interests (comma-separated)',{exact:true}).fill(id==='alice'?'Ethereum, Security':'Ethereum, ZK');await page.getByLabel('Make my profile discoverable').check();if(community)await page.getByRole('checkbox',{name:'Include me in the event directory'}).check();if(id==='bob')await page.getByRole('button',{name:'Founder',exact:true}).click();await page.getByRole('button',{name:'Save profile'}).click();
    if(!community){
      await page.getByRole('button',{name:'Check in with location'}).click();await page.getByText('Venue check-in active',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Nearby',exact:true}).click();await page.getByRole('button',{name:'Enable sharing'}).click();await page.getByRole('button',{name:'Stop location sharing'}).waitFor();
    }
    console.log(id+': browser OIDC authorization-code + PKCE, community access and profile PASS');
  }
  const alice=pages.alice,bob=pages.bob;
  if(community){
    assert.equal(await app.db.collection('presence').countDocuments(),0,'signup does not check either person in');
    assert.equal(await app.db.collection('shares').countDocuments(),0,'signup does not turn on discovery');
    await alice.getByRole('button',{name:'Refresh attendees',exact:true}).click();
    await alice.getByRole('button',{name:'View profile',exact:true}).click();
    await alice.getByText('Looking to meet:',{exact:false}).waitFor();
    assert.equal(await alice.getByRole('button',{name:'Arrange a meetup',exact:true}).isDisabled(),true);
    await alice.screenshot({path:new URL('prearrival-profile.png',evidence).pathname,fullPage:true});
    await alice.getByRole('button',{name:'Back',exact:true}).click();
    for(const [id,page] of Object.entries(pages)){
      await page.getByRole('button',{name:'Discover',exact:true}).click();
      await page.getByRole('button',{name:'Check in with location'}).click();await page.getByText('Venue check-in active',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Nearby',exact:true}).click();await page.getByRole('button',{name:'Enable sharing'}).click();await page.getByRole('button',{name:'Stop location sharing'}).waitFor();
      const share=await app.db.collection('shares').findOne({userId:id});
      assert(Math.abs(Date.parse(share.expiresAt)-Date.now()-1800000)<10000,'discovery has the server-issued 30-minute lifetime');
    }
    console.log('Pre-arrival profile discovery → explicit venue arrival → separate 30-minute Nearby opt-in PASS');
  }
  await alice.getByRole('button',{name:'Discover',exact:true}).click();await alice.getByText('Shared interest: Ethereum',{exact:true}).waitFor();await alice.screenshot({path:new URL('recommendations.png',evidence).pathname,fullPage:true});await alice.getByRole('button',{name:'All attendees',exact:true}).click();await alice.getByRole('button',{name:'Suggested for you',exact:true}).click();await alice.getByText('Shared interest: Ethereum',{exact:true}).waitFor();await alice.getByRole('button',{name:'Nearby',exact:true}).click();
  await alice.getByRole('button',{name:'Refresh nearby'}).click();await alice.getByRole('radio',{name:'Nearby role: Investor',exact:true}).check();await alice.getByText('No matching nearby sharing profiles',{exact:true}).waitFor();await alice.getByRole('radio',{name:'Nearby role: Founder',exact:true}).check();await alice.getByRole('button').filter({hasText:'bob'}).last().click();console.log('Nearby Founder role filter includes active founder; Investor filter excludes nonmatches PASS');
  await alice.getByText('Looking to meet:',{exact:false}).waitFor();await alice.getByText('Open to meetup requests',{exact:true}).waitFor();
  await alice.screenshot({path:new URL('profile-intent.png',evidence).pathname,fullPage:true});
  // Capture the requested URL locally; never send synthetic coordinates to Maps.
  await alice.evaluate(()=>{window.__sandboxRoutes=[];window.open=url=>{window.__sandboxRoutes.push(url);return null}});
  await alice.getByRole('button',{name:'Navigate if permitted',exact:true}).click();
  assert.equal(await alice.evaluate(()=>window.__sandboxRoutes.length),0,'No route before individual consent');
  await alice.getByRole('button',{name:'Request location',exact:true}).click();
  await bob.getByRole('button',{name:'Meetups',exact:true}).click();
  await bob.getByText('Optional location requests',{exact:true}).click();
  await bob.bringToFront();
  await bob.context().setGeolocation({latitude:point.lat,longitude:point.lon,accuracy:10});
  await Promise.all([bob.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/decision')&&r.request().method()==='POST'&&r.ok()),bob.getByRole('button',{name:'Allow 15 min',exact:true}).click()]);
  await bob.getByText('Location available to this attendee for up to 15 minutes',{exact:true}).waitFor();
  await alice.getByRole('button',{name:'Navigate if permitted',exact:true}).click();
  await alice.waitForFunction(()=>window.__sandboxRoutes.length===1);
  const approvedRoute=new URL(await alice.evaluate(()=>window.__sandboxRoutes[0]));
  assert.equal(approvedRoute.origin,'https://www.google.com');assert.equal(approvedRoute.searchParams.get('destination'),point.lat+','+point.lon);assert.equal(approvedRoute.searchParams.get('travelmode'),'walking');
  await bob.bringToFront();await bob.getByRole('button',{name:'Nearby',exact:true}).click();await bob.getByRole('button',{name:'Stop location sharing',exact:true}).click();await bob.getByText('Location hidden',{exact:true}).waitFor();
  await alice.getByRole('button',{name:'Navigate if permitted',exact:true}).click();
  assert.equal(await alice.evaluate(()=>window.__sandboxRoutes.length),1,'Stop revokes the route grant');
  await bob.getByRole('button',{name:'Enable sharing',exact:true}).click();await bob.getByRole('button',{name:'Stop location sharing',exact:true}).waitFor();
  console.log('Individual GPS request → explicit 15-minute approval → walking route → Stop revokes route PASS');
  await alice.getByRole('button',{name:'Arrange a meetup'}).click();await alice.getByLabel('Why would you like to meet?').fill('Compare protocol audit evidence over coffee?');await alice.getByLabel('Meeting place').selectOption(landmark.body.landmark.landmarkId);
  const future=await alice.evaluate(()=>{const d=new Date(Date.now()+600000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)});await alice.getByLabel(/^Time/).fill(future);await alice.getByRole('button',{name:'Send meeting invitation'}).click();
  await bob.getByRole('button',{name:'Meetups',exact:true}).click();await Promise.all([bob.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/read')&&r.request().method()==='POST'),bob.getByRole('button',{name:'New meeting invitation',exact:true}).click()]);assert((await app.db.collection('meetingNotifications').findOne({userId:'bob',type:'pending'})).readAt,'persisted meeting alert is acknowledged only explicitly');await bob.getByText('Compare protocol audit evidence over coffee?',{exact:true}).waitFor();await bob.screenshot({path:new URL('meetup-reason.png',evidence).pathname,fullPage:true});await bob.getByRole('button',{name:'Accept meeting'}).click();await bob.getByRole('link',{name:'Directions to public landmark'}).waitFor();
  const calendarDownload=bob.waitForEvent('download');await bob.getByRole('button',{name:'Export calendar file',exact:true}).click();const calendar=await calendarDownload;const {readFile}=await import('node:fs/promises');const calendarText=await readFile(await calendar.path(),'utf8');assert(calendar.suggestedFilename().endsWith('.ics'));assert(calendarText.includes('BEGIN:VCALENDAR'));assert(calendarText.includes('SUMMARY:Meet alice'));assert(!calendarText.includes('Compare protocol audit evidence'),'meeting reason stays in the app');
  await bob.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await bob.screenshot({path:new URL('accepted-meetup.png',evidence).pathname,fullPage:true});
  await bob.getByRole('button',{name:'Cancel and propose another time'}).click();await bob.getByLabel('Why would you like to meet?').fill('Could we meet a little later?');await bob.getByLabel('Meeting place').selectOption(landmark.body.landmark.landmarkId);
  const later=await bob.evaluate(()=>{const d=new Date(Date.now()+900000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)});await bob.getByLabel(/^Time/).fill(later);await bob.getByRole('button',{name:'Send meeting invitation'}).click();await alice.getByRole('button',{name:'Meetups',exact:true}).click();await alice.getByText('Could we meet a little later?',{exact:true}).waitFor();await alice.getByRole('button',{name:'Accept meeting'}).click();await alice.getByRole('link',{name:'Directions to public landmark'}).waitFor();
  for(const [id,target] of [['alice','bob'],['bob','alice']]){
    const page=pages[id];await page.getByRole('button',{name:'Me',exact:true}).click();
    await page.getByRole('button',{name:"Scan someone's profile QR"}).click();await page.getByLabel('Paste a Devcon Follow profile link').fill(profileUrl(target));await page.getByRole('button',{name:'Open profile',exact:true}).click();
    await page.getByRole('button',{name:'Follow',exact:true}).click();await page.getByRole('button',{name:'Following',exact:true}).waitFor();
  }
  await alice.getByLabel('Private connection note').fill('Met at the sandbox entrance');await alice.getByRole('button',{name:'Save private note'}).click();await alice.getByText('Private note saved',{exact:true}).waitFor();
  assert.equal((await app.request('alice','/v1/connections/bob/note')).body.note,'Met at the sandbox entrance');assert.equal((await app.request('bob','/v1/connections/alice/note')).body.note,'');
  await alice.getByRole('button',{name:'Message',exact:true}).click();
  await alice.getByRole('textbox',{name:'Message',exact:true}).fill('See you at the entrance');await alice.getByRole('button',{name:'Send',exact:true}).click();
  await bob.getByRole('button',{name:'Message',exact:true}).click();await bob.getByText('See you at the entrance',{exact:true}).waitFor();
  await bob.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await bob.screenshot({path:new URL('private-chat.png',evidence).pathname,fullPage:true});
  await alice.getByRole('button',{name:'Nearby',exact:true}).click();await alice.getByRole('button',{name:'Stop location sharing'}).click();await alice.getByText('Location hidden',{exact:true}).waitFor();
  if(community){
    // Simulate departure on the disposable backend, then refresh through the UI.
    // The retained relationship must not depend on location or venue presence.
    assert.equal((await app.request('alice','/v1/presence','DELETE')).status,200);
    await alice.getByRole('button',{name:'Refresh',exact:true}).click();
    assert.equal((await app.request('alice','/v1/me')).body.onSite,false);
    assert.equal(await app.db.collection('shares').countDocuments({userId:'alice'}),0);
  }
  await alice.getByRole('button',{name:'Connections',exact:true}).click();await alice.getByRole('button').filter({hasText:'bob'}).waitFor();
  if(community){
    await alice.getByRole('button').filter({hasText:'bob'}).click();await alice.getByRole('button',{name:'Message',exact:true}).click();
    await alice.getByRole('textbox',{name:'Message',exact:true}).fill('Keep in touch after leaving the venue');await alice.getByRole('button',{name:'Send',exact:true}).click();
    await bob.getByText('Keep in touch after leaving the venue',{exact:true}).waitFor();
    console.log('After departure: no presence/sharing, saved connection and mutual chat remain usable PASS');
  }
  if(community){assert.equal(await app.db.collection('invitations').countDocuments(),0);assert.equal(await app.db.collection('tickets').countDocuments(),0)}
  assert.equal(await alice.evaluate(()=>window.__sandboxRoutes.length),1,'No late route can appear after consent revocation');
  assert.deepEqual(errors,[]);console.log('Two browser contexts: landmark meetup, explicit QR-link follow, mutual private chat, Stop, saved connection PASS');
}catch(error){if(browser){for(const [i,page] of browser.contexts().flatMap(c=>c.pages()).entries()){await page.screenshot({path:new URL('failure-'+i+'.png',evidence).pathname,fullPage:true}).catch(()=>{});console.log((await page.locator('body').innerText().catch(()=>'' )).slice(-1800))}}throw error}finally{await browser?.close();await app.close()}
