import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {requiredSceneryAssets,createScenerySelectionCache} from './scenery-assets.js';
const metadata=Object.fromEntries(['daisy-meadow','meadow','japan-spring'].map(id=>[id,JSON.parse(fs.readFileSync(new URL(`./assets/scenery-kits/${id}/metadata.json`,import.meta.url)))]));
const approved=JSON.parse(fs.readFileSync(new URL('./data/daisy-meadow-ivan-v2.json',import.meta.url))).configuration;
const names=entries=>entries.map(a=>a.file.replace(/\.png$/,'')).sort();
test('approved Daisy scene loads its backing, ground and placed cutouts only',()=>{
 const selected=names(requiredSceneryAssets(metadata['daisy-meadow'],{...approved,props:true,background:true,foreground:true}));
 assert.deepEqual(selected,[...new Set(['flat-background','ground-tile',...approved.sceneryLayout.map(a=>a.role)])].sort());
 for(const name of ['static-background','sky','distant-hills','hanging-cloud-a','hanging-cloud-b','low-fog-a','low-fog-b'])assert(!selected.includes(name));
});
test('optional cloud and fog images load only when placed with atmosphere enabled',()=>{
 const state={environment:'daisy-meadow',sceneryLayout:[{role:'low-fog-a'},{role:'hanging-cloud-b'}],scenicAtmosphere:true};
 assert.deepEqual(names(requiredSceneryAssets(metadata['daisy-meadow'],state)),['flat-background','ground-tile','hanging-cloud-b','low-fog-a']);
 assert.deepEqual(names(requiredSceneryAssets(metadata['daisy-meadow'],{...state,scenicAtmosphere:false})),['flat-background','ground-tile']);
 assert.deepEqual(names(requiredSceneryAssets(metadata['daisy-meadow'],{...state,props:false})),['flat-background','ground-tile']);
});
test('layer visibility and empty layouts avoid all unused image requests',()=>{
 assert.deepEqual(names(requiredSceneryAssets(metadata['daisy-meadow'],{environment:'daisy-meadow',sceneryLayout:[],background:false,foreground:false})),[]);
});
test('Meadow and Japan keep their sky, hills, ground and planted scenery',()=>{
 for(const id of ['meadow','japan-spring'])assert.equal(requiredSceneryAssets(metadata[id],{environment:id}).length,11);
});
test('switching selections reuses textures and decodes only newly added images',async()=>{
 const calls=[],cache=createScenerySelectionCache(metadata,async(id,meta)=>{calls.push(meta.webp);return {name:meta.webp}}),state={sceneryLayout:[]};
 const first=cache.load('daisy-meadow',{state});assert.equal(first,cache.load('daisy-meadow',{state}));await first.promise;
 const extra=cache.load('daisy-meadow',{state:{...state,scenicAtmosphere:true,sceneryLayout:[{role:'low-fog-a'}]}});await extra.promise;
 assert.deepEqual(calls.sort(),['flat-background.webp','ground-tile.webp','low-fog-a.webp']);
 assert.equal(first.assets['ground-tile'],extra.assets['ground-tile']);assert.equal(first.status,'ready');assert.equal(extra.status,'ready');
 assert.equal(cache.load('daisy-meadow',{state}),first);
});
test('failed additions preserve cached scene textures and retry only failed images',async()=>{
 let fail=true;const calls=[],cache=createScenerySelectionCache(metadata,async(id,meta)=>{calls.push(meta.webp);if(fail&&meta.webp==='tree-a.webp')throw new Error('offline');return {name:meta.webp}});
 const empty={sceneryLayout:[]},state={sceneryLayout:[{role:'tree-a'}]};const first=cache.load('daisy-meadow',{state:empty});await first.promise;
 const failed=cache.load('daisy-meadow',{state});assert.equal(await failed.promise,null);assert.equal(failed.status,'error');assert.equal(first.status,'ready');
 fail=false;const retry=cache.load('daisy-meadow',{state,retry:true});await retry.promise;assert.equal(retry.status,'ready');
 assert.equal(retry.assets['ground-tile'],first.assets['ground-tile']);assert.equal(calls.filter(n=>n==='ground-tile.webp').length,1);assert.equal(calls.filter(n=>n==='tree-a.webp').length,2);
});
