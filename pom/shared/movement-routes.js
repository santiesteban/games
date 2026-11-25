const EPS=.0001, BODY={x:.38,down:.205,up:.31,z:.18};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});

export function createMovementBoard(grid,depths=[]){
  const height=grid.length,width=grid[0].length,byCell=Array.from({length:height},()=>Array(width).fill(null)),groups=[];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(grid[y][x]==='.'||byCell[y][x])continue;
    const group={id:groups.length,color:grid[y][x],depth:depths[groups.length]??0,cells:[]},queue=[[x,y]];
    groups.push(group);byCell[y][x]=group;
    while(queue.length){const [a,b]=queue.pop();group.cells.push({x:a,y:b});for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const xx=a+dx,yy=b+dy;if(grid[yy]?.[xx]===group.color&&!byCell[yy][xx]){byCell[yy][xx]=group;queue.push([xx,yy])}
    }}
  }
  const depthAt=(x,y)=>byCell[y]?.[x]?.depth??-1;
  const nodesAt=(x,y)=>{
    if(x< -1||x>width||y<0||y>height)return[];
    const floor=y===height;
    if(!floor&&(x<0||x>=width))return[];
    const front=floor?Math.max(0,depthAt(x,height-1)):Math.max(0,depthAt(x,y-1)),back=floor?4:depthAt(x,y);
    return Array.from({length:Math.max(0,back-front)},(_,i)=>({x,y,z:front+i}));
  };
  const validNode=p=>nodesAt(p.x,p.y).some(n=>n.z===p.z);
  const blocks=groups.filter(g=>g.depth>0).flatMap(g=>g.cells.map(c=>({min:{x:c.x-BODY.x+EPS,y:height-c.y-1-BODY.up+EPS,z:-BODY.z+EPS},max:{x:c.x+1+BODY.x-EPS,y:height-c.y+BODY.down-EPS,z:g.depth+BODY.z-EPS}})));
  return{height,width,groups,byCell,nodesAt,validNode,blocks};
}

export function isSingleMove(from,to){
  const dx=Math.abs(to.x-from.x),dz=Math.abs(to.z-from.z);
  return dx<=1&&dz<=1&&dx+dz>0&&to.y-from.y>=-1;
}

export function nodePose(board,node){return{x:node.x+.5,y:board.height-node.y+.22,z:node.z+.5}}

// Exact swept body/box intersections, including the departure and landing.
// These are expanded boxes, so a clear segment has room for Pom's whole body.
function segmentClear(blocks,a,b){
  for(const block of blocks){
    let enter=0,leave=1;
    for(const axis of ['x','y','z']){
      const delta=b[axis]-a[axis];
      if(Math.abs(delta)<1e-10){if(a[axis]<=block.min[axis]||a[axis]>=block.max[axis]){enter=2;break}}
      else{const lo=(block.min[axis]-a[axis])/delta,hi=(block.max[axis]-a[axis])/delta;enter=Math.max(enter,Math.min(lo,hi));leave=Math.min(leave,Math.max(lo,hi))}
      if(enter>leave)break;
    }
    if(enter<=leave&&enter<=1&&leave>=0)return false;
  }
  return true;
}
export function movementSegmentClear(board,a,b){return segmentClear(board.blocks,a,b)}

export function isJumpCandidate(from,to){
  const dx=Math.abs(to.x-from.x),dz=Math.abs(to.z-from.z),span=Math.max(dx,dz),drop=to.y-from.y;
  const diagonalGap=drop===0&&span===2&&Math.min(dx,dz)===1;
  return span>=2&&span<=(drop>0?3:2)&&drop>=-1
    &&(dx===0||dz===0||dx===dz||diagonalGap)
    &&!(drop<0&&dx!==0&&dz!==0);
}

