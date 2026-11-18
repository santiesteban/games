// Compatibility entry point for the game and existing tools.
export * from '../shared/movement-routes.js';
import {planMovement as planLogicalMovement,movementSegmentClear} from '../shared/movement-routes.js';

// The solver and movement rules keep their collision-safe paths. For a step
// up, animate a smooth arc; in cramped spaces use the least obstructed arc so
// a small visual overlap does not make Pom change direction abruptly.
export function planMovement(board,from,to){
  const plan=planLogicalMovement(board,from,to);
  if(!plan||plan.isJump||to.y!==from.y-1)return plan;
  const a=plan.points[0],b=plan.points.at(-1);
  let best,bestHits=Infinity;
  for(const [power,lift] of [[2,.4],[2,.6],[3,.4],[4,.2]]){
    const points=Array.from({length:33},(_,i)=>{const t=i/32,h=t**power;return{x:a.x+(b.x-a.x)*h,z:a.z+(b.z-a.z)*h,y:a.y+(b.y-a.y)*(2*t-t*t)+4*lift*t*(1-t)}});
    let hits=0;for(let i=1;i<points.length;i++)if(!movementSegmentClear(board,points[i-1],points[i]))hits++;
    if(hits<bestHits){best=points;bestHits=hits}if(!hits)break;
  }
  const lengths=[0];for(let i=1;i<best.length;i++)lengths.push(lengths.at(-1)+Math.hypot(best[i].x-best[i-1].x,best[i].y-best[i-1].y,best[i].z-best[i-1].z));
  return {...plan,points:best,lengths,length:lengths.at(-1),isStepJump:true,stepVisualOverlap:bestHits>0};
}
