// Camera-plane limits constrain manual inspection only; game follow keeps its
// own target. Plain vectors keep the geometry independent of the renderer.
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const add=(a,b,k)=>({x:a.x+b.x*k,y:a.y+b.y*k,z:a.z+b.z*k});
export function limitStagePan(target,right,up,{left,right:edge,height},studio=false){
  const padding=studio?12:2,points=[];
  for(const x of [left-padding,edge+padding])for(const y of [-padding,height+padding])for(const z of [-.1,4])points.push({x,y,z});
  let next={...target};
  for(const axis of [right,up]){
    const values=points.map(p=>dot(p,axis)),value=dot(next,axis);
    next=add(next,axis,Math.max(Math.min(...values),Math.min(Math.max(...values),value))-value);
  }
  return next;
}
export function minimumBackdropDistance(width,yaw){
  // Only puzzle clearance belongs here. Decorative props can stand in front of
  // the wall without forcing the entire backdrop ten units farther away.
  return .25+Math.abs(Math.sin(yaw))*(width/2+.1)+Math.abs(Math.cos(yaw))*.1;
}
// Project a textured quad along the sun's rays onto a receiving plane. Retain
// UVs while clipping rays that travel backwards and shadows below the floor.
export function projectStageShadow(corners,sun,plane,blur=0){
  const denominator=dot(plane.normal,sun);if(denominator<=1e-5)return null;
  const project=p=>{const t=dot({x:p.x-plane.origin.x,y:p.y-plane.origin.y,z:p.z-plane.origin.z},plane.normal)/denominator;return {...add(p,sun,-t),t}};
  const base=corners.map(project),a={x:base[1].x-base[0].x,y:base[1].y-base[0].y,z:base[1].z-base[0].z},b={x:base[3].x-base[0].x,y:base[3].y-base[0].y,z:base[3].z-base[0].z};
  const aa=dot(a,a),bb=dot(b,b),ab=dot(a,b),det=aa*bb-ab*ab;if(det<1e-10)return null;
  const uAxis={x:(bb*a.x-ab*b.x)/det,y:(bb*a.y-ab*b.y)/det,z:(bb*a.z-ab*b.z)/det},vAxis={x:(aa*b.x-ab*a.x)/det,y:(aa*b.y-ab*a.y)/det,z:(aa*b.z-ab*a.z)/det};
  const padU=blur*Math.sqrt(dot(uAxis,uAxis)),padV=blur*Math.sqrt(dot(vAxis,vAxis));
  let polygon=[[-padU,-padV],[1+padU,-padV],[1+padU,1+padV],[-padU,1+padV]].map(([u,v])=>{
    const p={x:corners[0].x+(corners[1].x-corners[0].x)*u+(corners[3].x-corners[0].x)*v,y:corners[0].y+(corners[1].y-corners[0].y)*u+(corners[3].y-corners[0].y)*v,z:corners[0].z+(corners[1].z-corners[0].z)*u+(corners[3].z-corners[0].z)*v};
    return {...project(p),u,v};
  });
  const clip=distance=>{
    const out=[];for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],dp=distance(p),dq=distance(q);if(dp>=0)out.push(p);if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq),r={};for(const key of ['x','y','z','u','v','t'])r[key]=p[key]+(q[key]-p[key])*t;out.push(r)}}polygon=out;
  };
  clip(p=>p.t);clip(p=>p.y);
  if(plane.top!==undefined)clip(p=>plane.top-p.y);
  if(plane.halfWidth!==undefined){const horizontal=p=>(p.x-plane.origin.x)*plane.normal.z-(p.z-plane.origin.z)*plane.normal.x;clip(p=>plane.halfWidth-horizontal(p));clip(p=>plane.halfWidth+horizontal(p))}
  return polygon.length>=3?{polygon,uAxis,vAxis}:null;
}
