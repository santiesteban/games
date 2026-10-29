import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSceneryLayout,defaultSceneryLayout} from './scenery-layout.js';
test('old drafts receive defaults, while an intentionally empty scene stays empty',()=>{
 assert.equal(normalizeSceneryLayout(undefined).length,12);
 assert.deepEqual(normalizeSceneryLayout([]),[]);
});
test('saved scenery preserves independent copies and bounds invalid transforms',()=>{
 const input=[{id:'copy',role:'tree-a',x:90,y:2,z:-50,scale:-1},{id:'copy',role:'tree-b'},{id:'bad',role:'unknown'}];
 assert.deepEqual(normalizeSceneryLayout(input),[{id:'copy',role:'tree-a',x:40,y:2,z:-20,scale:.1,tilt:0}]);
 assert.deepEqual(normalizeSceneryLayout(defaultSceneryLayout()),defaultSceneryLayout());
});

test('per-piece cloud materials default flat and preserve independent overrides',async()=>{
 const {cutoutMaterial}=await import('./scenery-layout.js');
 assert.equal(cutoutMaterial('hanging-cloud-a',{padding:.2,depth:.4}).depth,0);
 assert.equal(cutoutMaterial('tree-a',{padding:.2,depth:.4}).padding,.2);
 const input=[{id:'fog',role:'low-fog-a',cutout:{padding:.12,depth:.2,paddingColor:'#123456',depthColor:'#abcdef'}}];
 const saved=normalizeSceneryLayout(input)[0];
 assert.deepEqual(saved.cutout,{padding:.12,depth:.2,paddingColor:'#123456',depthColor:'#abcdef'});
});
