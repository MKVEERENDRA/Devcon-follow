import test from 'node:test';
import assert from 'node:assert/strict';
import {androidDownloadUrl,readAndroidDownload,downloadAndroidParts} from '../web/src/android-download.js';
test('APK uses only its configured bare HTTPS API and never embeds a credential',()=>{
 assert.equal(androidDownloadUrl('/v1/releases/android/apk','https://api.example.test'),'https://api.example.test/v1/releases/android/apk');
 assert.equal(androidDownloadUrl('/v1/releases/android/apk'),'/v1/releases/android/apk');
 for(const origin of ['http://api.example.test','https://api.example.test/path','https://token@api.example.test','https://api.example.test/?token=x'])assert.throws(()=>androidDownloadUrl('/v1/releases/android/apk',origin));
 assert.throws(()=>androidDownloadUrl('https://other.example/apk','https://api.example.test'));
});
test('streamed APK reports progress, preserves bytes and cancels oversized responses',async()=>{
 const bytes=new Uint8Array(20000).fill(7),progress=[];
 const blob=await readAndroidDownload(new Response(new ReadableStream({start(c){c.enqueue(bytes.slice(0,10000));c.enqueue(bytes.slice(10000));c.close()}})),20000,p=>progress.push(p));
 assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),bytes);assert.deepEqual(progress,[50,100]);
 await assert.rejects(readAndroidDownload(new Response(bytes.slice(0,10000)),20000,()=>{}),/incomplete/);
 let cancelled=false;
 await assert.rejects(readAndroidDownload(new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(20001))},cancel(){cancelled=true}})),20000,()=>{}),/size did not match/);
 assert.equal(cancelled,true);
 await assert.rejects(readAndroidDownload(new Response(bytes),Infinity,()=>{}),/Invalid APK size/);
 await assert.rejects(readAndroidDownload(new Response(bytes.slice(0,9)),9,()=>{}),/Invalid APK size/);
});

test('bounded APK parts retry only interrupted bytes, use fresh tokens and reject changed ranges/access',async()=>{
 const bytes=new Uint8Array(20000).fill(7),sha256='a'.repeat(64),release={sizeBytes:bytes.length,sha256,rangeChunkBytes:8192,downloadPath:'/v1/releases/android/apk'},ranges=[],tokens=[],progress=[];let lost=false,token='old';
 const blob=await downloadAndroidParts(release,{apiOrigin:'https://api.example.test',getToken:()=>token,onProgress:p=>progress.push(p),pause:async()=>{},fetchImpl:async(url,options)=>{
  assert.equal(url,'https://api.example.test/v1/releases/android/apk');assert.equal(options.headers['If-Match'],'"'+sha256+'"');const range=options.headers.Range;ranges.push(range);tokens.push(options.headers.Authorization);const [,a,b]=/^bytes=(\d+)-(\d+)$/.exec(range),start=Number(a),end=Number(b);
  if(start===8192&&!lost){lost=true;token='new';return new Response(new ReadableStream({start(c){c.enqueue(bytes.slice(start,start+1000));c.error(new TypeError('network error'))}}),{status:206,headers:{'content-type':'application/vnd.android.package-archive','content-range':`bytes ${start}-${end}/${bytes.length}`}})}
  return new Response(bytes.slice(start,end+1),{status:206,headers:{'content-type':'application/vnd.android.package-archive','content-range':`bytes ${start}-${end}/${bytes.length}`}})
 }});
 assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),bytes);assert.deepEqual(ranges,['bytes=0-8191','bytes=8192-16383','bytes=8192-16383','bytes=16384-19999']);assert.equal(tokens[2],'Bearer new');assert.equal(progress.at(-1),100);assert(progress.every((p,i)=>i===0||p>=progress[i-1]));
 for(const status of [403,412]){let count=0;await assert.rejects(downloadAndroidParts(release,{getToken:()=>token,onProgress:()=>{},pause:async()=>{},fetchImpl:async()=>{count++;return new Response('{}',{status})}}));assert.equal(count,1)}
 let renewals=0,calls=0;await downloadAndroidParts({...release,rangeChunkBytes:32768},{getToken:()=>'expired',refreshToken:async()=>{renewals++;return 'refreshed'},onProgress:()=>{},fetchImpl:async(_,o)=>{calls++;return o.headers.Authorization==='Bearer refreshed'?new Response(bytes,{status:206,headers:{'content-type':'application/vnd.android.package-archive','content-range':'bytes 0-19999/20000'}}):new Response('{}',{status:401})}});assert.equal(renewals,1);assert.equal(calls,2);
 await assert.rejects(downloadAndroidParts(release,{getToken:()=>token,onProgress:()=>{},fetchImpl:async()=>new Response(bytes,{status:206,headers:{'content-type':'application/vnd.android.package-archive','content-range':'bytes 1-20000/20001'}})}),/byte range/);
 const abort=new AbortController();abort.abort();let requested=false;await assert.rejects(downloadAndroidParts(release,{signal:abort.signal,getToken:()=>token,onProgress:()=>{},fetchImpl:async()=>{requested=true}}));assert.equal(requested,false);
});
