import test from 'node:test';
import assert from 'node:assert/strict';
import {pomIdleMotion,pomMovementEyes} from './pom-idle-motion.js';

test('eyes open during movement and close shortly after stopping',()=>{
  assert.equal(pomMovementEyes(0,false,0),0);
  assert.equal(pomMovementEyes(400,true,0),1);
  assert.equal(pomMovementEyes(1000,false,2000),1);
  assert.ok(pomMovementEyes(1880,false,2000)>0&&pomMovementEyes(1880,false,2000)<1);
  assert.equal(pomMovementEyes(2000,false,2000),0);
});
test('resting motion stays subtle',()=>{
  for(let t=0;t<20000;t+=100)assert.ok(Math.abs(pomIdleMotion(t).breath)<=.009);
});
