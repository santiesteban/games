import test from 'node:test';
import assert from 'node:assert/strict';
import {SWITCH_HEIGHT,SWITCH_BASE_HEIGHT,SWITCH_PRESSED_HEIGHT,SWITCH_MOTION_DURATION,switchOccupied,switchBaseOffset,switchPomLift,updateSwitchMotion} from './pullout-switch-visual.js';

test('only Pom on the switch surface presses it',()=>{
  const item={x:2,y:4};
  assert.equal(switchOccupied(item,{x:2,y:4,z:1},2),true);
  assert.equal(switchOccupied(item,{x:2,y:4,z:0},2),false);
  assert.equal(switchOccupied(item,{x:2,y:5,z:1},2),false);
  assert.equal(switchOccupied(item,{x:3,y:4,z:1},2),false);
  assert.equal(switchOccupied(item,{x:2,y:4,z:-1},0),false);
  assert.equal(switchBaseOffset(1),-SWITCH_BASE_HEIGHT);
  assert.equal(switchBaseOffset(0),0);
  assert.equal(SWITCH_HEIGHT+switchBaseOffset(1),SWITCH_PRESSED_HEIGHT);
});

test('Pom rests on the moving switch at different camera pitches',()=>{
  for(const upY of [0,.5,1])for(const pressed of [0,.5,1]){
    const bottom=.379*.56*upY;
    assert.ok(Math.abs(.22+switchPomLift(upY,pressed)-bottom-(SWITCH_HEIGHT+switchBaseOffset(pressed)))<1e-12);
  }
});

test('switch moves with the pipe timing and reverses without jumping',()=>{
  let motion=updateSwitchMotion(undefined,0,0);
  motion=updateSwitchMotion(motion,1,100);
  assert.equal(motion.value,0);
  motion=updateSwitchMotion(motion,1,100+SWITCH_MOTION_DURATION/2);
  assert.equal(motion.value,.5);
  motion=updateSwitchMotion(motion,0,100+SWITCH_MOTION_DURATION/2);
  assert.equal(motion.value,.5);
  motion=updateSwitchMotion(motion,0,100+SWITCH_MOTION_DURATION);
  assert.equal(motion.value,.25);
  motion=updateSwitchMotion(motion,0,100+SWITCH_MOTION_DURATION*1.5);
  assert.equal(motion.value,0);
  motion=updateSwitchMotion(motion,1,1000,false);
  assert.equal(motion.value,1);
});
