import test from 'node:test';
import assert from 'node:assert/strict';
import { outsidePolygonSegments } from './surface-patterns.js';
const square=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
test('hatching leaves transparent walkable cells clear in either winding',()=>{
  for(const polygon of [square,[...square].reverse()]){
    assert.deepEqual(outsidePolygonSegments({x:-1,y:.5},{x:2,y:.5},[polygon]),[[{x:-1,y:.5},{x:0,y:.5}],[{x:1,y:.5},{x:2,y:.5}]]);
  }
});
test('hatching remains outside walking cells and disappears inside them',()=>{
  const a={x:-2,y:-2},b={x:-1,y:-1};
  assert.deepEqual(outsidePolygonSegments(a,b,[square]),[[a,b]]);
  assert.deepEqual(outsidePolygonSegments({x:.1,y:.1},{x:.9,y:.9},[square]),[]);
});
test('adjacent and overlapping walking cells do not leave stripes between them',()=>{
  const adjacent=square.map(p=>({x:p.x+1,y:p.y}));
  assert.deepEqual(outsidePolygonSegments({x:-1,y:.5},{x:3,y:.5},[square,adjacent]),[[{x:-1,y:.5},{x:0,y:.5}],[{x:2,y:.5},{x:3,y:.5}]]);
});
