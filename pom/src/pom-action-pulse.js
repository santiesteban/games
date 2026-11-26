// Hold the anticipation size until movement begins, then use the same
// duration for every action regardless of its overall animation length.
export const ACTION_RETURN_DURATION=100;
export function createPomActionPulse(){
  let active=false,movementStarted;
  return {
    start(){active=true;movementStarted=undefined},
    advance(progress,now){if(active&&progress>0&&movementStarted===undefined)movementStarted=now},
    scale(now){
      if(!active)return 1;
      if(movementStarted===undefined)return 1.25;
      const t=Math.max(0,Math.min(1,(now-movementStarted)/ACTION_RETURN_DURATION)),ease=t*t*(3-2*t);
      if(t>=1)active=false;
      return 1+.25*(1-ease);
    },
    reset(){active=false;movementStarted=undefined},
  };
}
