/** Camera-space depth for Pom's oblique 2D projection. Larger values are nearer. */
export function cameraDepth(x, y, z, camera) {
  const k = camera.d / camera.u;
  return z - camera.side * k * x - k * y;
}

export function projectWorldPoint([x, y, z], camera) {
  return {
    x: camera.x + x * camera.u + camera.side * z * camera.d,
    y: camera.y + y * camera.u + z * camera.d,
  };
}

/** Only Pom's exact supporting tile is exempt from top-face occlusion. */
export function isSupportTopFace(face, supportCell) {
  return face.kind === 'top'
    && supportCell !== null
    && supportCell !== undefined
    && face.cell?.x === supportCell.x
    && face.cell?.y === supportCell.y;
}

/**
 * Clip a projected block face to the part that is in front of Pom.
 * Depth varies linearly across both planes, so the boundary is a line and
 * polygon clipping gives an exact result without pixel-sized sample gaps.
 */
export function faceOcclusionPolygon(worldFace, actor, actorScreenCenter, camera, epsilon = 1e-5) {
  const vertices = worldFace.map((world) => {
    const screen = projectWorldPoint(world, camera);
    const actorAtScreen = cameraDepth(
      actor.x + 0.5 + (screen.x - actorScreenCenter.x) / camera.u,
      actor.y + (screen.y - actorScreenCenter.y) / camera.u,
      actor.z + 0.5,
      camera,
    );
    return {
      ...screen,
      delta: cameraDepth(...world, camera) - actorAtScreen - epsilon,
    };
  });

  const clipped = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const aInside = a.delta > 0;
    const bInside = b.delta > 0;
    if (aInside) clipped.push({ x: a.x, y: a.y });
    if (aInside !== bInside) {
      const t = a.delta / (a.delta - b.delta);
      clipped.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      });
    }
  }
  return clipped;
}
