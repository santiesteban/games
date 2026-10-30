import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedCameraAxis} from './camera-follow.js';
const points=(a,b,scale=1)=>[{position:a,scale},{position:b,scale}];
const close=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
test('a puzzle that fits stays centered when Pom reaches either edge',()=>{
  close(boundedCameraAxis({points:points(0,6),min:-5,max:5}),3);
  close(boundedCameraAxis({points:points(-6,0),min:-5,max:5}),-3);
});
test('large puzzles follow in the interior and stop at both edges',()=>{
  close(boundedCameraAxis({points:points(-10,10),min:-4,max:4}),0);
  close(boundedCameraAxis({points:points(0,20),min:-4,max:4}),4);
  close(boundedCameraAxis({points:points(-20,0),min:-4,max:4}),-4);
});
test('asymmetric control clearances affect framing',()=>{
  close(boundedCameraAxis({points:points(-2,2),min:-3,max:5}),-1);
});
test('perspective points keep the puzzle between the screen edges',()=>{
  const p=[{position:0,scale:1.5},{position:10,scale:.75}];
  const shift=boundedCameraAxis({points:p,min:-3,max:3});
  close(Math.min(...p.map(v=>v.scale*(v.position-shift))),-3);
  assert(Math.max(...p.map(v=>v.scale*(v.position-shift)))>=3);
});
test('a fitting perspective footprint is centered rather than its world bounds',()=>{
  const p=[{position:0,scale:1.5},{position:4,scale:.75}];
  const shift=boundedCameraAxis({points:p,min:-5,max:5});
  close(p[0].scale*(p[0].position-shift)+p[1].scale*(p[1].position-shift),0);
});
test('Pom remains visible when standing beyond the puzzle',()=>{
  const subject={position:0,scale:1};
  close(boundedCameraAxis({points:points(4,8),min:-5,max:5,subject,padding:.5}),4.5);
});
test('moving the reference focus does not change final framing for a fitting puzzle',()=>{
  const a=boundedCameraAxis({points:points(0,6),min:-5,max:5});
  const b=boundedCameraAxis({points:points(-2,4),min:-5,max:5});
  close(a,2+b);
});
test('empty or invalid bounds leave the requested focus alone',()=>{
  assert.equal(boundedCameraAxis({points:[],min:-5,max:5}),0);
  assert.equal(boundedCameraAxis({points:points(0,1),min:1,max:1}),0);
});
