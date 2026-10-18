import {createServer} from 'node:http';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {MongoClient} from 'mongodb';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {ensureIndexes} from '../../src/indexes.js';
import {buildServer} from '../../src/app.js';

// Isolated, loopback-only test issuer. Never imported by application runtime or Docker.
export async function startTestRuntime({config:overrides={}}={}){
  const mongo=await MongoMemoryServer.create();
  const client=new MongoClient(mongo.getUri());await client.connect();
  const db=client.db('test_'+randomUUID().replaceAll('-',''));await ensureIndexes(db);
  const {publicKey,privateKey}=await generateKeyPair('RS256');
  const jwk={...await exportJWK(publicKey),kid:'sandbox',alg:'RS256',use:'sig'};
  const audience='devcon-test-api',codes=new Map();let issuer,origin;
  const accounts={alice:{email:'alice@example.test',password:'sandbox-alice'},bob:{email:'bob@example.test',password:'sandbox-bob'},eve:{email:'eve@example.test',password:'sandbox-eve'}};
  async function sign(subject,{nonce,emailVerified=true,expiresIn='10m',customClaims={}}={}){
    return new SignJWT({email:accounts[subject]?.email||'admin@example.test',email_verified:emailVerified,...(nonce?{nonce}:{}),...customClaims})
      .setSubject(subject).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime(expiresIn).setProtectedHeader({alg:'RS256',kid:'sandbox'}).sign(privateKey);
  }
  const identity=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,issuer);
      res.setHeader('Access-Control-Allow-Origin',origin||'null');res.setHeader('Cache-Control','no-store');
      const json=value=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(value))};
      if(url.pathname==='/.well-known/openid-configuration')return json({issuer,authorization_endpoint:issuer+'authorize',token_endpoint:issuer+'token',jwks_uri:issuer+'jwks',end_session_endpoint:issuer+'logout',response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256'],token_endpoint_auth_methods_supported:['none'],code_challenge_methods_supported:['S256']});
      if(url.pathname==='/jwks')return json({keys:[jwk]});
      if(url.pathname==='/authorize'&&req.method==='GET'){
        // Store request parameters server-side rather than interpolating them into HTML.
        const flow=randomBytes(20).toString('hex');codes.set(flow,{params:url.searchParams,expiresAt:Date.now()+60_000});
        res.setHeader('content-type','text/html');return res.end(`<html><head><title>Sandbox sign-in</title></head><body><h1>Sandbox identity provider</h1><form method="POST" action="/authorize"><input type="hidden" name="flow" value="${flow}"><label>Email<input name="email" type="email" required></label><label>Password<input name="password" type="password" required></label><button>Sign in</button></form></body></html>`);
      }
      if(req.method==='POST'){
        let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>10000)throw Error('Body too large')}
        const form=new URLSearchParams(raw);
        if(url.pathname==='/authorize'){
          const flow=codes.get(form.get('flow'));codes.delete(form.get('flow'));
          const subject=Object.keys(accounts).find(id=>accounts[id].email===form.get('email')&&accounts[id].password===form.get('password'));
          if(!flow||flow.expiresAt<Date.now()||!subject){res.writeHead(401);return res.end('Invalid sandbox login')}
          const p=flow.params,redirect=p.get('redirect_uri');
          if(redirect!==origin+'/'||p.get('client_id')!=='sandbox-web'||p.get('code_challenge_method')!=='S256')throw Error('Invalid authorization request');
          const code=randomBytes(24).toString('base64url');codes.set(code,{subject,redirect,challenge:p.get('code_challenge'),nonce:p.get('nonce'),expiresAt:Date.now()+60_000});
          const destination=new URL(redirect);destination.searchParams.set('code',code);destination.searchParams.set('state',p.get('state'));
          res.writeHead(302,{location:destination.href});return res.end();
        }
        if(url.pathname==='/token'){
          const code=codes.get(form.get('code'));codes.delete(form.get('code'));
          if(!code||code.expiresAt<Date.now()||form.get('client_id')!=='sandbox-web'||form.get('redirect_uri')!==code.redirect||createHash('sha256').update(form.get('code_verifier')||'').digest('base64url')!==code.challenge){res.writeHead(400);return json({error:'invalid_grant'})}
          const access_token=await sign(code.subject),id_token=await new SignJWT({email:accounts[code.subject].email,email_verified:true,name:code.subject,nonce:code.nonce}).setSubject(code.subject).setIssuer(issuer).setAudience('sandbox-web').setIssuedAt().setExpirationTime('10m').setProtectedHeader({alg:'RS256',kid:'sandbox'}).sign(privateKey);
          return json({access_token,id_token,token_type:'Bearer',expires_in:600,scope:'openid profile email'});
        }
      }
      if(url.pathname==='/logout'){res.writeHead(302,{location:origin+'/'});return res.end()}
      res.writeHead(404);res.end();
    }catch{res.writeHead(400);res.end('Invalid sandbox request')}
  });
  await new Promise(resolve=>identity.listen(0,'127.0.0.1',resolve));issuer=`http://127.0.0.1:${identity.address().port}/`;
  const config={LOG_LEVEL:'silent',OIDC_ISSUER:issuer,OIDC_JWKS_URL:issuer+'jwks',OIDC_AUDIENCE:audience,WEB_OIDC_CLIENT_ID:'sandbox-web',ADMIN_SUBJECTS:'admin',COMMUNITY_ACCESS_ENABLED:'true',COMMUNITY_INVITE_HMAC_KEY:randomBytes(32).toString('hex'),PROXIMITY_TOKEN_HMAC_KEY:randomBytes(32).toString('hex'),...overrides};
  const {server,io}=await buildServer({db,config});await server.listen({port:0,host:'127.0.0.1'});origin=`http://127.0.0.1:${server.server.address().port}`;
  const request=async(subject,path,method='GET',body)=>{
    const response=await fetch(origin+path,{method,headers:{authorization:'Bearer '+await sign(subject),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    return {status:response.status,body:await response.json()};
  };
  return {db,origin,issuer,request,sign,config,async close(){io.disconnectSockets(true);await new Promise(resolve=>io.close(resolve));await server.close();await new Promise(resolve=>identity.close(resolve));await db.dropDatabase();await client.close();await mongo.stop()}};
}
