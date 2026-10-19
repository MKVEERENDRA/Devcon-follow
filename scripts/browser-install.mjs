import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
const root=resolve('web/dist'),folder=resolve('artifacts/install');await mkdir(folder,{recursive:true});
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+'/')){res.writeHead(404).end();return}try{const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(body)}catch{res.writeHead(404).end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();
 await page.route('**/client-config',r=>r.fulfill({json:{authReady:false}}));await page.goto(origin);await page.getByRole('link',{name:'Install app',exact:true}).click();await page.getByRole('button',{name:'Android preview unavailable'}).waitFor();assert(await page.getByRole('button',{name:'Android preview unavailable'}).isDisabled());assert(await page.getByRole('button',{name:'iPhone preview unavailable'}).isDisabled());assert.equal(await page.locator('a[href*=".apk"]').count(),0);
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations.map(v=>v.id),[]);
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:folder+'/install-'+width+'.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)}
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.setViewportSize({width:390,height:900});await page.screenshot({path:folder+'/install-large-text.png',fullPage:true});const overflowing=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,text:e.innerText?.slice(0,50)})));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,JSON.stringify(overflowing));
 // Synthetic metadata exercises link gating only; it is never published or downloaded as an APK.
 const android={verified:true,kind:'apk',distribution:'private-preview',packageId:'com.proofofaudits.devconfollow',downloadUrl:'https://expo.dev/artifacts/eas/synthetic-test-only.apk',sha256:'a'.repeat(64),signingCertificateSha256:'b'.repeat(64),buildId:'synthetic-test-only',version:'0.3.0',versionCode:1};
 await page.route('**/native-release.json',r=>r.fulfill({json:{schemaVersion:1,android,ios:null}}));await page.reload();const download=page.getByRole('link',{name:'Download private Android APK'});await download.waitFor();assert.equal(await download.getAttribute('href'),android.downloadUrl);assert(await page.getByRole('button',{name:'iPhone preview unavailable'}).isDisabled());
 await page.unroute('**/native-release.json');await page.route('**/native-release.json',r=>r.fulfill({status:503,body:'Unavailable'}));await page.reload();await page.getByRole('button',{name:'Try again'}).waitFor();assert.equal(await page.getByRole('link',{name:'Download private Android APK'}).count(),0);
 await page.unroute('**/native-release.json');await page.getByRole('button',{name:'Try again'}).click();await page.getByRole('button',{name:'Android preview unavailable'}).waitFor();
 console.log('PASS: native installation page, honest unavailable states, verified metadata gating, fetch failure/retry, narrow/large-text layouts and axe checks. No APK installation is simulated.');
}finally{await browser?.close();await new Promise(r=>server.close(r))}
