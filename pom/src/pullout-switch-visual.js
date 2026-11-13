export const SWITCH_HEIGHT=.14;
export const SWITCH_BASE_HEIGHT=.075;
export const SWITCH_PRESSED_HEIGHT=SWITCH_HEIGHT-SWITCH_BASE_HEIGHT;
export const SWITCH_MOTION_DURATION=350;

export function switchOccupied(item,node,depth){
  return !!node&&item.x===node.x&&item.y===node.y&&depth>0&&node.z===depth-1;
}

export function updateSwitchMotion(motion,target,now,visible=true){
  if(!motion)return {value:target,from:target,target,start:now};
  const progress=Math.min(1,Math.max(0,(now-motion.start)/SWITCH_MOTION_DURATION));
  const ease=progress*progress*(3-2*progress);
  motion.value=motion.from+(motion.target-motion.from)*ease;
  if(!visible){motion.value=motion.from=motion.target=target;motion.start=now}
  else if(motion.target!==target){motion.from=motion.value;motion.target=target;motion.start=now}
  return motion;
}

export function switchBaseOffset(pressed){
  return pressed===0?0:-SWITCH_BASE_HEIGHT*pressed;
}

export function switchPomLift(cameraUpY,pressed,scaleY=1){
  return SWITCH_HEIGHT+switchBaseOffset(pressed)+.379*.56*scaleY*Math.max(0,cameraUpY)-.22;
}
