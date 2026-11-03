// Pan and zoom share one smooth motion, with no stop between adjustments.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10)};
export const INTRO_HOLD_MS=1600,INTRO_PAN_MS=850,INTRO_ZOOM_MS=1000;
export function sampleCameraIntro(elapsed,fromUnit,toUnit){
  const zoom=toUnit>fromUnit*1.01,duration=zoom?INTRO_PAN_MS+INTRO_ZOOM_MS:0;
  if(elapsed<INTRO_HOLD_MS)return{phase:'overview',pan:0,unit:fromUnit,done:false};
  if(elapsed<INTRO_HOLD_MS+duration){
    const t=smooth((elapsed-INTRO_HOLD_MS)/duration);
    return{phase:'zoom',pan:t,unit:fromUnit*Math.exp(Math.log(toUnit/fromUnit)*t),done:false};
  }
  return{phase:'ready',pan:1,unit:toUnit,done:true};
}

// Opening framing is separate from the maximum interactive zoom. Small screens
// should show at least eight cells across and five vertically around Pom.
export function initialCameraUnit({fitUnit,width,height,mobile}){
  const target=mobile?Math.min(56,width/8,height/5):64;
  return Math.max(fitUnit,target);
}
