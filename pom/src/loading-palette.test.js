import test from 'node:test';
import assert from 'node:assert/strict';
import {loadingPalette} from './loading-palette.js';

test('loading colors come from the pieces actually used in the puzzle',()=>{
  const level={grid:['A.B','BCA'],palette:{A:[10,20,30],B:[90,80,70],C:[10,20,30],D:[255,0,0]}};
  assert.deepEqual(loadingPalette(level),[[10,20,30],[90,80,70]]);
});
test('loading colors fall back safely when a puzzle has no usable palette',()=>{
  assert.deepEqual(loadingPalette({grid:['A'],palette:{A:[-1,0,0]}}),[[255,152,42]]);
  assert.deepEqual(loadingPalette(),[[255,152,42]]);
});
