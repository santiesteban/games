// Movement rows increase downward, so a smaller destination y is a step up.
export function pomMovementPose(plan,from,to,progress,flight){
  if(plan.isFall&&flight>.08&&flight<.96)return 'float';
  if(plan.isJump)return flight<=0||flight>=1?'squash':'stretch';
  if(to.y<from.y)return progress<.18||progress>=.82?'squash':'stretch';
  return 'calm';
}

export function jumpRouteTiming(plan,t){
  const hasApproach=plan.continuousFlight&&plan.takeoff>0;
  const launchAt=hasApproach?.88*Math.acos(1-2*plan.takeoff)/Math.PI:plan.continuousFlight?.10:.16;
  const flight=plan.isJump?Math.max(0,Math.min(1,(t-launchAt)/(.88-launchAt))):t;
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  let progress=0;
  if(hasApproach)progress=(1-Math.cos(Math.PI*Math.min(1,t/.88)))/2;
  else if(plan.continuousFlight)progress=smooth(flight);
  else if(plan.isJump)progress=t<.10?plan.takeoff*smooth(t/.10):t<launchAt?plan.takeoff:t<.88?plan.takeoff+(plan.landing-plan.takeoff)*smooth(flight):plan.landing+(1-plan.landing)*smooth((t-.88)/.12);
  return {flight,progress,launchAt,hasApproach};
}

export function jumpBodyMotion(plan,t,flight,launchAt){
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  const windupStart=plan.continuousFlight?0:.05;
  const windup=t<launchAt?smooth((t-windupStart)/(launchAt-windupStart)):Math.max(0,1-flight/.12);
  const launch=flight>0&&flight<.22?Math.sin(Math.PI*flight/.22):0;
  const landing=t>=.88?Math.sin(Math.PI*(t-.88)/.12):0;
  return {windup,squash:.16*windup+.14*landing-.13*launch};
}

export const PIECE_EFFORT_DURATION=440;
export function pieceEffortScale(elapsed){
  const t=Math.max(0,Math.min(1,elapsed/PIECE_EFFORT_DURATION)),effort=Math.sin(Math.PI*t);
  return {x:1+.025*effort,y:1-.04*effort};
}

// A deterministic shape envelope keeps both poses visible during a short step.
export function stepJumpShape(progress){
  const t=Math.max(0,Math.min(1,progress)),pulse=(center,width)=>Math.max(0,1-Math.abs(t-center)/width);
  const squash=Math.max(pulse(.09,.12),pulse(.91,.12)),stretch=Math.sin(Math.PI*Math.max(0,Math.min(1,(t-.18)/.64)));
  return {x:1+.10*squash-.07*stretch,y:1-.09*squash+.09*stretch};
}
