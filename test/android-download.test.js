import test from 'node:test';
import assert from 'node:assert/strict';
import {androidDownloadUrl,readAndroidDownload} from '../web/src/android-download.js';
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
});
