// Private localhost view of the EXISTING built app against the real staging API.
// Public registration stays disabled. Tokens are forwarded, never stored/logged.
import {createServer} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {request as httpRequest} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createAuth,tokenFromHeader} from '../src/auth.js';

const STAGING='https://devcon-follow-api-staging.up.railway.app';
const settings=JSON.parse(await readFile(new URL('../deploy/auth0/public-settings.json',import.meta.url),'utf8'));
const auth=createAuth({issuer:settings.OIDC_ISSUER,jwksUrl:settings.OIDC_JWKS_URL,audience:settings.OIDC_AUDIENCE,emailClaimNamespace:settings.OIDC_EMAIL_CLAIM_NAMESPACE});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
export async function startStagingPreview({port=4173,upstream=STAGING,root=resolve('web/dist'),verify=auth,adminEmail=process.env.PILOT_ADMIN_EMAIL}={}){
  const target=new URL(upstream),identities=new Map(),connections=new Set();
  if(!['https:','http:'].includes(target.protocol)||target.username||target.password||target.pathname!=='/')throw Error('Invalid upstream');
  let origin;
  const allowed=req=>req.headers.host===new URL(origin).host&&(!req.headers.origin||req.headers.origin===origin);
  const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value))};
  const server=createServer(async(req,res)=>{
    if(!allowed(req))return send(res,403,{error:'Local origin required'});
    try{
      const url=new URL(req.url,origin);
      if(!req.url.startsWith('/')||req.url.startsWith('//')||url.origin!==origin)return send(res,400,{error:'Local path required'});
      if(url.pathname==='/__acceptance')return send(res,200,{publicRegistrationEnabled:false,identities:[...identities.values()]});
      if(url.pathname==='/client-config'){
        const r=await fetch(new URL('/client-config',target),{signal:AbortSignal.timeout(10000)});
        if(!r.ok)return send(res,503,{authReady:false});
        const cfg=await r.json();
        if(cfg.issuer!==settings.OIDC_ISSUER||cfg.clientId!==settings.WEB_OIDC_CLIENT_ID||cfg.audience!==settings.OIDC_AUDIENCE)return send(res,503,{authReady:false});
        return send(res,200,{...cfg,authReady:true}); // localhost only, exact callback already allowlisted
      }
      if(url.pathname.startsWith('/v1/')||url.pathname.startsWith('/socket.io/')||url.pathname.startsWith('/health/')){
        const headers={...req.headers,host:target.host,origin:target.origin};delete headers.cookie;
        const upstreamRequest=(target.protocol==='https:'?httpsRequest:httpRequest)(new URL(url.pathname+url.search,target),{method:req.method,headers},async response=>{
          // The real API must accept the JWT before identity evidence is recorded.
          if(req.method==='GET'&&url.pathname==='/v1/me'&&response.statusCode===200){
            const chunks=[];for await(const chunk of response)chunks.push(chunk);const body=Buffer.concat(chunks);
            try{
              const me=JSON.parse(body.toString()),actor=await verify(tokenFromHeader(req.headers.authorization));
              if(actor.userId===me.userId){
                const evidence={subject:actor.userId,verifiedEmail:Boolean(actor.email),intendedAdmin:!!adminEmail&&actor.email===adminEmail.toLowerCase(),apiAuthenticated:true,accessTier:me.accessTier,officiallyVerified:me.officiallyVerified};
                if(me.accessTier==='pending'&&!identities.has(actor.userId)){
                  evidence.pendingPrivacyChecks={};
                  for(const path of ['/v1/directory','/v1/nearby','/v1/following','/v1/admin/status']){
                    const check=await fetch(new URL(path,target),{headers:{Authorization:req.headers.authorization},signal:AbortSignal.timeout(10000)});
                    evidence.pendingPrivacyChecks[path]=check.status;
                    await check.arrayBuffer();
                  }
                }else if(identities.has(actor.userId))evidence.pendingPrivacyChecks=identities.get(actor.userId).pendingPrivacyChecks;
                identities.set(actor.userId,evidence);
              }
            }catch{} // No token/PII errors are logged.
            res.writeHead(response.statusCode,{...response.headers,'cache-control':'no-store'});return res.end(body);
          }
          res.writeHead(response.statusCode,{...response.headers,'cache-control':'no-store'});response.pipe(res);
        });
        upstreamRequest.on('error',()=>send(res,502,{error:'Staging unavailable'}));req.pipe(upstreamRequest);return;
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed'});
      let file=resolve(root,'.'+decodeURIComponent(url.pathname));
      if(file!==root&&!file.startsWith(root+'/'))return send(res,400,{error:'Invalid path'});
      if(url.pathname==='/'||!extname(file))file=resolve(root,'index.html');
      const body=await readFile(file);
      res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:body);
    }catch{send(res,404,{error:'Not available'})}
  });
  server.on('connection',socket=>{connections.add(socket);socket.on('close',()=>connections.delete(socket))});
  server.on('upgrade',(req,socket,head)=>{
    const url=new URL(req.url,origin);
    if(!allowed(req)||!req.url.startsWith('/socket.io/')||url.origin!==origin)return socket.destroy();
    const headers={...req.headers,host:target.host,origin:target.origin};delete headers.cookie;
    const remote=(target.protocol==='https:'?httpsRequest:httpRequest)(new URL(url.pathname+url.search,target),{headers});
    remote.on('upgrade',(res,peer,remoteHead)=>{
      socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(res.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')}\r\n\r\n`);
      if(remoteHead.length)socket.write(remoteHead);if(head.length)peer.write(head);
      socket.pipe(peer).pipe(socket);socket.on('error',()=>peer.destroy());peer.on('error',()=>socket.destroy());
    });remote.on('response',()=>socket.destroy());remote.on('error',()=>socket.destroy());remote.end();
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});
  origin=`http://localhost:${server.address().port}`;
  return {origin,server,close:()=>new Promise(resolve=>{server.close(resolve);for(const socket of connections)socket.destroy()})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const preview=await startStagingPreview();
  console.log('Private staging login view: '+preview.origin);
  console.log('Existing frontend → real staging API. Public registration remains disabled.');
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await preview.close();process.exit(0)});
}
