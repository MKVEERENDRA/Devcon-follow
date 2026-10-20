import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSourceMap} from '../scripts/native-bundle-exposure.mjs';
test('bundle exposure detects advisory implementations in normal and indexed source maps',()=>{
 const inventory=inspectSourceMap({version:3,sources:['node_modules/braces/lib/parse.js','/build/node_modules/node-forge/lib/rsa.js','/app/bracelets.js'],sections:[{map:{version:3,sources:['C:\\build\\node_modules\\braces\\lib\\compile.js']}}]});
 assert.deepEqual(inventory,{sourceCount:4,affectedPackages:['braces','node-forge']});
 assert.deepEqual(inspectSourceMap({version:3,sources:['node_modules/jose/dist/index.js','app/App.tsx']}),{sourceCount:2,affectedPackages:[]});
 for(const map of [{version:3},{version:2,sources:[]},{version:3,sources:[null]},{version:3,sections:[{url:'unread-external-map'}]}])assert.throws(()=>inspectSourceMap(map));
});
