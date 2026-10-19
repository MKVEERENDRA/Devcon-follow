import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {useStackedLayout} from '../mobile/accessibility.ts';
test('native layout reflows for narrow devices and enlarged OS fonts without capping font scaling',()=>{
 assert.equal(useStackedLayout(390,1),false);assert.equal(useStackedLayout(320,1),true);assert.equal(useStackedLayout(390,1.3),true);assert.equal(useStackedLayout(1024,2),true);assert.equal(useStackedLayout(390,3),true);
 const app=readFileSync(new URL('../mobile/App.tsx',import.meta.url),'utf8');assert.match(app,/useWindowDimensions/);assert.match(app,/stacked&&\{flexWrap:'wrap'\}/);assert.doesNotMatch(app,/allowFontScaling=\{false\}|maxFontSizeMultiplier/);
});
test('native photo selection preserves QR camera permission and blocks unused microphone recording',()=>{
 const config=JSON.parse(readFileSync(new URL('../mobile/app.json',import.meta.url),'utf8')).expo;
 const picker=config.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-image-picker');assert.equal(typeof picker[1].cameraPermission,'string');assert.equal(picker[1].microphonePermission,false);
});
