import test from 'node:test';
import assert from 'node:assert/strict';
import {normalPipeFrame,normalPipeEntryProgress,invertedPipeEntryFrame,invertedPipeExitFrame} from './pipe-animation.js';

test('normal pipe timing holds, enters, emerges, and settles',()=>{
  assert.deepEqual(normalPipeFrame(0),{size:1,visibility:1,mouth:1,lift:0,squint:0});
  assert.equal(normalPipeFrame(1500).visibility,0);
  assert.equal(normalPipeFrame(1700).lift,-.32);
  assert.equal(normalPipeFrame(2350).lift,0);
  assert.equal(normalPipeFrame(2350).size,1);
});
test('normal pipe entry progress stays at zero until Pom starts moving',()=>{
  assert.equal(normalPipeEntryProgress(0),0);
  assert.equal(normalPipeEntryProgress(450),0);
  assert(normalPipeEntryProgress(500)>0);
  assert.equal(normalPipeEntryProgress(1000),1);
});
test('inverted entry shrinks into the opening',()=>{
  assert.deepEqual(invertedPipeEntryFrame(0),{progress:0,size:1});
  const end=invertedPipeEntryFrame(500);
  assert.equal(end.progress,1);assert(Math.abs(end.size-.05)<1e-10);
});
test('inverted exit finishes its landing squash after the drop',()=>{
  const start=invertedPipeExitFrame(0),impact=invertedPipeExitFrame(400),end=invertedPipeExitFrame(650);
  assert.equal(start.burst,0);assert.equal(start.size,.05);
  assert.equal(impact.stepJump,.82);assert.equal(end.burst,1);assert(end.stepJump>.82);
});
