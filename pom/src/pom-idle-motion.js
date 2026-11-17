// An unhurried breath; the resting expression stays calm until Pom moves.
export function pomIdleMotion(elapsed){
  return {breath:Math.sin(elapsed*Math.PI*2/3600)*.009};
}
// Blink briefly while alert, then settle into the calm expression.
export function pomMovementEyes(elapsed,moving){
  if(moving)return 1;
  if(elapsed>=10000)return 0;
  const phase=elapsed%3000;
  if(phase<2800)return 1;
  return Math.abs(phase-2900)/100;
}
