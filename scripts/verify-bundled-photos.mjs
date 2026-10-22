import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const [apk,output]=process.argv.slice(2);
if(!apk||!output)throw Error('Usage: node scripts/verify-bundled-photos.mjs APK OUTPUT_JSON');
const expected=JSON.parse(await readFile(new URL('../mobile/assets/photography/credits.json',import.meta.url),'utf8'));
const entries=execFileSync('unzip',['-Z1',apk],{encoding:'utf8',maxBuffer:2*1024*1024}).split('\n').filter(p=>/\.jpe?g$/i.test(p));
if(entries.length>128)throw Error('Unexpected photograph count');
const found=new Map(entries.map(path=>[createHash('sha256').update(execFileSync('unzip',['-p',apk,path],{maxBuffer:2*1024*1024})).digest('hex'),path]));
const photos=[];
for(const item of expected){
 const source=await readFile(new URL('../mobile/assets/photography/'+item.file,import.meta.url));
 if(createHash('sha256').update(source).digest('hex')!==item.sha256)throw Error('Source photo does not match its credit record');
 const path=found.get(item.sha256);if(!path)throw Error('Required photograph missing or changed inside APK: '+item.file);
 photos.push({file:item.file,sha256:item.sha256,apkEntry:path});
}
const record={checkedAt:new Date().toISOString(),scope:'exact-bundled-photography-bytes',photos};await writeFile(output,JSON.stringify(record,null,2)+'\n');console.log('PASS: all '+photos.length+' licensed photographs match exact source bytes inside the APK.');
