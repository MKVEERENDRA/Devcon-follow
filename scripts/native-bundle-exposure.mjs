import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';

export function inspectSourceMap(map) {
  if (map?.version!==3) throw Error('Expected a version 3 source map');
  const sources=Array.isArray(map.sources)?map.sources:[];
  if (!Array.isArray(map.sources)&&!Array.isArray(map.sections)) throw Error('Source map has no source inventory');
  if (sources.some(s=>typeof s!=='string')) throw Error('Invalid source inventory');
  const nested=(map.sections||[]).map(section=>inspectSourceMap(section.map));
  const exposed=sources.flatMap(source=>{
    const normalized=source.replaceAll('\\','/');
    return ['braces','node-forge'].filter(name=>normalized.includes('/node_modules/'+name+'/')||normalized.startsWith('node_modules/'+name+'/'));
  });
  return {sourceCount:sources.length+nested.reduce((n,s)=>n+s.sourceCount,0),affectedPackages:[...new Set([...exposed,...nested.flatMap(s=>s.affectedPackages)])].sort()};
}

export function inspectMatchingBundle(embedded,buildBundle,map){
  const embeddedBundleSha256=createHash('sha256').update(embedded).digest('hex');
  if(embeddedBundleSha256!==createHash('sha256').update(buildBundle).digest('hex'))throw Error('Build bundle differs from APK bytes; this source map cannot certify the APK inventory');
  const inventory=inspectSourceMap(map);
  if(!inventory.sourceCount)throw Error('Empty source inventory');
  return {...inventory,embeddedBundleSha256};
}

export async function bundleExposure(directory) {
  const maps=[];
  async function walk(path) {
    for (const entry of await readdir(path,{withFileTypes:true})) {
      const file=join(path,entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()&&entry.name.endsWith('.map')) maps.push(file);
    }
  }
  await walk(directory);
  const results=[];
  for (const file of maps.sort()) {
    const platform=file.split(/[\\/]/).find(p=>p==='android'||p==='ios');
    if(!platform) continue;
    const bytes=await readFile(file),inventory=inspectSourceMap(JSON.parse(bytes));
    const bundle=await readFile(file.slice(0,-4)); // Must correspond to an actual export bundle.
    if(!inventory.sourceCount) throw Error('Empty source inventory');
    results.push({platform,...inventory,mapSha256:createHash('sha256').update(bytes).digest('hex'),bundleSha256:createHash('sha256').update(bundle).digest('hex')});
  }
  for(const platform of ['android','ios']) if(!results.some(r=>r.platform===platform)) throw Error('Missing '+platform+' bundle/source map evidence');
  return {checkedAt:new Date().toISOString(),scope:'local-export-JavaScript-only',apkCorrelation:'unverified; exported bundle is not automatically identical to the signed APK',releaseApproval:false,bundles:results};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const directory=process.argv[2],output=process.argv[3];
  if(!directory||!output) throw Error('Usage: node scripts/native-bundle-exposure.mjs EXPORT_DIRECTORY OUTPUT_JSON');
  const evidence=await bundleExposure(resolve(directory));
  await mkdir(dirname(resolve(output)),{recursive:true});await writeFile(output,JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
  if(evidence.bundles.some(b=>b.affectedPackages.length))process.exitCode=1;
}
