import test from 'node:test';
import assert from 'node:assert/strict';
import {pomMovementPose} from './pom-movement-pose.js';

test('a step up uses squash, stretch, then squash before returning to rest',()=>{
  const from={y:4},to={y:3},plan={isJump:false,isFall:false,stretch:true};
  assert.equal(pomMovementPose(plan,from,to,.08,.08),'squash');
  assert.equal(pomMovementPose(plan,from,to,.5,.5),'stretch');
  assert.equal(pomMovementPose(plan,from,to,.9,.9),'squash');
});
test('level movement and falls retain their existing poses',()=>{
  assert.equal(pomMovementPose({},{y:4},{y:4},.5,.5),'calm');
  assert.equal(pomMovementPose({isFall:true},{y:1},{y:4},.5,.5),'float');
  assert.equal(pomMovementPose({isJump:true},{y:3},{y:3},.5,.5),'stretch');
});
