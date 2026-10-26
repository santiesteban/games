const clamp = value => Math.max(0, Math.min(1, value));

// The trailing body follows smoothly behind the head, with no planted hold
// or separate reach-and-release beat.
export function reachTiming(time) {
  const t = clamp(time);
  return { head: t, tail: t - .14 * Math.sin(Math.PI * t) ** 2 };
}

// Lengthen the trailing half of the existing silhouette.
// The leading head and its eyes keep their familiar proportions; there is no
// second bulb, overall rotation, or change of silhouette when the lag is zero.
export function reachOutline(centers, idleContour, inset = 0) {
  const tail = centers[0], head = centers[centers.length - 1];
  const dx = tail.x - head.x, dy = tail.y - head.y, dz = tail.z - head.z;
  const span = Math.hypot(dx, dy), ux = dx / (span || 1), uy = dy / (span || 1);
  return idleContour.map(([x, y]) => {
    const weight = clamp(.5 + (x * ux + y * uy) / .85);
    const follow = weight * weight * (3 - 2 * weight);
    const radius = Math.hypot(x, y), shrink = Math.max(0, 1 - inset / (radius || 1));
    return { x: x * shrink + dx * follow, y: y * shrink + dy * follow, z: dz * follow };
  });
}

// The body can bend toward the camera. Its fill is one local depth unit in
// front of the outline; keep the whites ahead of both, with pupils above them.
export function reachFaceDepth(outline, fill) {
  return Math.max(2, ...outline.map(point => point.z + 1), ...fill.map(point => point.z + 2));
}

// Triangulate the deformed silhouette without allowing fill triangles to
// cross its outline as the body changes direction.
export function triangulateContour(points) {
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const area = points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0);
  const remaining = points.map((_, i) => i);
  if (area < 0) remaining.reverse();
  const triangles = [];
  while (remaining.length > 3) {
    let clipped = false;
    for (let j = 0; j < remaining.length; j++) {
      const a = remaining[(j + remaining.length - 1) % remaining.length], b = remaining[j], c = remaining[(j + 1) % remaining.length];
      if (cross(points[a], points[b], points[c]) <= 1e-9) continue;
      if (remaining.some(k => k !== a && k !== b && k !== c && cross(points[a], points[b], points[k]) > -1e-9 && cross(points[b], points[c], points[k]) > -1e-9 && cross(points[c], points[a], points[k]) > -1e-9)) continue;
      triangles.push(a, b, c); remaining.splice(j, 1); clipped = true; break;
    }
    if (!clipped) break;
  }
  if (remaining.length === 3) triangles.push(...remaining);
  return triangles;
}
