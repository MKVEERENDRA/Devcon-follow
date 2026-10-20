import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {inspectMatchingBundle} from './native-bundle-exposure.mjs';

const [apkPath,sdkEvidencePath,bundlePath,mapPath,outputPath]=process.argv.slice(2);
if(!outputPath)throw Error('Usage: node scripts/verify-android-bundle-map.mjs APK SDK_EVIDENCE_JSON BUILD_BUNDLE BUILD_MAP OUTPUT_JSON');
const apk=resolve(apkPath),bytes=await readFile(apk),sdk=JSON.parse(await readFile(sdkEvidencePath,'utf8'));
const apkSha256=createHash('sha256').update(bytes).digest('hex');
if(sdk.sha256!==apkSha256||sdk.signatureVerified!==true||sdk.appLinkCertificateMatch!==true||sdk.debuggable!==false||sdk.packageId!=='com.proofofaudits.devconfollow')throw Error('Matching Android SDK signature/package verification is required first');
const embedded=execFileSync('unzip',['-p',apk,'assets/index.android.bundle'],{maxBuffer:50*1024*1024});
const mapBytes=await readFile(mapPath);
const inventory=inspectMatchingBundle(embedded,await readFile(bundlePath),JSON.parse(mapBytes));
const evidence={checkedAt:new Date().toISOString(),scope:'signed-apk-embedded-JavaScript-only',buildId:sdk.buildId,version:sdk.version,versionCode:sdk.versionCode,apkSha256,signingCertificateSha256:sdk.signingCertificateSha256,...inventory,mapSha256:createHash('sha256').update(mapBytes).digest('hex'),releaseApproval:false,limitations:'Matching EAS build artifacts are required. This inventories the two known npm advisory implementations only, not native libraries or build/certificate tooling. The independent npm audit gate is unchanged.'};
await mkdir(dirname(resolve(outputPath)),{recursive:true});await writeFile(outputPath,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
if(inventory.affectedPackages.length)process.exitCode=1;
