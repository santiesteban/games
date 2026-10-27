// Geometry-only visibility study. Samples Pom's core silhouette against solid
// board cells; decorative scenery and the through-wall helper are excluded.
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul=(a,k)=>({x:a.x*k,y:a.y*k,z:a.z*k});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const offsets=[[0,0],[-.2,0],[.2,0],[0,.18],[-.14,.14],[.14,.14],[0,-.12],[-.13,-.1],[.13,-.1]];
export const MAX_VISIBILITY_PITCH=65*Math.PI/180;
function axes(yaw,pitch){
  return {right:{x:Math.cos(yaw),y:0,z:-Math.sin(yaw)},up:{x:-Math.sin(yaw)*Math.sin(pitch),y:Math.cos(pitch),z:-Math.cos(yaw)*Math.sin(pitch)},back:{x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:Math.cos(yaw)*Math.cos(pitch)}};
}
// Rotate the frame around Pom while preserving his camera-space position and
// scale. This also works when he is deliberately off-center after a pan.
export function visibilityCameraPose({position,focus,distance,yaw,currentPitch,pitch}){
  const before=axes(yaw,currentPitch),after=axes(yaw,pitch),relative=sub(position,focus);
  const offset=add(add(mul(after.right,dot(relative,before.right)),mul(after.up,dot(relative,before.up))),mul(after.back,dot(relative,before.back)));
  const target=sub(position,offset);
  return {...after,focus:target,eye:add(target,mul(after.back,distance))};
}
function blocked(origin,end,boxes){
  const direction=sub(end,origin);
  for(const box of boxes){
    let near=0,far=1;
    for(const axis of ['x','y','z']){
      const low=box.min[axis]+.002,high=box.max[axis]-.002,d=direction[axis];
      if(Math.abs(d)<1e-9){if(origin[axis]<low||origin[axis]>high){far=-1;break}continue}
      const a=(low-origin[axis])/d,b=(high-origin[axis])/d;
      near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
      if(near>far)break;
    }
    if(far>1e-5&&near<=far&&near<1)return true;
  }
  return false;
}
export function visibilityAtPitch(options){
  const pose=visibilityCameraPose(options);
  let visible=0;
  for(const [x,y]of offsets){
    const point=add(options.position,add(mul(pose.right,x),mul(pose.up,y)));
    const end=options.perspective?pose.eye:add(point,mul(pose.back,100));
    if(!blocked(point,end,options.boxes))visible++;
  }
  return visible/offsets.length;
}
export function chooseVisibilityPitch(options){
  const {basePitch}=options,maxPitch=Math.max(basePitch,MAX_VISIBILITY_PITCH),step=3*Math.PI/180;
  const baseVisibility=visibilityAtPitch({...options,pitch:basePitch});
  let best={pitch:basePitch,visibility:baseVisibility,baseVisibility};
  if(baseVisibility>=8/9)return best;
  for(let pitch=Math.min(basePitch+step,maxPitch);pitch<=maxPitch+1e-8;pitch=Math.min(pitch+step,maxPitch)){
    const visibility=visibilityAtPitch({...options,pitch});
    if(visibility>best.visibility)best={pitch,visibility,baseVisibility};
    if(visibility>=8/9){
      const margin=Math.min(pitch+2*Math.PI/180,maxPitch);
      return visibilityAtPitch({...options,pitch:margin})>=8/9?{pitch:margin,visibility,baseVisibility}:best;
    }
    if(pitch===maxPitch)break;
  }
  // A roof over Pom cannot be cleared by looking down into it. If no steeper
  // angle clears the silhouette, try a shallow view through the opening.
  const minimum=Math.min(basePitch,8*Math.PI/180);
  for(let pitch=Math.max(basePitch-step,minimum);pitch>=minimum-1e-8;pitch=Math.max(pitch-step,minimum)){
    const visibility=visibilityAtPitch({...options,pitch});
    if(visibility>best.visibility)best={pitch,visibility,baseVisibility};
    if(visibility>=8/9){
      const margin=Math.max(pitch-2*Math.PI/180,minimum);
      return visibilityAtPitch({...options,pitch:margin})>=8/9?{pitch:margin,visibility,baseVisibility}:best;
    }
    if(pitch===minimum)break;
  }
  return best;
}
