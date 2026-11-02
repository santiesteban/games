import test from 'node:test';
import assert from 'node:assert/strict';
import {createSceneryGeometryCache} from './scenery-geometry-cache.js';

test('repeated scenery retains all live variants and disposes only removed geometry',()=>{
  const disposed=[],cache=createSceneryGeometryCache(value=>disposed.push(value)),asset={};
  let builds=0;
  const get=key=>cache.get(asset,key,()=>({key,build:++builds}));
  cache.begin();const original=['a','b','c','d','e'].map(get);cache.end();
  cache.begin();assert.deepEqual(['e','d','c','b','a'].map(get),original.toReversed());cache.end();
  assert.equal(builds,5);assert.equal(disposed.length,0);
  cache.begin();assert.equal(get('b'),original[1]);cache.end();
  assert.deepEqual(disposed,[original[0],original[2],original[3],original[4]]);
  cache.clear();assert.equal(disposed.at(-1),original[1]);
  cache.begin();assert.notEqual(get('b'),original[1]);cache.end();assert.equal(builds,6);
});

test('asset identity separates equal keys and removed assets are released',()=>{
  const disposed=[],cache=createSceneryGeometryCache(value=>disposed.push(value)),a={},b={};
  cache.begin();const first=cache.get(a,'same',()=>({})),second=cache.get(b,'same',()=>({}));cache.end();
  assert.notEqual(first,second);
  cache.begin();assert.equal(cache.get(b,'same',()=>assert.fail()),second);cache.end();
  assert.deepEqual(disposed,[first]);cache.clear();cache.clear();assert.deepEqual(disposed,[first,second]);
});
