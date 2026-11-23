import test from 'node:test';
import assert from 'node:assert/strict';
import {resizeReferenceFromDrag,fitReferenceToVisible} from '../creator/src/reference-placement.js';
test('corner drag resizes proportionally and clamps to the supported range',()=>{
  assert.equal(resizeReferenceFromDrag(1,50,50,100,100),1.5);
  assert.equal(resizeReferenceFromDrag(1,-50,-50,100,100),.5);
  assert.equal(resizeReferenceFromDrag(1,-500,-500,100,100),.1);
  assert.equal(resizeReferenceFromDrag(7,500,500,100,100),8);
});

test('new images fit the visible editing area, excluding the floor',()=>{
  assert.deepEqual(fitReferenceToVisible({left:0,top:0,width:320,height:330},{left:0,top:0,right:320,bottom:330}),{scale:.9,x:0,y:0});
  assert.deepEqual(fitReferenceToVisible({left:0,top:-160,width:320,height:330},{left:0,top:0,right:160,bottom:170}),{scale:.45,x:-8,y:8});
});
