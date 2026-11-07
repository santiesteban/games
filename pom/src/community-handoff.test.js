import test from 'node:test';
import assert from 'node:assert/strict';
import {gameUrl, validatePuzzle} from '../shared/puzzle.js';
import {puzzleFromTransfer} from '../shared/puzzle-transfer.js';

const game='https://santiesteban.github.io/games/pom/';
const puzzle=validatePuzzle({format:'little-ledges-puzzle',schemaVersion:1,rulesVersion:1,id:'community-test',name:'Community test',grid:Array(31).fill('.'.repeat(32)).concat('0'+'.'.repeat(31)),palette:{0:[1,2,3]},start:{x:0,y:32,z:0},goal:{x:0,y:31},initialDepths:[0]});

test('gallery link delivers a complete puzzle through the native import contract',()=>{
  const url=gameUrl(game,'puzzle',puzzle);
  assert.deepEqual(puzzleFromTransfer({kind:'url',url},[game]),puzzle);
});

test('native import rejects a link from an untrusted game address',()=>{
  const url=gameUrl('https://example.com/','puzzle',puzzle);
  assert.throws(()=>puzzleFromTransfer({kind:'url',url},[game]),/not a Little Ledges import link/);
});
