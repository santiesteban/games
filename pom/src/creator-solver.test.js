import test from 'node:test';
import assert from 'node:assert/strict';
import {solvePuzzle,possibleMovement} from '../creator/src/solver.js';
import {previewPuzzles} from '../creator/src/gallery-preview.js';
import {createMovementBoard,planMovement} from '../shared/movement-routes.js';
import {replaySolution} from '../shared/rules.js';

const staircase=()=>previewPuzzles().find(({puzzle})=>puzzle.name==='Staircase').puzzle;

test('solver finds and verifies a path involving moves and piece pulls',()=>{
  const puzzle=staircase(),result=solvePuzzle(puzzle,{timeLimitMs:5000,maxStates:20000});
  assert.equal(result.status,'solvable');
  assert(result.actions.some(action=>action.type==='move'));
  assert(result.actions.some(action=>action.type==='piece'&&action.dir===1));
  assert(replaySolution(puzzle,result.actions));
});

test('limits produce undetermined rather than an incorrect impossibility result',()=>{
  assert.equal(solvePuzzle(staircase(),{timeLimitMs:0}).status,'undetermined');
  assert.equal(solvePuzzle(staircase(),{timeLimitMs:5000,maxStates:1}).status,'undetermined');
});

test('exhausted search reports unsolvable only after exploring the reachable states',()=>{
  const puzzle=previewPuzzles().find(({puzzle})=>puzzle.name==='Sunrise Steps').puzzle;
  const result=solvePuzzle(puzzle,{timeLimitMs:5000,maxStates:20000});
  assert.equal(result.status,'unsolvable');assert(result.visited>1);
});

test('the geometry filter preserves every move and jump accepted by the game',()=>{
  const boards=[createMovementBoard(['...','...','...']),createMovementBoard(['00.1','00.1','22.1'],[1,2,1])];
  for(const board of boards)for(let y=0;y<=board.height;y++)for(let x=-1;x<=board.width;x++)for(const from of board.nodesAt(x,y)){
    for(let dy=-1;dy<=board.height-from.y;dy++)for(let dx=-3;dx<=3;dx++)for(const to of board.nodesAt(from.x+dx,from.y+dy)){
      if(planMovement(board,from,to))assert(possibleMovement(from,to),`discarded ${JSON.stringify({from,to})}`);
    }
  }
});

test('the creator accepts the same three gap-jump landings as gameplay',()=>{
  const board=createMovementBoard(['R.R'],[3,3]),from={x:0,y:0,z:1};
  for(const z of [0,1,2]){
    const to={x:2,y:0,z};
    assert(planMovement(board,from,to)?.isJump);
    assert(possibleMovement(from,to));
  }
});
