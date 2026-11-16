// An unhurried breath; the resting expression stays calm until Pom moves.
export function pomIdleMotion(elapsed){
  return {breath:Math.sin(elapsed*Math.PI*2/3600)*.009};
}
// Keep the eyes open briefly after a movement, then gently close them.
export function pomMovementEyes(now,moving,openUntil){
  if(moving)return 1;
  const t=Math.max(0,Math.min(1,(openUntil-now)/220));
  return t*t*(3-2*t);
}
