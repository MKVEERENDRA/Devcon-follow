// The dedicated API already receives the same token for sockets and app calls.
// Keep credentials in the Authorization header, never in a download URL.
export function androidDownloadUrl(path,apiOrigin){
 if(path!=='/v1/releases/android/apk')throw Error('Unexpected Android download path.');
 if(!apiOrigin)return path;
 const url=new URL(apiOrigin);
 if(url.protocol!=='https:'||url.origin!==apiOrigin||url.username||url.password)throw Error('Invalid Android download origin.');
 return apiOrigin+path;
}
export async function readAndroidDownload(response,expected,onProgress){
 if(!Number.isSafeInteger(expected)||expected<10000||expected>200*1024*1024)throw Error('Invalid APK size.');
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
