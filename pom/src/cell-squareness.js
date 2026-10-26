// Board geometry only: the camera, projection, depth shear and floor stay unchanged.
export function cellYStretch(value,pitch){
  const s=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
  if(s===0)return 1; // Preserve the original geometry exactly, including at animated pitches.
  return (1-s)+s/Math.max(.001,Math.cos(pitch));
}
export function stretchBoardY(y,stretch,floorY=0){return stretch===1?y:floorY+(y-floorY)*stretch}
export function unStretchBoardY(y,stretch,floorY=0){return stretch===1?y:floorY+(y-floorY)/stretch}
