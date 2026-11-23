import test from 'node:test';
import assert from 'node:assert/strict';
import {pieceNutPositions} from './piece-nuts.js';

test('fasteners appear at convex piece corners, not along straight joins',()=>{
  assert.deepEqual(pieceNutPositions([{x:0,y:0}]),[{x:.15,y:.15},{x:.85,y:.15},{x:.85,y:.85},{x:.15,y:.85}]);
  assert.equal(pieceNutPositions([{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}]).length,4);
  assert.equal(pieceNutPositions([{x:0,y:0},{x:1,y:0}]).length,4);
  assert.equal(pieceNutPositions([{x:0,y:0},{x:1,y:0},{x:0,y:1}]).length,5);
});