function planJump(board,from,to){
  if(!isJumpCandidate(from,to))return null;
  const dx=to.x-from.x,dz=to.z-from.z,span=Math.max(Math.abs(dx),Math.abs(dz)),drop=to.y-from.y;
  if(!board.validNode(from)||!board.validNode(to))return null;
  for(let i=1;i<span;i++){
    const x=from.x+dx*i/span,z=from.z+dz*i/span;
    for(const cellX of new Set([Math.floor(x),Math.ceil(x)]))for(const cellZ of new Set([Math.floor(z),Math.ceil(z)])){
      if(board.validNode({x:cellX,y:from.y,z:cellZ}))return null;
    }
  }
  const a=nodePose(board,from),b=nodePose(board,to),edgeB={...b,x:b.x-dx/span*.2,z:b.z-dz/span*.2};
  // When a ceiling obstructs the usual arc, walk farther toward the edge
  // before rising. Check the entire path against every piece in both cases.
  let points;
  const approaches=[[.2,0,.25]];
  for(const duration of [.3,.25,.2,.16])for(const delay of [.1,.15,.2,.25,.32,.4])approaches.push([.45,delay,duration]);
  // A small overlap with a ceiling above takeoff is preferable to an abrupt,
  // unnatural contortion. Other obstacles retain their full collision bounds.
  const relaxedBlocks=board.blocks.map(block=>a.x>block.min.x&&a.x<block.max.x&&a.z>block.min.z&&a.z<block.max.z&&block.min.y+BODY.up>=board.height-from.y+1-EPS?{...block,min:{...block.min,y:block.min.y+.32}}:block);
  // Walk toward the edge while still supported, then rise in one continuous
  // arc. The ceiling can cover part of Pom without redirecting his motion.
  let continuousFlight=false;
  if(relaxedBlocks.some((block,index)=>block!==board.blocks[index])){
    const rise=b.y-a.y;
    const arcs=[.5,.4,.35,.3].map(lift=>t=>rise*t+4*lift*t*(1-t));
    if(rise>0){
      // A low roof beside a higher landing leaves a narrow corridor. Rise
      // steadily through it, then bend down into the landing.
      for(const slope of [1.75,1.775,1.8,1.85,2,2.1,2.2])for(const bend of [.48,.54]){
        arcs.push(t=>slope*t-(slope-rise)*(Math.max(0,t-bend)/(1-bend))**2);
      }
    }
    findContinuousArc: for(const approach of [.28,.18,0])for(const heightAt of arcs){
      const takeoff={...a,x:a.x+dx/span*approach,z:a.z+dz/span*approach};
      const candidate=approach?[a,takeoff]:[a];
      for(let i=1;i<32;i++){
        const t=i/32,p=mix(takeoff,b,t);
        p.y=a.y+heightAt(t);
        candidate.push(p);
      }
      candidate.push(b);
      if(candidate.slice(1).every((p,i)=>segmentClear(relaxedBlocks,candidate[i],p))){
        points=candidate;
        continuousFlight=true;
        break findContinuousArc;
      }
    }
  }
  // Prefer a continuous arc after reaching the edge. The lower arcs reduce
  // contact with a low ceiling while keeping horizontal and vertical motion
  // simultaneous throughout the flight.
  for(const arc of [.5,.35,.7,1]){
    if(points)break;
    const edgeA={...a,x:a.x+dx/span*.12,z:a.z+dz/span*.12},candidate=[a,edgeA];
    for(let i=1;i<=32;i++){
      const t=i/32,p=mix(edgeA,b,t);
      p.y=a.y+(b.y-a.y)*t+arc*Math.sin(Math.PI*t);
      candidate.push(p);
    }
    candidate.push(b);
    if(candidate.slice(1).every((p,i)=>segmentClear(relaxedBlocks,candidate[i],p))){points=candidate;break}
  }
  findArc: for(const [lead,delay,riseDuration] of points?[]:approaches)for(const blocks of [board.blocks,relaxedBlocks]){
    if(!delay&&blocks===relaxedBlocks)continue;
    const edgeA={...a,x:a.x+dx/span*lead,z:a.z+dz/span*lead},candidate=[a];
    const top=Math.max(a.y,b.y)+.55;
    for(let i=0;i<=32;i++){
      const t=i/32,p=mix(edgeA,edgeB,t),fall=Math.min(1,(1-t)/.25);
      let rise;
      if(!delay)rise=Math.min(1,t/.25);
      else if(t<delay)rise=.18*t/delay;
      else{
        // Match the gentle initial upward velocity, then ease into the apex.
        const u=Math.min(1,(t-delay)/riseDuration),u2=u*u,u3=u2*u;
        rise=(2*u3-3*u2+1)*.18+(u3-2*u2+u)*(.18/delay)*riseDuration+(-2*u3+3*u2);
      }
      p.y=Math.min(a.y+(top-a.y)*rise,b.y+(top-b.y)*fall,top);candidate.push(p);
    }
    candidate.push(b);
    if(candidate.slice(1).every((p,i)=>segmentClear(blocks,candidate[i],p))){points=candidate;break findArc}
  }
  if(!points)return null;
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+distance(points[i-1],points[i]));
  const takeoff=continuousFlight&&points[1].y!==a.y?0:lengths[1]/lengths.at(-1);
  const duration=drop>1 ? 1050+span*90+drop*90 : 560+span*55+Math.max(0,drop)*70;
  return {points,lengths,length:lengths.at(-1),takeoff,landing:continuousFlight?1:lengths.at(-2)/lengths.at(-1),continuousFlight,duration,isFall:drop>1,stretch:false,isJump:true};
}

