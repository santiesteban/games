import test from 'node:test';
import assert from 'node:assert/strict';
import {floorOutlinePoints,snapFloorLine} from './floor-grid.js';

test('floor outline keeps the back corners square and rounds the front corners',()=>{
  const corners=[{x:0,y:0},{x:100,y:0},{x:100,y:80},{x:0,y:80}];
  const points=floorOutlinePoints(corners,10);
  assert.deepEqual(points[0],corners[0]);assert.deepEqual(points[1],corners[1]);
  assert.deepEqual(points[2],{x:100,y:70});assert.deepEqual(points[10],{x:90,y:80});
  assert.deepEqual(points[11],{x:10,y:80});assert.deepEqual(points[19],{x:0,y:70});
  assert.deepEqual(points.at(-1),corners[0]);
});

test('axis-aligned grid lines snap to device pixels without altering diagonals',()=>{
  assert.deepEqual(snapFloorLine({x:0,y:4.3},{x:10,y:4.3},2,1),[{x:0,y:4},{x:10,y:4}]);
  assert.deepEqual(snapFloorLine({x:4.3,y:0},{x:4.3,y:10},2,2),[{x:4.5,y:0},{x:4.5,y:10}]);
  const a={x:0,y:0},b={x:10,y:4};assert.deepEqual(snapFloorLine(a,b,2,1),[a,b]);
});
