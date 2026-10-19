const checksum=value=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value);
function secureUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.search}catch{return false}}
export function androidRelease(manifest){
 const a=manifest?.schemaVersion===1?manifest.android:null;
 // Missing/incomplete evidence never becomes an install link.
 if(!a||a.verified!==true||a.kind!=='apk'||a.distribution!=='private-preview'||a.packageId!=='com.proofofaudits.devconfollow'||!secureUrl(a.downloadUrl)||!checksum(a.sha256)||!checksum(a.signingCertificateSha256)||!a.buildId||typeof a.version!=='string'||!Number.isInteger(a.versionCode)||a.versionCode<1)return null;
 return a;
}
export function iosRelease(manifest){
 const i=manifest?.schemaVersion===1?manifest.ios:null;
 if(!i||i.verified!==true||i.kind!=='testflight')return null;
 try{const u=new URL(i.downloadUrl);return u.protocol==='https:'&&u.hostname==='testflight.apple.com'&&u.pathname.startsWith('/join/')&&!u.search&&!u.hash&&!u.username&&!u.password?i:null}catch{return null}
}
