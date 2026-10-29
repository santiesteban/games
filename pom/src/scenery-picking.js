const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
export function scenePlanePoint(ray,record){
 const [a,b,,d]=record.corners,u=sub(b,a),v=sub(d,a),normal=cross(u,v),den=dot(normal,ray.direction);
 if(Math.abs(den)<1e-8)return null;
 const t=dot(normal,sub(a,ray.origin))/den;if(t<0)return null;
 const point={x:ray.origin.x+t*ray.direction.x,y:ray.origin.y+t*ray.direction.y,z:ray.origin.z+t*ray.direction.z};
 const p=sub(point,a),uu=dot(u,u),vv=dot(v,v),uv=dot(u,v),det=uu*vv-uv*uv;
 if(Math.abs(det)<1e-8)return null;
 return {point,t,u:(dot(p,u)*vv-dot(p,v)*uv)/det,v:(dot(p,v)*uu-dot(p,u)*uv)/det};
}
export function pickScenery(ray,records){
 let best=null;
 for(const record of records){
  const hit=scenePlanePoint(ray,record);if(!hit||hit.u<0||hit.u>1||hit.v<0||hit.v>1||best&&hit.t>=best.t)continue;
  const mask=record.mask;if(mask){const x=Math.min(mask.width-1,Math.floor(hit.u*mask.width)),y=Math.min(mask.height-1,Math.floor(hit.v*mask.height));if(mask.rgba[(y*mask.width+x)*4+3]<32)continue}
  best={...hit,record};
 }
 return best;
}
