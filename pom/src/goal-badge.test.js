import test from 'node:test';
import assert from 'node:assert/strict';
import {goalBadgeVisible} from './goal-badge.js';

test('goal badge remains visible until the raised goal is uncovered',()=>{
  assert.equal(goalBadgeVisible(0,null),true);
  assert.equal(goalBadgeVisible(1,1),true);
  assert.equal(goalBadgeVisible(1,2),true);
  assert.equal(goalBadgeVisible(2,1),false);
  assert.equal(goalBadgeVisible(1,null),false);
  assert.equal(goalBadgeVisible(1,1,true),false);
});
