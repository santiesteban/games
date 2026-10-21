import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraStep,cameraPosition,CAMERA_PITCHES} from './camera-view.js';

test('horizontal positions snap to three stops',()=>{
  for(const value of [-100,-1,-.7,0,.2,.8,1,100])assert([-1,0,1].includes(cameraStep(value)));
  assert.equal(cameraStep(NaN),0);assert.equal(cameraStep(Infinity),0);
  assert.equal(cameraStep(-4),-1);assert.equal(cameraStep(4),1);
});

test('horizontal and vertical positions are independent',()=>{
  for(const horizontal of [-1,0,1])for(const vertical of [0,1]){
    const view=cameraPosition(horizontal,vertical);
    assert.equal(view.horizontal,horizontal);assert.equal(view.vertical,vertical);
    assert.equal(view.pitch,CAMERA_PITCHES[vertical]);
    assert(Math.sin(view.pitch)>.18,'both angles retain visible platform tops');
  }
  assert.equal(CAMERA_PITCHES[1],CAMERA_PITCHES[0]/2);
});
