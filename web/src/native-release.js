const checksum=value=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value);
const advisoryIds=['GHSA-86w9-cpqp-85rv','GHSA-vfj7-8cjw-p6xm'];
export function androidSecurityDisposition(a,now=Date.now()){
 if(a?.securityGatePassed===true)return 'passed';
 const d=a?.releaseSecurityDecision;
 if(a?.securityGatePassed!==false||d?.status!=='accepted-residual-risk'||d.auditStatus!=='fail'||
   d.sourceCommit!==a.sourceCommit||d.apkSha256!==a.sha256||!checksum(d.auditSha256)||typeof d.approvedAt!=='string'||typeof d.expiresAt!=='string'||
   !Array.isArray(d.advisories)||JSON.stringify([...d.advisories].sort())!==JSON.stringify(advisoryIds))return null;
 const approved=Date.parse(d.approvedAt),expires=Date.parse(d.expiresAt);
 if(!Number.isFinite(now)||!Number.isFinite(approved)||!Number.isFinite(expires)||approved>now||expires<=now||expires<=approved||expires-approved>30*86400000)return null;
 try{
  const url=new URL(d.recordUrl);
  if(url.origin!=='https://github.com'||url.username||url.password||url.search||url.hash||
    !/^\/MKVEERENDRA\/Devcon-follow\/blob\/[a-f0-9]{40}\/docs\/releases\/[A-Za-z0-9_-]+\.md$/.test(url.pathname))return null;
 }catch{return null}
 // This is operator-published evidence, not an approval created by the browser.
 // The human decision and record must be verified before publishing a manifest.
 return 'accepted-residual-risk';
}
function secureUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.search}catch{return false}}
function productionApi(value){
 if(!secureUrl(value))return false;
 const u=new URL(value);
 return u.origin===value&&!/staging|preview|sandbox/i.test(u.hostname)&&u.hostname!=='localhost'&&!u.hostname.endsWith('.localhost')&&!u.hostname.endsWith('.local')&&!/^[\d.]+$/.test(u.hostname)&&!u.hostname.includes(':');
}
function releaseAsset(value){
 if(!secureUrl(value))return false;
 const u=new URL(value);
 return u.origin==='https://github.com'&&/^\/MKVEERENDRA\/Devcon-follow\/releases\/download\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.apk$/.test(u.pathname);
}
export function androidRelease(manifest,now=Date.now()){
 const a=manifest?.schemaVersion===1?manifest.android:null;
 // Missing/incomplete evidence never becomes an install link.
 if(!a||a.verified!==true||a.kind!=='apk'||a.distribution!=='public-release'||!productionApi(a.apiBaseUrl)||!androidSecurityDisposition(a,now)||
  a.delivery!=='binary'||!Number.isFinite(Date.parse(a.downloadVerifiedAt))||
  a.packageId!=='com.proofofaudits.devconfollow'||!releaseAsset(a.downloadUrl)||new URL(a.downloadUrl).pathname.split('/')[5]!=='v'+a.version||!checksum(a.sha256)||!checksum(a.signingCertificateSha256)||
  !/^[a-f0-9]{40}$/i.test(a.sourceCommit)||!a.buildId||typeof a.version!=='string'||!Number.isInteger(a.versionCode)||a.versionCode<1)return null;
 return a;
}
export function iosRelease(manifest){
 const i=manifest?.schemaVersion===1?manifest.ios:null;
 if(!i||i.verified!==true||i.kind!=='testflight')return null;
 try{const u=new URL(i.downloadUrl);return u.protocol==='https:'&&u.hostname==='testflight.apple.com'&&u.pathname.startsWith('/join/')&&!u.search&&!u.hash&&!u.username&&!u.password?i:null}catch{return null}
}
