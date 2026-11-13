// Increase saturation and value in HSV so the pulse retains each pair's hue.
export function vibrantWarpColor({r,g,b}){
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  if(!delta)return {r,g,b};
  const value=Math.min(1,max*1.16),saturation=Math.min(1,(delta/max)*1.65+.06),floor=value*(1-saturation),scale=(value-floor)/delta;
  return {r:floor+(r-min)*scale,g:floor+(g-min)*scale,b:floor+(b-min)*scale};
}
export function warpPulsePhase(now,reducedMotion=false){return reducedMotion?.6:(1-Math.cos(now*Math.PI*2/1400))/2}
