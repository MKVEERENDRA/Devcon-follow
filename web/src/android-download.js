// The dedicated API already receives the same token for sockets and app calls.
// Keep credentials in the Authorization header, never in a download URL.
export function androidDownloadUrl(path,apiOrigin){
 if(path!=='/v1/releases/android/apk')throw Error('Unexpected Android download path.');
 if(!apiOrigin)return path;
 const url=new URL(apiOrigin);
 if(url.protocol!=='https:'||url.origin!==apiOrigin||url.username||url.password)throw Error('Invalid Android download origin.');
 return apiOrigin+path;
}
export async function readAndroidDownload(response,expected,onProgress,{part=false}={}){
 if(!Number.isSafeInteger(expected)||expected<(part?1:10000)||expected>200*1024*1024)throw Error('Invalid APK size.');
 if(!response.body)throw Error('Download could not start. Please try again.');
 const reader=response.body.getReader(),chunks=[];let total=0,last=-1;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   total+=value.byteLength;
   if(total>expected)throw Error('Download size did not match. No file was saved.');
   chunks.push(value);const percent=Math.floor(total/expected*100);
   if(percent!==last){last=percent;onProgress(percent)}
  }
  if(total!==expected)throw Error('Download was incomplete. Please try again.');
  return new Blob(chunks,{type:'application/vnd.android.package-archive'});
 }catch(error){await reader.cancel().catch(()=>{});throw error}
 finally{reader.releaseLock()}
}


// Retain completed parts in memory and retry only the interrupted part. Each
// request rechecks current identity/revocation and binds bytes to one release.
export async function downloadAndroidParts(release,{apiOrigin,getToken,refreshToken,signal,onProgress,fetchImpl=fetch,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 const size=release.sizeBytes,part=release.rangeChunkBytes;
 if(!Number.isSafeInteger(size)||size<10000||size>200*1024*1024||!Number.isSafeInteger(part)||part<1024||part>4*1024*1024||!/^[a-f0-9]{64}$/.test(release.sha256))throw Error('Invalid APK size or part metadata.');
 const chunks=[];let completed=0,last=0;
 const progress=bytes=>{const value=Math.floor(bytes/size*100);if(value>last){last=value;onProgress(value)}};
 while(completed<size){
  const start=completed,end=Math.min(size-1,start+part-1),expected=end-start+1;let saved=null,renewed=false,overrideToken=null;
  for(let attempt=0;attempt<3;attempt++){
   if(signal?.aborted)throw signal.reason||Error('Download cancelled.');
   try{
    const token=overrideToken||getToken();if(!token)throw Object.assign(Error('Your session expired. Sign in again.'),{permanent:true});
    const response=await fetchImpl(androidDownloadUrl(release.downloadPath,apiOrigin),{headers:{Authorization:'Bearer '+token,Range:`bytes=${start}-${end}`,'If-Match':'"'+release.sha256+'"'},cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000)});
    if(response.status===401&&!renewed&&refreshToken){await response.body?.cancel();renewed=true;overrideToken=await refreshToken();attempt--;continue}
    if(!response.ok){await response.body?.cancel();throw Object.assign(Error(response.status===401?'Your session expired. Sign in again.':response.status===403?'This account does not have download access.':response.status===412?'Android release changed. Refresh the installer.':'Download interrupted. Please try again.'),{permanent:response.status<500&&response.status!==429})}
    if(response.headers.get('content-type')?.split(';')[0]!=='application/vnd.android.package-archive'){await response.body?.cancel();throw Object.assign(Error('The server did not return an APK.'),{permanent:true})}
    // Rolling deployment compatibility: a server ignoring the first range may
    // return the full file. Never append a full response after completed parts.
    if(response.status===200&&start===0)return readAndroidDownload(response,size,onProgress);
    if(response.status!==206||response.headers.get('content-range')!==`bytes ${start}-${end}/${size}`){await response.body?.cancel();throw Object.assign(Error('APK byte range did not match. No file was saved.'),{permanent:true})}
    saved=await readAndroidDownload(response,expected,p=>progress(start+Math.floor(expected*p/100)),{part:true});break;
   }catch(error){if(signal?.aborted||error.permanent||attempt===2)throw error;await pause(200*2**attempt)}
  }
  if(!saved)throw Error('Download was incomplete. Please try again.');chunks.push(saved);completed+=saved.size;progress(completed);
 }
 return new Blob(chunks,{type:'application/vnd.android.package-archive'});
}
