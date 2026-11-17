import test from 'node:test';
import assert from 'node:assert/strict';
import {pomIdleMotion,pomMovementEyes} from './pom-idle-motion.js';

test('eyes blink while alert and become calm after ten seconds',()=>{
  assert.equal(pomMovementEyes(0,false),1);
  assert.equal(pomMovementEyes(2900,false),0);
  assert.equal(pomMovementEyes(3000,false),1);
  assert.equal(pomMovementEyes(9999,false),1);
  assert.equal(pomMovementEyes(10000,false),0);
  assert.equal(pomMovementEyes(12000,true),1);
});
test('resting motion stays subtle',()=>{
  for(let t=0;t<20000;t+=100)assert.ok(Math.abs(pomIdleMotion(t).breath)<=.009);
});
