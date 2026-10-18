import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {createAuth} from '../src/auth.js';
import {startTestRuntime} from './support/runtime.js';
const namespace='https://devcon-follow.vercel.app/claims';
const action=createRequire(import.meta.url)('../deploy/auth0/verified-email.cjs');

test('Auth0 Action copies canonical verification, never user metadata',async()=>{
  for(const verified of [true,false,undefined,'true']){
    const claims={};
    await action.onExecutePostLogin({user:{email:'User@example.test',email_verified:verified,user_metadata:{email_verified:true}}},{accessToken:{setCustomClaim:(key,value)=>{claims[key]=value}}});
    assert.equal(claims[namespace+'/email'],'User@example.test');
    assert.equal(claims[namespace+'/email_verified'],verified===true);
    assert.equal(claims.email,undefined);
  }
});

test('OIDC namespaced email remains bound to a valid API JWT',async t=>{
  const {publicKey,privateKey}=await generateKeyPair('RS256');
  const jwk={...await exportJWK(publicKey),kid:'auth-provider-test',alg:'RS256',use:'sig'};
  const server=createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({keys:[jwk]}))});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const issuer=`http://127.0.0.1:${server.address().port}/`,audience='devcon-api';
  const auth=createAuth({issuer,audience,jwksUrl:issuer+'jwks',emailClaimNamespace:namespace});
  const signed=(claims,overrides={})=>new SignJWT(claims).setSubject('real-provider-subject').setIssuer(overrides.issuer||issuer).setAudience(overrides.audience||audience).setIssuedAt().setExpirationTime(overrides.expiry||'5m').setProtectedHeader({alg:'RS256',kid:jwk.kid}).sign(privateKey);
  const valid={[namespace+'/email']:'Attendee@Example.test',[namespace+'/email_verified']:true};
  assert.equal((await auth(await signed(valid))).email,'attendee@example.test');
  for(const claims of [
    {email:'attacker@example.test',email_verified:true},
    {[namespace+'/email']:'attendee@example.test',email_verified:true},
    {[namespace+'/email']:'attendee@example.test',[namespace+'/email_verified']:'true'},
    {[namespace+'/email']:'attendee@example.test',[namespace+'/email_verified']:false},
    {[namespace+'/email']:'not an email',[namespace+'/email_verified']:true}
  ])assert.equal((await auth(await signed(claims))).email,null);
  await assert.rejects(auth(await signed(valid,{audience:'web-client-id'})));
  await assert.rejects(auth(await signed(valid,{issuer:'https://another-tenant.example/'})));
  await assert.rejects(auth(await signed(valid,{expiry:'-1m'})));
});

test('OIDC namespace configuration rejects unsafe and ambiguous identifiers',()=>{
  for(const emailClaimNamespace of ['http://example.test/claims','https://user:password@example.test/claims','https://example.test/claims?q=1','https://example.test/claims#email']){
    assert.throws(()=>createAuth({emailClaimNamespace}));
  }
});

test('Auth0-shaped API token binds a community invitation to verified canonical email',async t=>{
  const app=await startTestRuntime({config:{OIDC_EMAIL_CLAIM_NAMESPACE:namespace}});
  t.after(()=>app.close());
  const invitation=await app.request('admin','/v1/admin/invitations','POST',{email:'alice@example.test'});
  assert.equal(invitation.status,201);
  async function redeem(customClaims){
    return fetch(app.origin+'/v1/access/redeem',{method:'POST',headers:{authorization:'Bearer '+await app.sign('alice',{customClaims}),'content-type':'application/json'},body:JSON.stringify({code:invitation.body.code})});
  }
  // The standard verified claim cannot override an unverified namespaced pair.
  assert.equal((await redeem({[namespace+'/email']:'alice@example.test',[namespace+'/email_verified']:false})).status,403);
  assert.equal((await redeem({[namespace+'/email']:'bob@example.test',[namespace+'/email_verified']:true})).status,409);
  const claims={};
  await action.onExecutePostLogin({user:{email:'alice@example.test',email_verified:true}},{accessToken:{setCustomClaim:(k,v)=>{claims[k]=v}}});
  const accepted=await redeem(claims);
  assert.equal(accepted.status,200);
  assert.equal((await accepted.json()).officiallyVerified,false);
});
