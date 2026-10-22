import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {startTestRuntime} from '../test/support/runtime.js';
const app=await startTestRuntime();let browser;
try{
 browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const external=[];
 page.on('request',request=>{if(new URL(request.url()).origin!==app.origin)external.push(request.url())});
 await page.goto(app.origin);await page.getByRole('heading',{name:'Meet the right people at Devcon'}).waitFor();
 const photos=page.locator('img[src^="/images/photography/"]');assert.equal(await photos.count(),3);
 for(const photo of await photos.all()){await photo.scrollIntoViewIfNeeded();await photo.evaluate(el=>el.decode());assert(await photo.evaluate(el=>el.naturalWidth===1200&&el.naturalHeight===800));assert(await photo.getAttribute('alt'))}
 assert.deepEqual(external,[],'Welcome photography must not make third-party image requests');
 assert.deepEqual((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[]);
 await mkdir('artifacts/photography',{recursive:true});await page.screenshot({path:'artifacts/photography/welcome-mobile.png',fullPage:true});
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.screenshot({path:'artifacts/photography/welcome-large-text.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width,text:e.textContent?.slice(0,80)})))));
 await page.setViewportSize({width:1280,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.screenshot({path:'artifacts/photography/welcome-desktop.png',fullPage:true});
 await page.goto(app.origin+'/photo-credits.html');assert.equal(await page.getByRole('heading',{name:'Photo credits',exact:true}).count(),1);assert.equal(await page.locator('a[href^="https://unsplash.com/photos/"]').count(),3);
 console.log('PASS: all three local photographs decode; no third-party requests; mobile, desktop, 200% text, WCAG axe and photo-credit page verified in sandbox.');
}finally{await browser?.close();await app.close()}
