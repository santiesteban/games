import test from 'node:test';
import assert from 'node:assert/strict';
import {cellYStretch,stretchBoardY,unStretchBoardY} from './cell-squareness.js';
import {cameraPosition} from './camera-view.js';

for(const horizontal of [-1,0,1])for(const vertical of [0,1]){
  const {pitch,slant}=cameraPosition(horizontal,vertical);
  test(`squareness at side ${horizontal}, pitch ${vertical}`,()=>{
    for(const s of [0,.5,1]){
      const k=cellYStretch(s,pitch),expected=(1-s)*Math.cos(pitch)+s;
      assert(Math.abs(Math.cos(pitch)*k-expected)<1e-12);
      if(!s)assert.equal(k,1);
      assert.equal(stretchBoardY(0,k),0);
      for(const y of [-.008,0,.5,1,10,32])assert(Math.abs(unStretchBoardY(stretchBoardY(y,k),k)-y)<1e-12);
      // World Y correction cannot affect the floor or a pull at constant Y.
      const project=(x,y,z)=>[x+slant*.16*z,-stretchBoardY(y,k)*Math.cos(pitch)+z*Math.sin(pitch)];
      const a=project(2,5,1),b=project(2,5,2),x=project(3,5,1);
      assert.equal(x[1]-a[1],0);
      assert(Math.abs(b[0]-a[0]-slant*.16)<1e-12);
      assert(Math.abs(b[1]-a[1]-Math.sin(pitch))<1e-12);
    }
  });
}
test('normalization, moving pitch and arbitrary floor anchors',()=>{
  assert.equal(cellYStretch(-1,.38),1);
  assert.equal(cellYStretch(NaN,.38),1);
  assert.equal(cellYStretch(2,.38),cellYStretch(1,.38));
  assert.equal(cellYStretch(1,0),1);
  for(const pitch of [.001,.1,.19,.28,.38])assert(Math.abs(cellYStretch(1,pitch)*Math.cos(pitch)-1)<1e-12);
  const k=cellYStretch(.5,.38);
  assert.equal(stretchBoardY(7,k,7),7);
  assert.equal(unStretchBoardY(stretchBoardY(10,k,7),k,7),10);
});
