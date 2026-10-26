/**
 * Tiny software depth renderer for Pom's axis-aligned box faces.
 * The scene remains 2D/canvas, but every opaque pixel and visible edge is
 * resolved using camera-space depth instead of painter-order guesses.
 */
export function drawDepthScene({ canvas, context, faces, camera, width, height, project, depthAt, fillFor, markers = [], markerActive = () => false }) {
  const scaleX = canvas.width / width;
  const scaleY = canvas.height / height;
  let surface = canvas.__pomDepthSurface;
  if (!surface) {
    surface = document.createElement('canvas');
    canvas.__pomDepthSurface = surface;
  }
  if (surface.width !== canvas.width || surface.height !== canvas.height) {
    surface.width = canvas.width;
    surface.height = canvas.height;
  }
  const raster = surface.getContext('2d', { willReadFrequently: true });
  const w = surface.width;
  const h = surface.height;
  const image = raster.createImageData(w, h);
  const zBuffer = new Float32Array(w * h);
  const owners = new Int16Array(w * h);
  zBuffer.fill(-Infinity);
  owners.fill(-1);
  const pixels = image.data;
  const projected = faces.map((face, index) => ({
    face,
    index,
    vertices: face.world.map((point) => {
      const screen = project(...point, camera);
      return { x: screen.x, y: screen.y, z: depthAt(...point, camera) };
    }),
    color: parseColor(fillFor(face)),
  }));

  // Rasterize each quad as two triangles. The depth value is affine over a
  // projected planar face, so this gives exact visibility at every pixel.
  for (const face of projected) {
    rasterTriangle(face, 0, 1, 2);
    rasterTriangle(face, 0, 2, 3);
  }

  // Draw only edges whose depth agrees with the nearest filled surface.
  // This keeps internal/seam edges while preventing them crossing a solid.
  for (const item of projected) {
    const { face, vertices } = item;
    const active = face.kind === 'front' && face.active;
    for (let i = 0; i < 4; i++) {
      drawLine(item, vertices[i], vertices[(i + 1) % 4], '#28251f', active ? 2 : 1.25);
    }
    if (face.kind === 'front' && active) drawFrontDetails(item);
  }

  // Landing tiles are overlays on the top planes, but still respect any box
  // face closer to the camera. Their strokes cannot leak across front panels.
  for (const marker of markers) {
    const points = [
      [marker.x, marker.y, marker.z], [marker.x + 1, marker.y, marker.z],
      [marker.x + 1, marker.y, marker.z + 1], [marker.x, marker.y, marker.z + 1],
    ].map((point) => {
      const screen = project(...point, camera);
      return { x: screen.x, y: screen.y, z: depthAt(...point, camera) };
    });
    const active = markerActive(marker);
    for (let i = 0; i < 4; i++) {
      drawLine({ index: -1 }, points[i], points[(i + 1) % 4], active ? '#ffdf3f' : 'rgba(40,37,31,.72)', active ? 2.2 : 1.25, !active, true);
    }
  }

  raster.putImageData(image, 0, 0);
  context.drawImage(surface, 0, 0, width, height);

  function rasterTriangle(item, ia, ib, ic) {
    const [a, b, c] = [item.vertices[ia], item.vertices[ib], item.vertices[ic]];
    const ax = a.x * scaleX, ay = a.y * scaleY;
    const bx = b.x * scaleX, by = b.y * scaleY;
    const cx = c.x * scaleX, cy = c.y * scaleY;
    const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(denominator) < 1e-8) return;
    const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
    const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const wa = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / denominator;
      const wb = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / denominator;
      const wc = 1 - wa - wb;
      if (wa < -0.0001 || wb < -0.0001 || wc < -0.0001) continue;
      const z = wa * a.z + wb * b.z + wc * c.z;
      const pixel = y * w + x;
      if (z <= zBuffer[pixel] + 1e-6) continue;
      zBuffer[pixel] = z;
      owners[pixel] = item.index;
      writePixel(pixel, item.color, 255);
    }
  }

  function writePixel(pixel, color, opacity = color[3]) {
    const i = pixel * 4;
    if (opacity >= 255) {
      pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2]; pixels[i + 3] = 255;
      return;
    }
    const alpha = opacity / 255, inverse = 1 - alpha;
    pixels[i] = Math.round(color[0] * alpha + pixels[i] * inverse);
    pixels[i + 1] = Math.round(color[1] * alpha + pixels[i + 1] * inverse);
    pixels[i + 2] = Math.round(color[2] * alpha + pixels[i + 2] * inverse);
    pixels[i + 3] = Math.min(255, Math.round(opacity + pixels[i + 3] * inverse));
  }

  function paintAt(item, x, y, z, color, radius, anyVisibleSurface = false) {
    const rgba = parseColor(color);
    const px = Math.round(x * scaleX), py = Math.round(y * scaleY);
    const r = Math.max(0, Math.ceil(radius * Math.max(scaleX, scaleY)));
    for (let yy = Math.max(0, py - r); yy <= Math.min(h - 1, py + r); yy++) {
      for (let xx = Math.max(0, px - r); xx <= Math.min(w - 1, px + r); xx++) {
        const dx = xx - px, dy = yy - py;
        if (dx * dx + dy * dy > r * r + 1) continue;
        const pixel = yy * w + xx;
        const visibleDepth = zBuffer[pixel];
        if (anyVisibleSurface) {
          if (!Number.isFinite(visibleDepth) || visibleDepth > z + 0.08) continue;
        } else {
          if (Number.isFinite(visibleDepth) && visibleDepth > z + 0.05) continue;
          const owner = projected[owners[pixel]];
          const sameSolidSeam = owner && owner.face.block === item.face.block && Math.abs(visibleDepth - z) <= 0.05;
          if (owners[pixel] !== item.index && !sameSolidSeam) continue;
        }
        writePixel(pixel, rgba, rgba[3]);
      }
    }
  }

  function drawLine(item, a, b, color, thickness, dashed = false, anyVisibleSurface = false) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const ax = a.x * scaleX, ay = a.y * scaleY;
    const bx = b.x * scaleX, by = b.y * scaleY;
    const vx = bx - ax, vy = by - ay, length2 = vx * vx + vy * vy;
    const radius = Math.max(0.65, thickness * Math.max(scaleX, scaleY) * 0.5);
    const minX = Math.max(0, Math.floor(Math.min(ax, bx) - radius));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + radius));
    const minY = Math.max(0, Math.floor(Math.min(ay, by) - radius));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(ay, by) + radius));
    const rgba = parseColor(color), radius2 = radius * radius;
    const logicalLength = Math.sqrt(length2) / Math.max(scaleX, scaleY);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const t = length2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / length2)) : 0;
      const ex = px - (ax + vx * t), ey = py - (ay + vy * t);
      if (ex * ex + ey * ey > radius2) continue;
      if (dashed && Math.floor((t * logicalLength) / 6) % 2) continue;
      const z = a.z + (b.z - a.z) * t, pixel = y * w + x, visibleDepth = zBuffer[pixel];
      if (anyVisibleSurface) {
        if (!Number.isFinite(visibleDepth) || visibleDepth > z + 0.08) continue;
      } else {
        if (Number.isFinite(visibleDepth) && visibleDepth > z + 0.05) continue;
        const owner = projected[owners[pixel]];
        const sameSolidSeam = owner && owner.face.block === item.face.block && Math.abs(visibleDepth - z) <= 0.08;
        if (owners[pixel] !== item.index && !sameSolidSeam) continue;
      }
      writePixel(pixel, rgba, rgba[3]);
    }
  }

  function drawFrontDetails(item) {
    const [a, b, c, d] = item.vertices;
    const inset = 4 / camera.u;
    const inner = [
      { x: a.x + inset * (b.x - a.x), y: a.y + inset * (d.y - a.y), z: a.z },
      { x: b.x - inset * (b.x - a.x), y: b.y + inset * (c.y - b.y), z: b.z },
      { x: c.x - inset * (c.x - d.x), y: c.y - inset * (c.y - b.y), z: c.z },
      { x: d.x + inset * (b.x - a.x), y: d.y - inset * (d.y - a.y), z: d.z },
    ];
    for (let i = 0; i < 4; i++) drawLine(item, inner[i], inner[(i + 1) % 4], item.face.selected ? '#28251f' : '#fff0d8', 1.5, true);
    const centerX = (a.x + b.x) / 2, centerY = (a.y + d.y) / 2;
    for (let t = 0; t < Math.PI * 2; t += Math.PI / 24) {
      paintAt(item, centerX + camera.u * 0.32 + Math.cos(t) * 1.1, centerY + camera.u * 0.18 + Math.sin(t) * 1.1, a.z, '#28251f', 1);
    }
  }
}

function parseColor(color) {
  const hex = color.match(/^#([\da-f]{6})$/i)?.[1];
  if (hex) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255];
  const rgba = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  return rgba ? [+rgba[1], +rgba[2], +rgba[3], rgba[4] === undefined ? 255 : Math.round(+rgba[4] * 255)] : [255, 255, 255, 255];
}
