import test from 'node:test';
import assert from 'node:assert/strict';
import { faceOcclusionPolygon, isSupportTopFace } from '../src/occlusion.js';

test('only Pom’s exact supporting tile is exempt inside a connected block', () => {
  const supportCell = { x: 3, y: 4 };
  const supportTop = { kind: 'top', cell: { x: 3, y: 4 }, block: 'shared-piece' };
  const adjacentTop = { kind: 'top', cell: { x: 4, y: 4 }, block: 'shared-piece' };
  const supportSide = { kind: 'side', cell: { x: 3, y: 4 }, block: 'shared-piece' };

  assert.equal(isSupportTopFace(supportTop, supportCell), true);
  assert.equal(isSupportTopFace(adjacentTop, supportCell), false);
  assert.equal(isSupportTopFace(supportSide, supportCell), false);
});

function screenPoint(actor, camera) {
  return {
    x: camera.x + (actor.x + 0.5) * camera.u + camera.side * (actor.z + 0.5) * camera.d,
    y: camera.y + actor.y * camera.u + (actor.z + 0.5) * camera.d,
  };
}

function worldFaceAtScreenRect(rect, z, camera) {
  const inverse = ([x, y]) => [
    (x - camera.x - camera.side * z * camera.d) / camera.u,
    (y - camera.y - z * camera.d) / camera.u,
    z,
  ];
  return [
    inverse([rect.left, rect.top]),
    inverse([rect.right, rect.top]),
    inverse([rect.right, rect.bottom]),
    inverse([rect.left, rect.bottom]),
  ];
}

for (const side of [-1, 1]) {
  test(`a nearer face fully occludes Pom for camera side ${side}`, () => {
    const camera = { x: 200, y: 100, u: 100, d: 42, side };
    const actor = { x: 2, y: 3, z: 0 };
    const center = screenPoint(actor, camera);
    const face = worldFaceAtScreenRect({
      left: center.x - 40,
      right: center.x + 40,
      top: center.y - 42,
      bottom: center.y + 8,
    }, 2, camera);

    const clipped = faceOcclusionPolygon(face, actor, center, camera);
    assert.equal(clipped.length, 4);
  });

  test(`a farther face never occludes Pom for camera side ${side}`, () => {
    const camera = { x: 200, y: 100, u: 100, d: 42, side };
    const actor = { x: 2, y: 3, z: 0 };
    const center = screenPoint(actor, camera);
    const face = worldFaceAtScreenRect({
      left: center.x - 40,
      right: center.x + 40,
      top: center.y - 42,
      bottom: center.y + 8,
    }, -1, camera);

    assert.deepEqual(faceOcclusionPolygon(face, actor, center, camera), []);
  });

  test(`a nearer face clips to its actual overlap for camera side ${side}`, () => {
    const camera = { x: 200, y: 100, u: 100, d: 42, side };
    const actor = { x: 2, y: 3, z: 0 };
    const center = screenPoint(actor, camera);
    const face = worldFaceAtScreenRect({
      left: center.x,
      right: center.x + 40,
      top: center.y - 42,
      bottom: center.y + 8,
    }, 2, camera);

    const clipped = faceOcclusionPolygon(face, actor, center, camera);
    assert.equal(clipped.length, 4);
    assert.ok(clipped.every(({ x }) => x >= center.x - 1e-6));
    assert.ok(clipped.some(({ x }) => x > center.x + 39));
  });

  test(`a sloped face is clipped where its depth crosses Pom for camera side ${side}`, () => {
    const camera = { x: 200, y: 100, u: 100, d: 42, side };
    const actor = { x: 0, y: 0, z: 0.5 };
    const center = screenPoint(actor, camera);
    const slopedFace = [[0, 0, 0], [1, 0, 0], [1, 0, 2], [0, 0, 2]];

    const clipped = faceOcclusionPolygon(slopedFace, actor, center, camera);
    assert.equal(clipped.length, 4);
    // Two corners lie in front; the other two vertices are generated on the
    // exact depth-equality boundary instead of approximated by screen samples.
    const originalScreen = slopedFace.map(([x, y, z]) => ({
      x: camera.x + x * camera.u + side * z * camera.d,
      y: camera.y + y * camera.u + z * camera.d,
    }));
    const generated = clipped.filter((point) =>
      !originalScreen.some((original) =>
        Math.hypot(point.x - original.x, point.y - original.y) < 1e-6,
      ),
    );
    assert.equal(generated.length, 2);
  });
}
