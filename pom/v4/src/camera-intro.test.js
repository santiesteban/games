import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleCameraIntro,INTRO_HOLD_MS as hold,INTRO_PAN_MS as pan,INTRO_ZOOM_MS as zoom} from './camera-intro.js';

test('overview holds, then pans without zoom, then zooms to the exact endpoint',()=>{
  assert.deepEqual(sampleCameraIntro(hold-1,20,80),{phase:'overview',pan:0,unit:20,done:false});
  const middle=sampleCameraIntro(hold+pan/2,20,80);assert.equal(middle.phase,'pan');assert.equal(middle.unit,20);assert.equal(middle.pan,.5);
  const zooming=sampleCameraIntro(hold+pan+zoom/2,20,80);assert.equal(zooming.pan,1);assert(Math.abs(zooming.unit-40)<1e-10);
  assert.deepEqual(sampleCameraIntro(hold+pan+zoom,20,80),{phase:'ready',pan:1,unit:80,done:true});
});
test('pan and zoom joins are continuous with no final snap',()=>{
  for(const at of [hold,hold+pan,hold+pan+zoom]){
    const before=sampleCameraIntro(at-.01,20,80),after=sampleCameraIntro(at+.01,20,80);
    assert(Math.abs(after.pan-before.pan)<1e-8);assert(Math.abs(after.unit-before.unit)<1e-8);
  }
  let last=20;
  for(let ms=0;ms<hold+pan+zoom+100;ms+=8){const p=sampleCameraIntro(ms,20,80);assert(p.unit>=last);assert(p.unit<=80);last=p.unit}
});
test('views that already fit end after the overview hold',()=>{
  assert.equal(sampleCameraIntro(hold-1,80,80).done,false);
  assert.deepEqual(sampleCameraIntro(hold,80,80),{phase:'ready',pan:1,unit:80,done:true});
});
