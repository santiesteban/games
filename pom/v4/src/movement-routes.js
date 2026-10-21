const EPS=.0001, BODY={x:.38,down:.205,up:.31,z:.18};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const ease=t=>t*t*(3-2*t);

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
    if(x< -1||x>=width||y<0||y>height)return[];
    const floor=y===height,front=floor?Math.max(0,depthAt(x,height-1)):Math.max(0,depthAt(x,y-1)),back=floor?4:depthAt(x,y);
    if(!floor&&x<0)return[];
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
  const start=axes.map(axis=>coords[axis].indexOf(a[axis])),goal=axes.map(axis=>coords[axis].indexOf(b[axis])).join(','),key=p=>p.join(','),pose=p=>Object.fromEntries(axes.map((axis,i)=>[axis,coords[axis][p[i]]])),queue=[{p:start,cost:0,score:distance(a,b)}],costs=new Map([[key(start),0]]),previous=new Map;
  while(queue.length){
    queue.sort((x,y)=>x.score-y.score);const current=queue.shift(),k=key(current.p);
    if(current.cost!==costs.get(k))continue;
    if(k===goal){const path=[];let p=current.p;while(p){path.push(pose(p));p=previous.get(key(p))}return path.reverse()}
    const from=pose(current.p);
    for(let axis=0;axis<3;axis++)for(const direction of [-1,1]){
      const p=[...current.p];p[axis]+=direction;if(p[axis]<0||p[axis]>=coords[axes[axis]].length)continue;
      const to=pose(p),next=key(p),cost=current.cost+distance(from,to);
      if(cost>=(costs.get(next)??Infinity)||!segmentClear(blocks,from,to))continue;
      costs.set(next,cost);previous.set(next,current.p);queue.push({p,cost,score:cost+distance(to,b)});
    }
  }
  return null;
}

export function planMovement(board,from,to){
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
  const duration=isFall?450+drop*165:level?(diagonal?250:175)+(lengths.at(-1)-distance(a,b))*65:390+(lengths.at(-1)-distance(a,b))*65;
  return{points,lengths,length:lengths.at(-1),duration,isFall,stretch:!isFall&&(drop<0||diagonal||points.length>2)};
}

export function sampleMovement(plan,time){
  const t=Math.max(0,Math.min(1,time)),travel=ease(t)*plan.length;
  let i=1;while(i<plan.lengths.length-1&&plan.lengths[i]<travel)i++;
  return mix(plan.points[i-1],plan.points[i],(travel-plan.lengths[i-1])/(plan.lengths[i]-plan.lengths[i-1]||1));
}

export function movementNeighbors(board,p,getPlan=(a,b)=>planMovement(board,a,b)){
  const out=[];
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=board.height-p.y;dy++)for(const next of board.nodesAt(p.x+dx,p.y+dy)){
    if(isSingleMove(p,next)&&getPlan(p,next))out.push(next);
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
      const k=key(next),cost=current.cost+getPlan(current.p,next).duration+Math.abs(next.y-current.p.y)*80;
      if(cost>=(costs.get(k)??Infinity))continue;
      costs.set(k,cost);previous.set(k,current.p);queue.push({p:next,cost});
    }
  }
  return null;
}