function permutations(items){return items.length?items.flatMap((v,i)=>permutations(items.filter((_,j)=>i!==j)).map(rest=>[v,...rest])):[[]]}
function simplify(points,blocks){
  const result=[points[0]];let at=0;
  while(at<points.length-1){let next=points.length-1;while(next>at+1&&!segmentClear(blocks,points[at],points[next]))next--;result.push(points[next]);at=next}
  return result;
}
function roundCorners(points,blocks){
  if(points.length<3)return points;
  for(const radius of [.16,.08,.03]){
    const rounded=[points[0]];
    for(let i=1;i<points.length-1;i++){
      const a=points[i-1],b=points[i],c=points[i+1],r=Math.min(radius,distance(a,b)/3,distance(b,c)/3),entry=mix(b,a,r/distance(a,b)),exit=mix(b,c,r/distance(b,c));
      rounded.push(entry);
      for(let j=1;j<=6;j++){const t=j/6;rounded.push(mix(mix(entry,b,t),mix(b,exit,t),t))}
    }
    rounded.push(points.at(-1));
    if(rounded.slice(1).every((p,i)=>segmentClear(blocks,rounded[i],p)))return rounded;
  }
  return points;
}

// A small local search is the fallback for a corner that needs a partial step
// before Pom can rise. Coordinates come from obstacle faces and body clearance.
function searchCorner(a,b,blocks){
  const axes=['x','y','z'],coords={};
  for(const axis of axes){
    const low=Math.min(a[axis],b[axis])-(axis==='y'?0:.18),high=Math.max(a[axis],b[axis])+.16;
    const values=[a[axis],b[axis]];
    for(const block of blocks)for(const value of [block.min[axis]-.015,block.max[axis]+.015])if(value>=low&&value<=high)values.push(value);
    coords[axis]=[...new Set(values)].sort((x,y)=>x-y);
  }
  const start=axes.map(axis=>coords[axis].indexOf(a[axis])),goal=axes.map(axis=>coords[axis].indexOf(b[axis])).join(','),key=p=>p.join(','),pose=p=>({x:coords.x[p[0]],y:coords.y[p[1]],z:coords.z[p[2]]});
  const queue=[],costs=new Map([[key(start),0]]),previous=new Map;let sequence=0;
  const before=(a,b)=>a.score<b.score||(a.score===b.score&&a.order<b.order);
  function enqueue(p,cost,score){
    const entry={p,cost,score,order:sequence++};let index=queue.length;queue.push(entry);
    while(index>0){const parent=(index-1)>>1;if(!before(entry,queue[parent]))break;queue[index]=queue[parent];index=parent}
    queue[index]=entry;
  }
  function dequeue(){
    const first=queue[0],last=queue.pop();if(!queue.length)return first;
    let index=0;
    while(true){let child=index*2+1;if(child>=queue.length)break;if(child+1<queue.length&&before(queue[child+1],queue[child]))child++;if(!before(queue[child],last))break;queue[index]=queue[child];index=child}
    queue[index]=last;return first;
  }
  enqueue(start,0,distance(a,b));
  while(queue.length){
    const current=dequeue(),k=key(current.p);
    if(current.cost!==costs.get(k))continue;
    if(k===goal){const path=[];let p=current.p;while(p){path.push(pose(p));p=previous.get(key(p))}return path.reverse()}
    const from=pose(current.p);
    for(let axis=0;axis<3;axis++)for(const direction of [-1,1]){
      const p=[...current.p];p[axis]+=direction;if(p[axis]<0||p[axis]>=coords[axes[axis]].length)continue;
      const to=pose(p),next=key(p),cost=current.cost+distance(from,to);
      if(cost>=(costs.get(next)??Infinity)||!segmentClear(blocks,from,to))continue;
      costs.set(next,cost);previous.set(next,current.p);enqueue(p,cost,cost+distance(to,b));
    }
  }
  return null;
}

