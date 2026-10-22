import {createReadStream} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const unavailable=()=>Object.assign(new Error('Private Android preview unavailable'),{statusCode:503});
const digest=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

// The operator packages SDK-verified bytes outside the web root. Never accept
// a request-supplied file path or redirect to an unprotected artifact CDN.
export async function registerAndroidPreview(app,{config,requireUser}){
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
        securityStatus:'blocked-public-release',downloadPath:'/v1/releases/android/apk'};
    }catch{/* Missing or inconsistent artifacts fail closed without logging local paths. */}
  }
  // Both routes recheck the existing verified-email cohort and revocation.
  const authorize=async req=>{await requireUser(req);if(!release)throw unavailable()};
  app.get('/v1/releases/android',{preHandler:authorize},async()=>release);
  app.get('/v1/releases/android/apk',{preHandler:authorize,config:{rateLimit:{max:3,timeWindow:'1 minute'}}},async(req,reply)=>{
    reply.header('Content-Type','application/vnd.android.package-archive');
    reply.header('Content-Disposition',`attachment; filename="${release.filename}"`);
    reply.header('Content-Length',release.sizeBytes);
    reply.header('Cache-Control','private, no-store');
    return reply.send(createReadStream(file));
  });
}
