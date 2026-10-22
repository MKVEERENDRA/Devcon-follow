import {createReadStream} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const unavailable=()=>Object.assign(new Error('Private Android preview unavailable'),{statusCode:503});
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

// The operator packages SDK-verified bytes outside the web root. Never accept
// a request-supplied file path or redirect to an unprotected artifact CDN.
export async function registerAndroidPreview(app,{config,requireUser,authenticate}){
  let release=null,file;
  if(config.APP_ENVIRONMENT==='staging'||config.RAILWAY_ENVIRONMENT_NAME==='staging'||config.NODE_ENV==='test'){
    try{
      const expectedApi=config.ANDROID_PREVIEW_API_ORIGIN||'https://devcon-follow-api-staging.up.railway.app';
      const origin=new URL(expectedApi);
      if(origin.protocol!=='https:'||origin.origin!==expectedApi||origin.username||origin.password)throw unavailable();
      const directory=resolve(config.ANDROID_PREVIEW_DIRECTORY||'private-release');
      const data=JSON.parse(await readFile(resolve(directory,'android.json'),'utf8'));
      file=resolve(directory,'devcon-follow.apk');
      if(data.kind!=='apk'||data.packageId!=='com.proofofaudits.devconfollow'||data.debuggable!==false||data.standaloneBundle!==true||
        !digest(data.sha256)||!digest(data.signingCertificateSha256)||!/^\d+\.\d+\.\d+$/.test(data.version)||
        !Number.isInteger(data.versionCode)||data.versionCode<1||!Number.isInteger(data.sizeBytes)||data.sizeBytes<10000||
        !/^[a-f0-9]{40}$/.test(data.sourceCommit)||!/^[a-f0-9-]{36}$/.test(data.buildId)||
        data.apiBaseUrl!==expectedApi)throw unavailable();
      if((await stat(file)).size!==data.sizeBytes)throw unavailable();
      const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);
      if(hash.digest('hex')!==data.sha256)throw unavailable();
      release={kind:'apk',packageId:data.packageId,version:data.version,versionCode:data.versionCode,
        buildId:data.buildId,sha256:data.sha256,signingCertificateSha256:data.signingCertificateSha256,
        sourceCommit:data.sourceCommit,sizeBytes:data.sizeBytes,distribution:'restricted-staging',
        filename:`devcon-follow-${data.version}-${data.versionCode}.apk`,
        rangeChunkBytes:4*1024*1024,securityStatus:'blocked-public-release',downloadPath:'/v1/releases/android/apk'};
    }catch{/* Missing or inconsistent artifacts fail closed without logging local paths. */}
  }
  // Account enrollment and distribution of a security-blocked native candidate
  // are separate policies. Opening web signup must not silently publish the APK.
  const previewEmails=new Set((config.ANDROID_PREVIEW_EMAILS||config.COMMUNITY_PILOT_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean));
  const authorize=async req=>{
    const actor=await requireUser(req);
    if(config.COMMUNITY_REGISTRATION_MODE==='public'&&(!actor.email||!previewEmails.has(actor.email)))throw Object.assign(new Error('This Android candidate is limited to its approved testers. You can use the web app with your account.'),{statusCode:403});
    if(!release)throw unavailable();
  };
  app.get('/v1/releases/android',{preHandler:authorize},async()=>release);
  app.get('/v1/releases/android/apk',{preHandler:authorize,config:{rateLimit:{max:req=>req.headers.range?60:3,timeWindow:'1 minute',keyGenerator:async req=>{let actor;try{actor=await authenticate(req);req.authActor=actor}catch{}return JSON.stringify([actor?.userId||req.ip,req.headers.range?'part':'full'])}}}},async(req,reply)=>{
    reply.header('Content-Type','application/vnd.android.package-archive');
    reply.header('Content-Disposition',`attachment; filename="${release.filename}"`);
    reply.header('Cache-Control','private, no-store');
    reply.header('Accept-Ranges','bytes');reply.header('ETag','"'+release.sha256+'"');
    if(req.headers['if-match']&&req.headers['if-match']!=='"'+release.sha256+'"')return reply.code(412).type('application/json').send({error:'Android release changed. Refresh the installer.'});
    if(req.headers.range){
      const match=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range),start=Number(match?.[1]),end=Number(match?.[2]);
      if(!match||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||end>=release.sizeBytes||end-start+1>release.rangeChunkBytes){reply.header('Content-Range','bytes */'+release.sizeBytes);return reply.code(416).type('application/json').send({error:'A single bounded APK byte range is required'});}
      reply.code(206).header('Content-Range',`bytes ${start}-${end}/${release.sizeBytes}`).header('Content-Length',end-start+1);
      return reply.send(createReadStream(file,{start,end}));
    }
    reply.header('Content-Length',release.sizeBytes);
    return reply.send(createReadStream(file));
  });
}
