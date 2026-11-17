// Keep the camera still before and after the pan, including at the endpoints.
export function warpCameraProgress(elapsed, start, end, reducedMotion = false) {
  if (elapsed < start) return 0;
  if (reducedMotion || elapsed >= end) return 1;
  const t = (elapsed - start) / (end - start);
  return t * t * (3 - 2 * t);
}
