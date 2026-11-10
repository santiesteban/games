// Pan and zoom share one smooth motion, with no stop between adjustments.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10)};
export const INTRO_HOLD_MS=1600,INTRO_PAN_MS=850,INTRO_ZOOM_MS=1000;
export function sampleCameraIntro(elapsed,fromUnit,toUnit){
  const zoom=Math.abs(Math.log(toUnit/fromUnit))>.01,duration=zoom?INTRO_PAN_MS+INTRO_ZOOM_MS:0;
  if(elapsed<INTRO_HOLD_MS)return{phase:'overview',pan:0,unit:fromUnit,done:false};
  if(elapsed<INTRO_HOLD_MS+duration){
    const t=smooth((elapsed-INTRO_HOLD_MS)/duration);
    return{phase:'zoom',pan:t,unit:fromUnit*Math.exp(Math.log(toUnit/fromUnit)*t),done:false};
  }
  return{phase:'ready',pan:1,unit:toUnit,done:true};
}

// Use the smaller scale so a short or narrow play area still has room to play.
export function initialCameraUnit({width,height}){
  return Math.max(1,Math.min(width/7.4,height/10));
}

export function openingFrameFits(points,width,height){
  const margin=Math.min(width,height)*.06;
  return points.every(point=>point&&point.x>=margin&&point.x<=width-margin&&point.y>=margin&&point.y<=height-margin);
}
