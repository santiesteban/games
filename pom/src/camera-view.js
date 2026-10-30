// Keep the original down angle; the forward angle is halfway to a flat elevation view.
export const CAMERA_PITCHES=[.38,.19];
export const DEFAULT_VIEW={horizontal:1,vertical:0};
export function cameraStep(value){return Number.isFinite(value)?Math.max(-1,Math.min(1,Math.round(value))):0}
export function cameraSlant(horizontal){return[-1,.5,1][cameraStep(horizontal)+1]}
export function cameraPosition(horizontal,vertical){
  const x=cameraStep(horizontal),y=Number.isFinite(vertical)?Math.max(0,Math.min(1,Math.round(vertical))):0;
  return{horizontal:x,vertical:y,pitch:CAMERA_PITCHES[y],slant:cameraSlant(x)};
}
