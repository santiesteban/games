import test from 'node:test';
import assert from 'node:assert/strict';
import {smallGridPlacement} from '../creator/src/small-grid.js';
function puzzle(cells,start){const grid=Array.from({length:32},()=>Array(32).fill('.'));for(const [x,y] of cells)grid[y][x]='0';return {grid,manualStart:!!start,start}}
test('a sixteen-cell-wide puzzle can be moved into the centered view',()=>{
  assert.deepEqual(smallGridPlacement(puzzle([[9,16],[24,31]])),{fits:true,inside:false,dx:-1,dy:0});
  assert.equal(smallGridPlacement(puzzle([[8,16],[23,31]])).inside,true);
  assert.equal(smallGridPlacement(puzzle([[8,16],[24,31]])).fits,false);
});
test('placement accounts for height and a manually placed Pom',()=>{
  assert.deepEqual(smallGridPlacement(puzzle([[2,0],[5,5]])),{fits:true,inside:false,dx:12,dy:26});
  assert.equal(smallGridPlacement(puzzle([[8,16],[23,31]],{x:24,y:32})).fits,false);
  assert.equal(smallGridPlacement(puzzle([[8,15],[23,31]])).fits,false);
});
