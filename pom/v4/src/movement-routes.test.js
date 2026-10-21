import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMovementBoard,planMovement,sampleMovement,movementSegmentClear,nodePose,findMovementPath,isSingleMove} from './movement-routes.js';
import {movementExamples,studioLevel} from './movement-studio.js';
const levels=JSON.parse(fs.readFileSync(new URL('./data/levels.json',import.meta.url)));

for(const example of movementExamples)test(`reported movement: ${example.label}`,()=>{
  const level=studioLevel(levels,example),board=createMovementBoard(level.grid,level.initialDepths);
  assert(board.validNode(example.from),'source is an exposed walking cell');assert(board.validNode(example.to),'destination is an exposed walking cell');
  const path=findMovementPath(board,example.from,example.to);
  assert(path,'the reported movement is reachable');
  assert.equal(path.length,example.multiStep?3:2,'adjacent targets are one movement; distant targets use individual steps');
  for(let edge=1;edge<path.length;edge++){
    const from=path[edge-1],to=path[edge],plan=planMovement(board,from,to);
    assert(plan);assert(isSingleMove(from,to));
    const a=nodePose(board,from),b=nodePose(board,to),ceiling=Math.max(a.y,b.y);
    let before=sampleMovement(plan,0);
    for(let frame=1;frame<=100;frame++){
      const p=sampleMovement(plan,frame/100);
      assert(movementSegmentClear(board,before,p),'the complete body stays clear of pieces');
      assert(p.y<=ceiling+.161,'no high jump over the corner');
      if(from.y===to.y)assert(Math.abs(p.y-a.y)<1e-8,'level travel never climbs then descends');
      if(plan.isFall)assert(p.y<=before.y+1e-8,'parachute descends without an upward launch');
      before=p;
    }
    for(const axis of ['x','y','z'])assert(Math.abs(before[axis]-b[axis])<1e-8);
  }
});

test('all eight one-cell directions are allowed on open ground',()=>{
  const board=createMovementBoard(['...','...']);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(dx||dz){
    const from={x:0,y:2,z:1},to={x:dx,y:2,z:1+dz},plan=planMovement(board,from,to);
    assert(plan);assert(plan.points.every(p=>p.y===.22));
  }
});

test('a long parachute drop still moves only one horizontal cell',()=>{
  const board=createMovementBoard(['R.','R.','R.','R.','R.','R.'],[2]);
  const plan=planMovement(board,{x:0,y:0,z:0},{x:1,y:6,z:0});
  assert(plan?.isFall);assert.equal(plan.points.at(-1).y,.22);
});

test('two-cell horizontal moves and climbs of two levels remain forbidden',()=>{
  assert(!isSingleMove({x:0,y:3,z:0},{x:2,y:2,z:0}));
  assert(!isSingleMove({x:0,y:3,z:0},{x:1,y:1,z:0}));
  assert(!isSingleMove({x:0,y:3,z:0},{x:0,y:2,z:2}));
  const example=movementExamples.find(ex=>ex.id==='parachute'),level=studioLevel(levels,example),board=createMovementBoard(level.grid,level.initialDepths);
  assert.equal(planMovement(board,example.to,example.from),null);
});

test('Pom cannot pass through a solid wall to a nearby target',()=>{
  const board={height:4,validNode:()=>true,blocks:[{min:{x:.9,y:-1,z:-1},max:{x:1.1,y:6,z:4}}]};
  assert.equal(planMovement(board,{x:0,y:2,z:0},{x:1,y:2,z:1}),null);
});
