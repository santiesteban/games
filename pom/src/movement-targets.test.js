import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestMovementTarget} from './movement-targets.js';
const square=(id,x,y,size=20)=>({node:id,polygon:[{x,y},{x:x+size,y},{x:x+size,y:y+size},{x,y:y+size}]});
test('accepts taps just outside a square within the screen-space margin',()=>{
 const candidates=[square('a',10,10)];
 assert.equal(nearestMovementTarget({x:35,y:20},candidates,{margin:6}),'a');
 assert.equal(nearestMovementTarget({x:37,y:20},candidates,{margin:6}),null);
});
test('the larger floor margin reaches a little farther without capturing distant taps',()=>{
 const floor=[square('floor',10,10)];
 assert.equal(nearestMovementTarget({x:45,y:20},floor,{margin:12}),null);
 assert.equal(nearestMovementTarget({x:45,y:20},floor,{margin:18}),'floor');
 assert.equal(nearestMovementTarget({x:49,y:20},floor,{margin:18}),null);
});
test('prefers a direct hit and picks the nearer square when margins overlap',()=>{
 const candidates=[square('a',0,0),square('b',24,0)];
 assert.equal(nearestMovementTarget({x:25,y:10},candidates),'b');
 assert.equal(nearestMovementTarget({x:21,y:10},candidates),'a');
 assert.equal(nearestMovementTarget({x:23,y:10},candidates),'b');
});
test('skips occluded squares and samples just inside their visible geometry',()=>{
 const candidates=[square('front',0,0),square('back',0,0)];let sample;
 const hit=nearestMovementTarget({x:21,y:10},candidates,{visible:(candidate,p)=>{sample=p;return candidate.node==='back'}});
 assert.equal(hit,'back');assert(sample.x<20&&sample.x>=19);
 assert.equal(nearestMovementTarget({x:10,y:10},candidates,{visible:()=>false}),null);
});
test('finds the nearest reachable top just above or below a thin platform edge',()=>{
 const tops=[square('left',100,100,20),square('right',122,100,20)];
 assert.equal(nearestMovementTarget({x:116,y:91},tops),'left');
 assert.equal(nearestMovementTarget({x:124,y:128},tops),'right');
 assert.equal(nearestMovementTarget({x:124,y:134},tops),null);
});
