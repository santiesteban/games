// Choose artwork from the supplied pose sheet; gameplay still controls motion.
export function revisedPomPose({pose='calm',motion=null,pipe=false,moving=false,idleTime=0,now=0,push='backward',effort='push',effortProgress=0}={}){
  if(pipe)return {name:'thin-stretch',flip:false};
  if(pose==='float')return {name:Math.floor(now/220)%2?'jump-up-launch':'jump-up-apex',flip:false};
  if(pose==='push-back')return {name:`${effort}-${push==='backward'?'center':push}-${effortProgress<.5?1:2}`,flip:false};
  if(pose==='excited'||pose==='pipe-exit')return {name:'excited',flip:false};
  if(pose==='worried')return {name:'scared',flip:false};
  if(motion?.kind==='up'||motion?.kind==='side'){
    const t=Math.max(0,Math.min(1,motion.progress));
    const phase=t<.16?'anticipation':t<.36?'launch':t<.62?'apex':t<.84?'descent':'land';
    return {name:`jump-${motion.kind}-${phase}`,flip:motion.kind==='side'&&motion.direction<0};
  }
  if(moving&&motion?.kind==='walk'){
    const step=Math.floor(now/160)%4;
    return {name:step%2?'standing-step':'standing-relaxed',flip:step===3};
  }
  if(!moving&&idleTime>12000&&idleTime%18000<1600)return {name:'standing-wave',flip:false};
  if(!moving&&idleTime>5000)return {name:'standing-relaxed',flip:false};
  return {name:'standing-original',flip:false};
}
export function revisedPushDirection(group,player){
  if(!group||!player)return 'backward';
  const cells=group.cells.filter(cell=>cell.y===player.y-1);
  if(cells.some(cell=>cell.x===player.x&&player.z===group.depth))return 'backward';
  if(cells.some(cell=>cell.x===player.x-1))return 'left';
  if(cells.some(cell=>cell.x===player.x+1))return 'right';
  return 'backward';
}
