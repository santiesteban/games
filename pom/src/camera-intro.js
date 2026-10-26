// Zero velocity and acceleration at both ends keeps the overview, pan and zoom
// joins smooth. Interpolate zoom in log scale for an even perceived size change.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10)};
export const INTRO_HOLD_MS=1600,INTRO_PAN_MS=850,INTRO_ZOOM_MS=1000;
export function sampleCameraIntro(elapsed,fromUnit,toUnit){
  const zoom=toUnit>fromUnit*1.01,panEnd=INTRO_HOLD_MS+(zoom?INTRO_PAN_MS:0),end=panEnd+(zoom?INTRO_ZOOM_MS:0);
  if(elapsed<INTRO_HOLD_MS)return{phase:'overview',pan:0,unit:fromUnit,done:false};
  if(elapsed<panEnd)return{phase:'pan',pan:smooth((elapsed-INTRO_HOLD_MS)/INTRO_PAN_MS),unit:fromUnit,done:false};
  if(elapsed<end){const t=smooth((elapsed-panEnd)/INTRO_ZOOM_MS);return{phase:'zoom',pan:1,unit:Math.exp(Math.log(fromUnit)+(Math.log(toUnit)-Math.log(fromUnit))*t),done:false}}
  return{phase:'ready',pan:1,unit:toUnit,done:true};
}
