import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {startTestRuntime} from '../test/support/runtime.js';
// This checks authenticated delivery and browser recovery using synthetic bytes,
// not APK installation or genuine provider acceptance.
const actualDirectory=process.argv.find(v=>v.startsWith('--release-directory='))?.slice('--release-directory='.length);
const directory=actualDirectory||await mkdtemp(join(tmpdir(),'devcon-browser-apk-'));
const bytes=actualDirectory?await readFile(join(directory,'devcon-follow.apk')):Buffer.concat([Buffer.from('PK'),Buffer.alloc(10000,7)]);
const metadata=actualDirectory?JSON.parse(await readFile(join(directory,'android.json'),'utf8')):{kind:'apk',packageId:'com.proofofaudits.devconfollow',version:'0.3.1',versionCode:2,buildId:'6583ca87-7174-4907-8c8b-df10c38ceee9',sourceCommit:'a'.repeat(40),sha256:createHash('sha256').update(bytes).digest('hex'),signingCertificateSha256:'b'.repeat(64),sizeBytes:bytes.length,standaloneBundle:true,debuggable:false,apiBaseUrl:'https://devcon-follow-api-staging.up.railway.app'};
if(!actualDirectory){await writeFile(join(directory,'devcon-follow.apk'),bytes);await writeFile(join(directory,'android.json'),JSON.stringify(metadata))}
const app=await startTestRuntime({config:{NODE_ENV:'test',ANDROID_PREVIEW_DIRECTORY:directory,COMMUNITY_SELF_SERVICE_ENABLED:'true',COMMUNITY_REGISTRATION_MODE:'pilot',COMMUNITY_PILOT_EMAILS:'alice@example.test',COMMUNITY_ACCESS_ENABLED:'false'}});let browser;
try{
 browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(app.origin+'/install.html');await page.getByRole('button',{name:'Sign in for private Android testing'}).click();
 await page.getByLabel('Email').fill('alice@example.test');await page.getByLabel('Password').fill('sandbox-alice');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 const download=page.getByRole('button',{name:'Download private Android APK',exact:true});await download.waitFor();assert.equal(new URL(page.url()).pathname,'/install.html');
 const saved=page.waitForEvent('download',{timeout:90000});await download.click();const received=await saved;
 assert.equal(received.suggestedFilename(),`devcon-follow-${metadata.version}-${metadata.versionCode}.apk`);assert.deepEqual(await readFile(await received.path()),bytes);
 if(!actualDirectory){await page.route('**/v1/releases/android/apk',r=>r.fulfill({status:200,contentType:'text/html',body:'<html>Login required</html>'}));await download.click();await page.getByRole('alert').filter({hasText:'The server did not return an APK.'}).waitFor();
 await page.unroute('**/v1/releases/android/apk');await page.route('**/v1/releases/android/apk',r=>r.fulfill({status:200,contentType:'application/vnd.android.package-archive',body:Buffer.alloc(bytes.length,1)}));await download.click();await page.getByRole('alert').filter({hasText:'Download checksum did not match.'}).waitFor();
 await page.unroute('**/v1/releases/android/apk');await page.reload();await download.waitFor()}
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations.map(v=>v.id),[]);
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await mkdir('artifacts/install',{recursive:true});await page.screenshot({path:'artifacts/install/private-sandbox-large-text.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log(actualDirectory?`PASS: actual ${metadata.version}/${metadata.versionCode} signed APK bytes downloaded through authenticated sandbox browser transport; SHA-256 ${metadata.sha256}. Not genuine-provider or physical-device acceptance.`:'PASS: sandbox PKCE sign-in returns to installer; authenticated binary download and checksum, HTML/tamper rejection, session restoration, axe and large text. Synthetic transport evidence only.');
}finally{await browser?.close();await app.close();if(!actualDirectory)await rm(directory,{recursive:true,force:true})}
