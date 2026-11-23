import test from 'node:test';
import assert from 'node:assert/strict';
import {pomMovementPose,stepJumpShape} from './pom-movement-pose.js';

test('a step up uses squash, stretch, then squash before returning to rest',()=>{
  const from={y:4},to={y:3},plan={isJump:false,isFall:false,stretch:true};
  assert.equal(pomMovementPose(plan,from,to,.08,.08),'squash');
  assert.equal(pomMovementPose(plan,from,to,.5,.5),'stretch');
  assert.equal(pomMovementPose(plan,from,to,.9,.9),'squash');
});
test('step shape visibly squashes at takeoff and landing and stretches in flight',()=>{
  const start=stepJumpShape(.09),flight=stepJumpShape(.5),landing=stepJumpShape(.91);
  assert(start.x>1&&start.y<1);assert(flight.x<1&&flight.y>1);assert(landing.x>1&&landing.y<1);
});
test('level movement and falls retain their existing poses',()=>{
  assert.equal(pomMovementPose({},{y:4},{y:4},.5,.5),'calm');
  assert.equal(pomMovementPose({isFall:true},{y:1},{y:4},.5,.5),'float');
  assert.equal(pomMovementPose({isJump:true},{y:3},{y:3},.5,.5),'stretch');
});
