const checksum=value=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value);
function secureUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.search}catch{return false}}
function releaseAsset(value){
 if(!secureUrl(value))return false;
 const u=new URL(value);
 return u.hostname==='github.com'&&/^\/MKVEERENDRA\/Devcon-follow\/releases\/download\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.apk$/.test(u.pathname);
}
export function androidRelease(manifest){
 const a=manifest?.schemaVersion===1?manifest.android:null;
 // Missing/incomplete evidence never becomes an install link.
 if(!a||a.verified!==true||a.kind!=='apk'||a.distribution!=='public-release'||a.securityGatePassed!==true||
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
