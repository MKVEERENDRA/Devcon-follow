import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSourceMap,inspectMatchingBundle} from '../scripts/native-bundle-exposure.mjs';
test('bundle exposure detects advisory implementations in normal and indexed source maps',()=>{
 const inventory=inspectSourceMap({version:3,sources:['node_modules/braces/lib/parse.js','/build/node_modules/node-forge/lib/rsa.js','/app/bracelets.js'],sections:[{map:{version:3,sources:['C:\\build\\node_modules\\braces\\lib\\compile.js']}}]});
 assert.deepEqual(inventory,{sourceCount:4,affectedPackages:['braces','node-forge']});
 assert.deepEqual(inspectSourceMap({version:3,sources:['node_modules/jose/dist/index.js','app/App.tsx']}),{sourceCount:2,affectedPackages:[]});
 for(const map of [{version:3},{version:2,sources:[]},{version:3,sources:[null]},{version:3,sections:[{url:'unread-external-map'}]}])assert.throws(()=>inspectSourceMap(map));
});
test('a separately exported bundle cannot substitute for a matching APK build inventory',()=>{
 const embedded=Buffer.from('synthetic-embedded-Hermes-bytes'),map={version:3,sources:['node_modules/jose/index.js']};
 assert.throws(()=>inspectMatchingBundle(embedded,Buffer.from('different-export'),map),/differs from APK/);
 const inventory=inspectMatchingBundle(embedded,Buffer.from(embedded),map);assert.equal(inventory.sourceCount,1);assert.deepEqual(inventory.affectedPackages,[]);assert.equal(inventory.embeddedBundleSha256.length,64);
 const exposed=inspectMatchingBundle(embedded,embedded,{version:3,sources:['node_modules/node-forge/lib/rsa.js']});assert.deepEqual(exposed.affectedPackages,['node-forge']);
});
