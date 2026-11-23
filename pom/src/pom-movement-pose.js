// Movement rows increase downward, so a smaller destination y is a step up.
export function pomMovementPose(plan,from,to,progress,flight){
  if(plan.isFall&&flight>.08&&flight<.96)return 'float';
  if(plan.isJump)return flight<=0||flight>=1?'squash':'stretch';
  if(to.y<from.y)return progress<.18||progress>=.82?'squash':'stretch';
  return 'calm';
}

// A deterministic shape envelope keeps both poses visible during a short step.
export function stepJumpShape(progress){
  const t=Math.max(0,Math.min(1,progress)),pulse=(center,width)=>Math.max(0,1-Math.abs(t-center)/width);
  const squash=Math.max(pulse(.09,.12),pulse(.91,.12)),stretch=Math.sin(Math.PI*Math.max(0,Math.min(1,(t-.18)/.64)));
  return {x:1+.10*squash-.07*stretch,y:1-.09*squash+.09*stretch};
}
