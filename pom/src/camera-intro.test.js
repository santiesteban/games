import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleCameraIntro,initialCameraUnit,INTRO_HOLD_MS as hold,INTRO_PAN_MS as pan,INTRO_ZOOM_MS as zoom} from './camera-intro.js';

test('overview holds, then pans and zooms together to the exact endpoint',()=>{
  assert.deepEqual(sampleCameraIntro(hold-1,20,80),{phase:'overview',pan:0,unit:20,done:false});
  const middle=sampleCameraIntro(hold+(pan+zoom)/2,20,80);
  assert.equal(middle.phase,'zoom');assert.equal(middle.pan,.5);assert(Math.abs(middle.unit-40)<1e-10);
  assert.deepEqual(sampleCameraIntro(hold+pan+zoom,20,80),{phase:'ready',pan:1,unit:80,done:true});
});
test('the opening motion is continuous and monotonic',()=>{
  for(const at of [hold,hold+pan+zoom]){
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

test('small-screen opening zoom leaves room around Pom without restricting manual zoom',()=>{
  assert.equal(initialCameraUnit({fitUnit:20,width:390,height:600,mobile:true}),48.75);
  assert.equal(initialCameraUnit({fitUnit:20,width:320,height:480,mobile:true}),40);
  assert.equal(initialCameraUnit({fitUnit:20,width:700,height:200,mobile:true}),40);
  assert.equal(initialCameraUnit({fitUnit:70,width:390,height:600,mobile:true}),70);
  assert.equal(initialCameraUnit({fitUnit:20,width:1280,height:600,mobile:false}),64);
});
