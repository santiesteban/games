// Compatibility entry point for the game and existing tools.
export * from '../shared/movement-routes.js';
import {planMovement as planLogicalMovement,movementSegmentClear,sampleMovementProgress} from '../shared/movement-routes.js';

// The solver and movement rules keep their collision-safe paths. For a step
// up, animate a smooth arc; in cramped spaces use the least obstructed arc so
// a small visual overlap does not make Pom change direction abruptly.
export function planMovement(board,from,to){
  const plan=planLogicalMovement(board,from,to);
  if(!plan||plan.isJump||Math.abs(to.y-from.y)!==1)return plan;
  const ascending=to.y<from.y,diagonal=from.x!==to.x&&from.z!==to.z;
  if(!ascending&&!diagonal)return plan;
  const safe=ascending?plan:planLogicalMovement(board,to,from);
  if(!safe)return plan;
  const a=safe.points[0],b=safe.points.at(-1);
  let best,bestHits=Infinity;
  for(const [power,lift] of [[2,.4],[2,.6],[3,.4],[4,.2]]){
    const points=Array.from({length:33},(_,i)=>{
      const t=i/32,h=t**power,x=a.x+(b.x-a.x)*h,z=a.z+(b.z-a.z)*h;
      const around=diagonal?sampleMovementProgress(safe,h):null;
      return{x:x+(around?(around.x-x)*.45:0),z:z+(around?(around.z-z)*.45:0),y:a.y+(b.y-a.y)*(2*t-t*t)+4*lift*t*(1-t)};
    });
    let hits=0;for(let i=1;i<points.length;i++)if(!movementSegmentClear(board,points[i-1],points[i]))hits++;
    if(hits<bestHits){best=points;bestHits=hits}if(!hits)break;
  }
  if(!ascending)best.reverse();
  const lengths=[0];for(let i=1;i<best.length;i++)lengths.push(lengths.at(-1)+Math.hypot(best[i].x-best[i-1].x,best[i].y-best[i-1].y,best[i].z-best[i-1].z));
  return {...plan,points:best,lengths,length:lengths.at(-1),isStepArc:true,isStepJump:ascending,stepVisualOverlap:bestHits>0};
}