export function planMovement(board,from,to){
  if(!isSingleMove(from,to))return planJump(board,from,to);
  if(!isSingleMove(from,to)||!board.validNode(from)||!board.validNode(to))return null;
  const a=nodePose(board,from),b=nodePose(board,to),blocks=board.blocks.filter(block=>['x','y','z'].every(axis=>block.max[axis]>=Math.min(a[axis],b[axis])-.2&&block.min[axis]<=Math.max(a[axis],b[axis])+.2));
  let points;
  if(segmentClear(blocks,a,b))points=[a,b];
  else{
    const axes=['x','y','z'].filter(axis=>a[axis]!==b[axis]),candidates=[];
    for(const order of permutations(axes)){
      const path=[a];let p=a;
      for(const axis of order){p={...p,[axis]:b[axis]};path.push(p)}
      if(path.slice(1).every((q,i)=>segmentClear(blocks,path[i],q)))candidates.push(simplify(path,blocks));
    }
    candidates.sort((x,y)=>x.reduce((sum,p,i)=>sum+(i?distance(x[i-1],p):0),0)-y.reduce((sum,p,i)=>sum+(i?distance(y[i-1],p):0),0));
    points=candidates[0]??searchCorner(a,b,blocks);
    if(!points)return null;
    points=roundCorners(simplify(points,blocks),blocks);
  }
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+distance(points[i-1],points[i]));
  const drop=to.y-from.y,isFall=drop>1,level=drop===0,diagonal=from.x!==to.x&&from.z!==to.z;
  const duration=isFall?360+drop*135:level?(diagonal?200:175)+(lengths.at(-1)-distance(a,b))*25:240+(lengths.at(-1)-distance(a,b))*25;
  return{points,lengths,length:lengths.at(-1),duration,isFall,stretch:!isFall&&(drop<0||diagonal||points.length>2)};
}

// Share a cruising speed between connected steps. Only the beginning and end
// of the complete trip ease to a stop; intermediate cells keep their momentum.
export function movementProfiles(plans){
  const profiles=plans.map(()=>({entry:0,exit:0}));
  for(let i=1;i<plans.length;i++){
    const before=plans[i-1],after=plans[i],a=before.points.at(-2),b=before.points.at(-1),c=after.points[0],d=after.points[1];
    const dot=((b.x-a.x)*(d.x-c.x)+(b.y-a.y)*(d.y-c.y)+(b.z-a.z)*(d.z-c.z))/(distance(a,b)*distance(c,d));
    const turn=Math.max(0,Math.min(1,(dot+1)/2)),speed=Math.min(before.length/before.duration,after.length/after.duration)*turn;
    profiles[i-1].exit=speed*before.duration/before.length;
    profiles[i].entry=speed*after.duration/after.length;
  }
  return profiles;
}

export function sampleMovement(plan,time,profile={entry:0,exit:0}){
  const t=Math.max(0,Math.min(1,time)),t2=t*t,t3=t2*t;
  const progress=(-2*t3+3*t2)+(t3-2*t2+t)*profile.entry+(t3-t2)*profile.exit;
  return sampleMovementProgress(plan,progress);
}
export function sampleMovementProgress(plan,progress){
  const travel=Math.max(0,Math.min(1,progress))*plan.length;
  let i=1;while(i<plan.lengths.length-1&&plan.lengths[i]<travel)i++;
  return mix(plan.points[i-1],plan.points[i],(travel-plan.lengths[i-1])/(plan.lengths[i]-plan.lengths[i-1]||1));
}

export function movementNeighbors(board,p,getPlan=(a,b)=>planMovement(board,a,b)){
  const out=[];
  for(let dx=-3;dx<=3;dx++)for(let dy=-1;dy<=board.height-p.y;dy++)for(const next of board.nodesAt(p.x+dx,p.y+dy)){
    if(getPlan(p,next))out.push(next);
  }
  return out;
}

export function findMovementPath(board,start,target,getPlan=(a,b)=>planMovement(board,a,b)){
  if(!board.validNode(start)||!board.validNode(target))return null;
  const key=p=>`${p.x},${p.y},${p.z}`,startKey=key(start),goal=key(target);
  if(startKey===goal)return[start];
  if(getPlan(start,target))return[start,target];
  const queue=[{p:start,cost:0}],costs=new Map([[startKey,0]]),previous=new Map([[startKey,null]]);
  while(queue.length){
    queue.sort((a,b)=>a.cost-b.cost);const current=queue.shift(),at=key(current.p);
    if(current.cost!==costs.get(at))continue;
    if(at===goal){const path=[];let p=current.p;while(p){path.push(p);p=previous.get(key(p))}return path.reverse()}
    for(const next of movementNeighbors(board,current.p,getPlan)){
      if(getPlan(current.p,next).isJump)continue;
      const k=key(next),cost=current.cost+getPlan(current.p,next).duration+Math.abs(next.y-current.p.y)*80;
      if(cost>=(costs.get(k)??Infinity))continue;
      costs.set(k,cost);previous.set(k,current.p);queue.push({p:next,cost});
    }
  }
  return null;
}
