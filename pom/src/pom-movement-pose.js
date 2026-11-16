// Movement rows increase downward, so a smaller destination y is a step up.
export function pomMovementPose(plan,from,to,progress,flight){
  if(plan.isFall&&flight>.08&&flight<.96)return 'float';
  if(plan.isJump)return progress<.38||progress>=.82?'squash':'stretch';
  if(to.y<from.y)return progress<.18||progress>=.82?'squash':'stretch';
  return 'calm';
}
