import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { warpCameraProgress } from './warp-camera.js';

test('warp camera pans smoothly and stops at the destination', () => {
  assert.equal(warpCameraProgress(799, 800, 1550), 0);
  assert.equal(warpCameraProgress(800, 800, 1550), 0);
  assert.equal(warpCameraProgress(1175, 800, 1550), 0.5);
  assert.equal(warpCameraProgress(1550, 800, 1550), 1);
  assert.equal(warpCameraProgress(3000, 800, 1550), 1);
});

test('reduced motion moves directly to the destination when the pan begins', () => {
  assert.equal(warpCameraProgress(249, 250, 650, true), 0);
  assert.equal(warpCameraProgress(250, 250, 650, true), 1);
});
