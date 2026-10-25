import test from 'node:test';
import assert from 'node:assert/strict';
import { victoryLandingOffset, victoryArrival } from './victory-effects.js';

test('Pom celebrates on the approach side of the centered flag',()=>{
  assert.equal(victoryLandingOffset({x:2},{x:3},4),-.60);
  assert.equal(victoryLandingOffset({x:1},{x:0},4),.80);
  assert.equal(victoryLandingOffset({x:0},{x:0},4),.80);
  assert.equal(victoryLandingOffset({x:3},{x:3},4),-.60);
});
test('the final hop starts continuously and settles beside the flag before landing',()=>{
  for(const side of [-.60,.80]){
    const start=victoryArrival(0,side);
    assert.ok(Math.abs(start.x)<1e-12&&start.y===0);
    const middle=victoryArrival(.45,side);
    assert.ok(middle.y>0&&Math.abs(middle.x)<Math.abs(side));
    const landing=victoryArrival(1,side);
    assert.equal(landing.x,side);
    assert.ok(Math.abs(landing.y)<1e-12);
  }
});
test('reduced motion removes the extra hop while retaining flag clearance',()=>{
  assert.equal(victoryArrival(.5,.80,true).y,0);
  assert.equal(victoryArrival(1,.80,true).x,.80);
});
