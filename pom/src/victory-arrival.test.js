import test from 'node:test';
import assert from 'node:assert/strict';
import {victoryArrival,victoryBoardBounds,victoryBoardClip,victoryExpandedFov,victoryFrameUnit,victoryMorphShape} from './victory-effects.js';
import {nodePose} from '../shared/movement-routes.js';

test('victory arrival stays over the goal support, including Peach’s single-square summit',()=>{
  for(const goal of [{x:4,y:0,z:0},{x:0,y:3,z:2},{x:8,y:1,z:1}]){
    const center=nodePose({height:7},goal).x;
    for(const reduced of [false,true])for(let i=0;i<=100;i++){
      const pose=victoryArrival(i/100,reduced);
      assert.equal(pose.x,0);
      assert.ok(center+pose.x-.38>=goal.x&&center+pose.x+.38<=goal.x+1);
    }
  }
});
test('the final arrival hop starts and lands continuously at the goal center',()=>{
  assert.deepEqual(victoryArrival(0),{x:0,y:0});
  assert.ok(victoryArrival(.45).y>0);
  const landing=victoryArrival(1);
  assert.equal(landing.x,0);assert.ok(Math.abs(landing.y)<1e-12);
});
test('reduced motion stays centered and removes the arrival hop',()=>{
  for(const t of [0,.25,.5,.75,1])assert.deepEqual(victoryArrival(t,true),{x:0,y:0});
});
test('celebration framing keeps Pom small on short levels and fits large puzzles',()=>{
  for(const [width,height] of [[390,844],[844,390]]){
    const starWidth=Math.min(width*.56,height*.29);
    const small=victoryFrameUnit(width,height,2,2);
    assert.ok(.72*small<=starWidth*.32+1e-9);
    const large=victoryFrameUnit(width,height,15,12);
    assert.ok(large*(15+.8)<=width-32+1e-9);
    assert.ok(large*(12+1.15)<=height-48+1e-9);
  }
});
test('victory expansion reveals the full canvas without resizing it',()=>{
  const board={left:-2,top:-2,right:392,bottom:846,width:394,height:848};
  const original={left:15,top:100,right:375,bottom:700,radius:10};
  assert.equal(victoryBoardClip(board,original,0),'inset(102px 17px 146px 17px round 10px)');
  assert.equal(victoryBoardClip(board,original,.5),'inset(51px 8.5px 73px 8.5px round 10px)');
  assert.equal(victoryBoardClip(board,original,1),'inset(0px 0px 0px 0px round 10px)');
  assert.deepEqual(victoryBoardBounds(board,original,.5),{left:6.5,top:49,width:377,height:724});
});
test('the shared victory outline starts at the canvas and ends at the rotating shape',()=>{
  const rectangle=[{x:0,y:0},{x:200,y:0}],star=[{x:100,y:0},{x:200,y:100}],center={x:100,y:100};
  assert.deepEqual(victoryMorphShape(rectangle,star,center,200,0,0),{path:'M0.00 0.00L200.00 0.00Z',clip:'polygon(0.00px 0.00px,200.00px 0.00px)'});
  assert.deepEqual(victoryMorphShape(rectangle,star,center,200,1,90),{path:'M200.00 100.00L100.00 200.00Z',clip:'polygon(200.00px 100.00px,100.00px 200.00px)'});
});
test('expanding the canvas preserves the initial perspective camera distance',()=>{
  const fov=35,ratio=1.8,expandedFov=victoryExpandedFov(fov,ratio);
  const distance=1/Math.tan(fov*Math.PI/360),expandedDistance=ratio/Math.tan(expandedFov*Math.PI/360);
  assert.ok(Math.abs(distance-expandedDistance)<1e-10);
});
