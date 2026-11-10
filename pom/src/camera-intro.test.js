import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleCameraIntro,initialCameraUnit,openingFrameFits,INTRO_HOLD_MS as hold,INTRO_PAN_MS as pan,INTRO_ZOOM_MS as zoom} from './camera-intro.js';

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

test('opening scale uses the tighter play area dimension',()=>{
  assert.equal(initialCameraUnit({width:814,height:1110}),110);
  assert.equal(initialCameraUnit({width:1280,height:600}),60);
  assert.equal(initialCameraUnit({width:370,height:600}),50);
});

test('the intro can ease out from a closer overview',()=>{
  assert.equal(sampleCameraIntro(hold+(pan+zoom)/2,80,20).unit,40);
});

test('occupied geometry must fit with room around the edges',()=>{
  assert.equal(openingFrameFits([{x:80,y:75},{x:280,y:350}],370,600),true);
  assert.equal(openingFrameFits([{x:350,y:75}],370,600),false);
});
