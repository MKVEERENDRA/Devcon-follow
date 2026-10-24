import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {startTestRuntime} from '../test/support/runtime.js';
const app=await startTestRuntime({config:{OIDC_GOOGLE_CONNECTION:'google-oauth2',COMMUNITY_SELF_SERVICE_ENABLED:'true',COMMUNITY_REGISTRATION_MODE:'public'}});
let browser;
try{
 browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();await page.goto(app.origin);
 await page.getByRole('button',{name:'Continue with Google',exact:true}).click();
 await page.getByLabel('Email',{exact:true}).waitFor();
 const request=new URL(page.url());assert.equal(request.searchParams.get('audience'),'devcon-test-api');assert.equal(request.searchParams.get('connection'),'google-oauth2');assert.equal(request.searchParams.get('code_challenge_method'),'S256');
 await page.route('**/v1/me',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Authentication required'})}));
 await page.getByLabel('Email',{exact:true}).fill('alice@example.test');await page.getByLabel('Password',{exact:true}).fill('sandbox-alice');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('heading',{name:'Could not load your account',exact:true}).waitFor();
 await page.getByRole('button',{name:'Sign in again',exact:true}).click();await page.getByLabel('Email',{exact:true}).waitFor();
 const recovery=new URL(page.url());assert.equal(recovery.searchParams.get('audience'),'devcon-test-api');assert.equal(recovery.searchParams.get('prompt'),'login');
 console.log('PASS: Google login preserves API audience + PKCE; rejected account token exposes reauthentication with audience.');
}finally{await browser?.close();await app.close()}
