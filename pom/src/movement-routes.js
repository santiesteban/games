// Compatibility entry point for the game and existing tools.
export * from '../shared/movement-routes.js';
import {planMovement as planLogicalMovement,movementSegmentClear,sampleMovementProgress,STEP_UP_DURATION} from '../shared/movement-routes.js';

// Both ordinary steps and pipe entries follow this same rising step arc.
export function stepArcPoints(a,b,{power=2,lift=.4,around,capAtDestination=false}={}){
  return Array.from({length:33},(_,i)=>{
    const t=i/32,h=t**power,x=a.x+(b.x-a.x)*h,z=a.z+(b.z-a.z)*h,p=around?.(h);
    const y=a.y+(b.y-a.y)*(2*t-t*t)+4*lift*t*(1-t);
    return {x:x+(p?(p.x-x)*.45:0),z:z+(p?(p.z-z)*.45:0),y:capAtDestination?Math.min(y,b.y):y};
  });
}
export function pipeEntryStepPlan(a,b){
  const points=stepArcPoints(a,b,{capAtDestination:true}),lengths=[0];
  for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y,points[i].z-points[i-1].z));
  return {points,lengths,length:lengths.at(-1),duration:STEP_UP_DURATION};
}

// The solver and movement rules keep their collision-safe paths. For a step
// up, animate a smooth arc; in cramped spaces use the least obstructed arc so
// a small visual overlap does not make Pom change direction abruptly.
export function planMovement(board,from,to){
  const plan=planLogicalMovement(board,from,to);
  if(!plan||plan.isJump)return plan;
  const diagonal=from.x!==to.x&&from.z!==to.z;
  const source=board.byCell?.[from.y]?.[from.x],target=board.byCell?.[to.y]?.[to.x];
  const levelPieceHop=from.y===to.y&&diagonal&&source&&target&&source!==target;
  if(levelPieceHop){
    const a=plan.points[0],points=Array.from({length:33},(_,i)=>{
      const t=i/32,p=sampleMovementProgress(plan,t);
      return {...p,y:a.y+.25*4*t*(1-t)};
    });
    const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y,points[i].z-points[i-1].z));
    const overlap=points.slice(1).some((point,i)=>!movementSegmentClear(board,points[i],point));
    return {...plan,points,lengths,length:lengths.at(-1),isStepArc:true,isStepJump:true,stepVisualOverlap:overlap};
  }
  if(Math.abs(to.y-from.y)!==1)return plan;
  const ascending=to.y<from.y;
  if(!ascending&&!diagonal)return plan;
  const safe=ascending?plan:planLogicalMovement(board,to,from);
  if(!safe)return plan;
  const a=safe.points[0],b=safe.points.at(-1);
  let best,bestHits=Infinity;
  for(const [power,lift] of [[2,.4],[2,.6],[3,.4],[4,.2]]){
    const points=stepArcPoints(a,b,{power,lift,around:diagonal?h=>sampleMovementProgress(safe,h):undefined});
    let hits=0;for(let i=1;i<points.length;i++)if(!movementSegmentClear(board,points[i-1],points[i]))hits++;
    if(hits<bestHits){best=points;bestHits=hits}if(!hits)break;
  }
  if(!ascending)best.reverse();
  const lengths=[0];for(let i=1;i<best.length;i++)lengths.push(lengths.at(-1)+Math.hypot(best[i].x-best[i-1].x,best[i].y-best[i-1].y,best[i].z-best[i-1].z));
  return {...plan,points:best,lengths,length:lengths.at(-1),isStepArc:true,isStepJump:ascending,stepVisualOverlap:bestHits>0};
}
