import test from 'node:test';
import assert from 'node:assert/strict';
import {animationCases,animationCaseLevel} from './animation-cases.js';
import {createMovementBoard,planMovement} from './movement-routes.js';
import {warpDestination,canReachPiece,safePieceChange} from '../shared/rules.js';

test('playable animation cases start on valid positions and pipe cases can warp',()=>{
  for(const item of animationCases){
    const level=animationCaseLevel(item.id,{}),board=createMovementBoard(level.grid,level.initialDepths);
    assert.equal(board.groups.length,level.initialDepths.length,item.id);
    assert(board.validNode(level.start),item.id);
    if(level.warpPairs.length)assert(warpDestination(board,level.start,level.warpPairs),item.id);
    assert.equal(level.temporaryPlaytest,true);
  }
  assert.equal(animationCaseLevel('missing',{}),null);
});
test('movement cases provide the intended reachable moves',()=>{
  const targets={walk:{x:1,y:3,z:0},step:{x:2,y:2,z:0},'gap-level':{x:2,y:3,z:0},'gap-down':{x:2,y:1,z:0},umbrella:{x:1,y:2,z:0}};
  for(const [id,target] of Object.entries(targets)){
    const level=animationCaseLevel(id,{}),board=createMovementBoard(level.grid,level.initialDepths),plan=planMovement(board,level.start,target);
    assert(plan,id);
    if(id.startsWith('gap'))assert(plan.isJump,id);
    if(id==='step')assert(plan.isStepJump,id);
    if(id==='umbrella')assert(plan.isFall,id);
  }
});
test('direct inverted-pipe scenario starts below the visible opening',()=>{
  const level=animationCaseLevel('inverted-under',{}),pipe=level.warpPairs[0][0];
  assert.equal(pipe.x,level.start.x);
  assert.equal(pipe.y,level.height-2);
  assert.equal(level.start.y,level.height);
  assert.equal(level.grid[level.height-1][pipe.x],'.');
});
test('push and pull cases start within reach of a movable piece',()=>{
  for(const [id,dir] of [['push',-1],['pull',1]]){
    const level=animationCaseLevel(id,{}),board=createMovementBoard(level.grid,level.initialDepths),piece=board.byCell[3][2];
    assert(canReachPiece(board,piece,level.start),id);
    assert(safePieceChange(board,piece,level.start,piece.depth+dir,dir),id);
  }
});
