// Run verify-android-apk.mjs first with the Android SDK tools. This packages its
// evidence and matching bytes outside Git and the public web root, for staging.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const [apkPath,evidencePath,sourceCommit,outputPath]=process.argv.slice(2);
if(!apkPath||!evidencePath||!outputPath||!/^[a-f0-9]{40}$/.test(sourceCommit||''))throw Error('Usage: node scripts/prepare-private-android.mjs APK SDK_EVIDENCE_JSON SOURCE_COMMIT OUTPUT_DIRECTORY');
const data=JSON.parse(await readFile(evidencePath,'utf8')),bytes=await readFile(apkPath);
const source=JSON.parse(execFileSync('git',['show',sourceCommit+':mobile/app.json'],{encoding:'utf8'})).expo;
if(data.sha256!==createHash('sha256').update(bytes).digest('hex')||data.sizeBytes!==bytes.length||data.version!==source.version||data.versionCode!==source.android.versionCode||data.packageId!==source.android.package||!data.buildId||data.debuggable!==false||data.standaloneBundle!==true||!/^[a-f0-9]{64}$/.test(data.signingCertificateSha256))throw Error('APK, SDK verification record and source configuration do not match');
const directory=resolve(outputPath);await mkdir(directory,{recursive:true});
await copyFile(apkPath,resolve(directory,'devcon-follow.apk'));
await writeFile(resolve(directory,'android.json'),JSON.stringify({...data,sourceCommit},null,2)+'\n');
console.log('Prepared verified bytes for restricted staging delivery. Public release remains gated.');
