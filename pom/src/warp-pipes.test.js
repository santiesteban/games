import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePuzzle,encodePuzzle,decodePuzzle,puzzleLevel} from '../shared/puzzle.js';
import {createMovementBoard} from '../shared/movement-routes.js';
import {warpDestination,replaySolution} from '../shared/rules.js';
import {solvePuzzle} from '../creator/src/solver.js';

function example(){
  return {format:'little-ledges-puzzle',schemaVersion:1,rulesVersion:1,id:'warp-test',name:'Warp test',
    grid:[...Array(31).fill('.'.repeat(32)),'0....11'+'.'.repeat(25)],palette:{0:[200,20,20],1:[20,20,200]},
    start:{x:0,y:31,z:0},goal:{x:6,y:31},initialDepths:[1,1],
    warpPairs:[[{x:0,y:31},{x:5,y:31}]]};
}
test('warp pairs survive validation, sharing links and game conversion',()=>{
  const p=validatePuzzle(example()),roundtrip=decodePuzzle(encodePuzzle(p));
  assert.deepEqual(roundtrip.warpPairs,p.warpPairs);assert.equal(roundtrip.revision,p.revision);
  assert.deepEqual(puzzleLevel(roundtrip).warpPairs,p.warpPairs);
  const changed=validatePuzzle({...example(),warpPairs:[[{x:0,y:31},{x:6,y:31}]],goal:{x:5,y:31}});
  assert.notEqual(p.revision,changed.revision);
});
test('warp requires both ends exposed, works in both directions and preserves their depths',()=>{
  const p=validatePuzzle(example()),board=createMovementBoard(p.grid,p.initialDepths);
  assert.deepEqual(warpDestination(board,p.start,p.warpPairs),{x:5,y:31,z:0});
  assert.deepEqual(warpDestination(board,{x:5,y:31,z:0},p.warpPairs),p.start);
  const closed=createMovementBoard(p.grid,[1,0]);assert.equal(warpDestination(closed,p.start,p.warpPairs),null);
  assert.equal(warpDestination(board,{x:0,y:31,z:1},p.warpPairs),null);
});
test('solver and replay use pipe actions to cross an otherwise impassable gap',()=>{
  const p=validatePuzzle(example()),result=solvePuzzle(p,{timeLimitMs:5000,maxStates:20000});
  assert.equal(result.status,'solvable');assert(result.actions.some(action=>action.type==='warp'));
  assert(replaySolution(p,result.actions));assert.equal(replaySolution(p,[{type:'warp'},{type:'warp'}]),false);
});
test('validation rejects incomplete, duplicated, floating and flag-overlapping pipes',()=>{
  const p=example(),source={x:0,y:31},destination={x:5,y:31};
  assert.throws(()=>validatePuzzle({...p,warpPairs:[[source]]}),/partner/);
  assert.throws(()=>validatePuzzle({...p,warpPairs:[[source,source]]}),/own square/);
  assert.throws(()=>validatePuzzle({...p,warpPairs:[[source,{x:4,y:31}]]}),/painted piece/);
  assert.throws(()=>validatePuzzle({...p,warpPairs:[[destination,p.goal]]}),/away from the flag/);
});
test('a raised piece above an endpoint prevents using either end',()=>{
  const grid=[...Array(30).fill('.'.repeat(32)),'.....2'+'.'.repeat(26),'0....11'+'.'.repeat(25)];
  const board=createMovementBoard(grid);for(const group of board.groups)group.depth=1;
  const pairs=[[{x:0,y:31},{x:5,y:31}]];
  assert.equal(warpDestination(board,{x:0,y:31,z:0},pairs),null);
  board.byCell[30][5].depth=0;
  assert.deepEqual(warpDestination(board,{x:0,y:31,z:0},pairs),{x:5,y:31,z:0});
});
test('multiple pipe pairs preserve their pairing and do not cross-connect',()=>{
  const p=validatePuzzle({...example(),grid:[...Array(31).fill('.'.repeat(32)),'0.1.2.33'+'.'.repeat(24)],palette:{0:[1,2,3],1:[4,5,6],2:[7,8,9],3:[10,11,12]},initialDepths:[1,1,1,1],goal:{x:7,y:31},warpPairs:[[{x:0,y:31},{x:2,y:31}],[{x:4,y:31},{x:6,y:31}]]});
  const copy=decodePuzzle(encodePuzzle(p)),board=createMovementBoard(copy.grid,copy.initialDepths);
  assert.deepEqual(copy.warpPairs,p.warpPairs);
  assert.deepEqual(warpDestination(board,{x:4,y:31,z:0},copy.warpPairs),{x:6,y:31,z:0});
});
