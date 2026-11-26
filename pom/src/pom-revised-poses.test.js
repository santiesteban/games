import test from 'node:test';
import assert from 'node:assert/strict';
import {revisedPomPose,revisedPushDirection} from './pom-revised-poses.js';
test('new pose sequence follows jump phases and direction',()=>{
  const frame=(progress,direction=1)=>revisedPomPose({motion:{kind:'side',progress,direction}});
  assert.equal(frame(.05).name,'jump-side-anticipation');assert.equal(frame(.25).name,'jump-side-launch');assert.equal(frame(.5).name,'jump-side-apex');assert.equal(frame(.7).name,'jump-side-descent');assert.equal(frame(.95).name,'jump-side-land');assert.equal(frame(.5,-1).flip,true);
  assert.equal(revisedPomPose({motion:{kind:'up',progress:.5}}).name,'jump-up-apex');
});
test('pipes take precedence and falling uses flapping poses',()=>{
  assert.equal(revisedPomPose({pipe:true,pose:'float'}).name,'thin-stretch');
  assert.notEqual(revisedPomPose({pose:'float',now:0}).name,revisedPomPose({pose:'float',now:220}).name);
});
test('push drawings match the piece relative to Pom',()=>{
  const p={x:2,y:4,z:2};assert.equal(revisedPushDirection({depth:2,cells:[{x:2,y:3}]},p),'backward');assert.equal(revisedPushDirection({depth:3,cells:[{x:1,y:3}]},p),'left');assert.equal(revisedPushDirection({depth:3,cells:[{x:3,y:3}]},p),'right');
});
test('push and pull select both foot positions for each piece direction',()=>{
  for(const action of ['push','pull'])for(const direction of ['backward','left','right'])for(const [progress,frame] of [[0,1],[.49,1],[.5,2],[1,2]]){
    const side=direction==='backward'?'center':direction;
    assert.equal(revisedPomPose({pose:'push-back',push:direction,effort:action,effortProgress:progress}).name,`${action}-${side}-${frame}`);
  }
});
