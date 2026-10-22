import React,{useEffect,useRef,useState} from 'react';
import {useAuth} from 'react-oidc-context';
import {Download} from 'lucide-react';
import {androidDownloadUrl,readAndroidDownload} from './android-download.js';

export function PrivateAndroidDownload({apiOrigin}){
 const auth=useAuth(),[release,setRelease]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[checking,setChecking]=useState(false),[attempt,setAttempt]=useState(0),[verifiedFile,setVerifiedFile]=useState(null),[progress,setProgress]=useState(0);
 const active=useRef(null),subject=auth.user?.profile?.sub,token=auth.user?.access_token;
 useEffect(()=>{setVerifiedFile(null);return()=>active.current?.abort()},[subject,auth.isAuthenticated]);
 useEffect(()=>{
  if(!verifiedFile)return;
  const expiry=setTimeout(()=>setVerifiedFile(current=>current===verifiedFile?null:current),120000);
  return()=>{clearTimeout(expiry);URL.revokeObjectURL(verifiedFile.url)};
 },[verifiedFile]);
 useEffect(()=>{
  if(!token||!subject){setRelease(null);return}
  const abort=new AbortController();setChecking(true);setError('');setRelease(null);
  fetch('/v1/releases/android',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(15000)])})
   .then(async r=>{if(!r.ok)throw Error(r.status===403?'This account does not have community beta access yet.':r.status===401?'Your session expired. Sign in again.':'The Android download could not be loaded. Please try again.');const data=await r.json();if(data.downloadPath!=='/v1/releases/android/apk'||data.distribution!=='restricted-staging'||!/^[a-f0-9]{64}$/.test(data.sha256))throw Error('Build metadata could not be verified.');return data})
   .then(setRelease).catch(e=>{if(!abort.signal.aborted)setError(e.message)}).finally(()=>{if(!abort.signal.aborted)setChecking(false)});
  return()=>abort.abort();
 },[token,subject,attempt]);
 const download=async()=>{
  if(!release||busy)return;
  const abort=new AbortController();active.current=abort;let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;abort.abort()},600000);setProgress(0);setBusy(true);setError('');setVerifiedFile(null);
  try{
   const response=await fetch(androidDownloadUrl(release.downloadPath,apiOrigin),{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:abort.signal});
   if(!response.ok)throw Error(response.status===401?'Your session expired. Sign in again.':response.status===403?'This account does not have download access.':'Download failed. Please try again.');
   if(response.headers.get('content-type')?.split(';')[0]!=='application/vnd.android.package-archive')throw Error('The server did not return an APK.');
   const blob=await readAndroidDownload(response,release.sizeBytes,setProgress);
   if(blob.size!==release.sizeBytes)throw Error('Download was incomplete. Please try again.');
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');
   if(hash!==release.sha256)throw Error('Download checksum did not match. No file was saved.');
   if(abort.signal.aborted)return;
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   setVerifiedFile({url,filename:release.filename,subject});
   link.href=url;link.download=release.filename;document.body.appendChild(link);link.click();link.remove();
  }catch(e){if(timedOut)setError('Download timed out. Please try again.');else if(!abort.signal.aborted)setError(e.message)}finally{clearTimeout(timeout);if(active.current===abort){active.current=null;setBusy(false)}}
 };
 if(auth.isLoading)return <p role="status">Restoring your sign-in…</p>;
 if(!auth.isAuthenticated)return <><button className="button primary large full" disabled={Boolean(auth.activeNavigator)} onClick={()=>{setError('');auth.signinRedirect({state:{returnTo:'/install.html'}}).catch(()=>setError('Sign-in could not start. Please try again.'))}}>Sign in to install Android</button>{(error||auth.error)&&<p role="alert">{error||'Sign-in failed. Please try again.'}</p>}</>;
 return <>{checking?<p role="status">Checking your Android download…</p>:release?<><button className="button primary large full" disabled={busy} onClick={download}><Download size={18}/>{busy?`Downloading APK · ${progress}%`:'Download Android APK'}</button>{busy&&<><progress aria-label="Android APK download" max="100" value={progress}/><button className="text-button" onClick={()=>active.current?.abort()}>Cancel download</button></>}{verifiedFile?.subject===subject&&<div className="small"><p role="status">APK integrity checks passed. If your download did not start, save the checked file below. This link expires in two minutes.</p><a className="button secondary full" href={verifiedFile.url} download={verifiedFile.filename}>Save verified APK</a></div>}<p className="small dim">Version {release.version} · Android build {release.versionCode}. Available to approved community beta members.</p><details className="install-proof"><summary>Build details, security status and checksum</summary><p>Public release is blocked by unresolved native dependency findings. Physical phone acceptance is still pending.</p><dl><dt>Build ID</dt><dd>{release.buildId}</dd><dt>Source commit</dt><dd>{release.sourceCommit}</dd><dt>APK SHA-256</dt><dd>{release.sha256}</dd><dt>Signing certificate SHA-256</dt><dd>{release.signingCertificateSha256}</dd></dl></details></>:null}{error&&<p role="alert">{error} <button className="text-button" disabled={busy} onClick={()=>setAttempt(n=>n+1)}>Try again</button></p>}<a className="text-button" href="/">Back to your account</a></>;
}
