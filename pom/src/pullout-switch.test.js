import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePuzzle,encodePuzzle,decodePuzzle,puzzleLevel} from '../shared/puzzle.js';
import {createMovementBoard} from '../shared/movement-routes.js';
import {pulloutSwitchState,replaySolution} from '../shared/rules.js';
import {solvePuzzle} from '../creator/src/solver.js';
import {loadLevelCatalog} from '../shared/level-format.js';
import {puzzleSignature} from './unfinished-puzzles.js';

function example(){
  return {format:'little-ledges-puzzle',schemaVersion:1,rulesVersion:2,id:'switch-test',name:'Switch test',
    grid:[...Array(31).fill('.'.repeat(32)),'A.BBC.DD'+'.'.repeat(24)],palette:{A:[200,20,20],B:[20,20,200],C:[20,200,20],D:[200,200,20]},
    start:{x:0,y:31,z:0},goal:{x:7,y:31},initialDepths:[1,1,1,1],
    warpPairs:[[{x:2,y:31},{x:3,y:31}]],switches:[{x:0,y:31,color:'C'}]};
}
test('switches survive canonicalization, links and game conversion',()=>{
  const puzzle=validatePuzzle(example()),copy=decodePuzzle(encodePuzzle(puzzle));
  assert.deepEqual(puzzle.switches,[{x:0,y:31,color:'2'}]);
  assert.deepEqual(copy,puzzle);assert.deepEqual(puzzleLevel(copy).switches,puzzle.switches);
  assert.notEqual(validatePuzzle({...example(),switches:[{x:0,y:31,color:'B'}]}).revision,puzzle.revision);
});
test('switches cannot overlap flags, pipes, or other switches',()=>{
  const puzzle=example();
  assert.throws(()=>validatePuzzle({...puzzle,switches:[{x:7,y:31,color:'A'}]}),/flag/);
  assert.throws(()=>validatePuzzle({...puzzle,switches:[{x:2,y:31,color:'A'}]}),/warp pipes/);
  assert.throws(()=>validatePuzzle({...puzzle,switches:[{x:0,y:31,color:'A'},{x:0,y:31,color:'B'}]}),/other switches/);
  assert.throws(()=>validatePuzzle({...puzzle,switches:[{x:1,y:31,color:'A'}]}),/painted piece/);
  assert.throws(()=>validatePuzzle({...puzzle,switches:[{x:0,y:31,color:'Z'}]}),/color/);
  assert.throws(()=>validatePuzzle({...puzzle,rulesVersion:1}),/version 2/);
});
test('legacy puzzles retain their original revision and link format',()=>{
  const {switches,...legacy}=example();legacy.rulesVersion=1;
  const puzzle=validatePuzzle(legacy),token=encodePuzzle(puzzle);
  assert.equal(Uint8Array.from(atob(token.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))[0],1);
  assert.deepEqual(decodePuzzle(token),puzzle);
});
test('a switch pulls every matching disconnected piece to maximum depth',()=>{
  const board=createMovementBoard(['R.R','SSS'],[0,2,1]);
  const result=pulloutSwitchState(board,{x:1,y:1,z:0},[{x:1,y:1,color:'R'}]);
  assert.deepEqual(result.depths,[3,3,1]);assert.deepEqual(result.player,{x:1,y:1,z:0});
  assert.equal(pulloutSwitchState(createMovementBoard(['R.R','SSS'],result.depths),result.player,[{x:1,y:1,color:'R'}]),null);
});
test('Pom jumps onto an extending piece when its top is exposed',()=>{
  const board=createMovementBoard(['R','S'],[0,1]);
  const result=pulloutSwitchState(board,{x:0,y:1,z:0},[{x:0,y:1,color:'R'}]);
  assert.deepEqual(result.depths,[3,1]);assert.deepEqual(result.player,{x:0,y:0,z:0});
  assert.equal(result.movements[0].type,'jump');
});
test('Pom is pushed and falls to the first surface when he cannot jump',()=>{
  const board=createMovementBoard(['B','R','S'],[3,0,1]);
  const result=pulloutSwitchState(board,{x:0,y:2,z:0},[{x:0,y:2,color:'R'}]);
  assert.deepEqual(result.depths,[3,3,1]);assert.deepEqual(result.player,{x:0,y:3,z:1});
  assert.equal(result.movements[0].type,'fall');
});
test('solver and replay activate a switch under Pom at the start',()=>{
  const puzzle=validatePuzzle({...example(),grid:[...Array(31).fill('.'.repeat(32)),'AB'+'.'.repeat(30)],palette:{A:[200,20,20],B:[20,20,200]},goal:{x:1,y:31},initialDepths:[1,0],warpPairs:[],switches:[{x:0,y:31,color:'B'}]});
  const result=solvePuzzle(puzzle,{timeLimitMs:5000,maxStates:20000});
  assert.equal(result.status,'solvable');assert(replaySolution(puzzle,result.actions));
});
test('catalog levels validate switch placement and preserve switch-free saves',()=>{
  const catalog={format:'little-ledges',schemaVersion:1,groups:[{id:'test',name:'Test'}],levels:[{id:'test-level',number:1,group:'test',name:'Test',coordinateOrigin:'top-left',emptyCell:'.',width:4,height:1,palette:{A:[1,2,3],B:[4,5,6]},grid:['A.BB'],start:{x:0,y:1,z:0},goal:{x:3,y:0},switches:[{x:0,y:0,color:'B'}]}]};
  const level=loadLevelCatalog(catalog).levels[0];assert.deepEqual(level.switches,[{x:0,y:0,color:'B'}]);
  assert.throws(()=>loadLevelCatalog({...catalog,levels:[{...catalog.levels[0],switches:[{x:3,y:0,color:'B'}]}]}),/overlap the flag/);
  const legacy={...catalog.levels[0],switches:undefined};
  assert.equal(puzzleSignature(legacy),puzzleSignature({...legacy,switches:[]}));
  assert.notEqual(puzzleSignature(legacy),puzzleSignature({...legacy,switches:[{x:0,y:0,color:'B'}]}));
});