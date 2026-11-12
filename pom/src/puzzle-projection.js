// Render-space compensation only. Logical grids, depths and collision rules
// remain unchanged. At a fixed depth, one cell projects to a screen square.
export function puzzleProjection({enabled=true,eye,forward,up,depthScale=1}){
  enabled=!!enabled&&Math.abs(forward.x)<.001&&Math.abs(up.x)<.001;
  return {enabled:enabled||depthScale!==1,square:enabled,depthScale,eyeX:eye.x,eyeY:eye.y,eyeZ:eye.z,fy:forward.y,fz:forward.z,uy:up.y,uz:up.z};
}
function plane(p,z){
  const d=-p.eyeY*p.fy+(z-p.eyeZ)*p.fz;
  const a=-p.eyeY*p.uy+(z-p.eyeZ)*p.uz;
  return {d,a,b:d*p.uy-p.fy*a};
}
export function projectPuzzlePoint(p,point){
  if(!p.enabled)return {...point};
  const z=point.z*p.depthScale;
  if(!p.square)return {...point,z};
  const {d,b}=plane(p,z),den=b-p.fy*point.y;
  if(d<=.001||b<=.001||den<=.001)return {...point,z};
  const y=d*point.y/den,scale=(d+p.fy*y)/d;
  return {x:p.eyeX+(point.x-p.eyeX)*scale,y,z};
}
export function unprojectPuzzlePoint(p,point){
  if(!p.enabled)return {...point};
  const z=point.z/p.depthScale;
  if(!p.square)return {...point,z};
  const {d,b}=plane(p,point.z),den=d+p.fy*point.y;
  if(d<=.001||b<=.001||den<=.001)return {...point,z};
  return {x:p.eyeX+(point.x-p.eyeX)*d/den,y:point.y*b/den,z};
}

// Clone shared meshes once per object. Recompute only when the camera, source
// mesh or object pose changes; release obsolete clones after each scene pass.
export function createPuzzleMeshProjection(cloneMesh){
  const records=new Map();let projection,version=0,key,used=new Set();
  function release(object,r){if(object.mesh===r.mesh)object.mesh=r.source;r.mesh.dispose();records.delete(object)}
  return {
    begin(next){
      const nextKey=Object.values(next).join(':');
      if(nextKey!==key){key=nextKey;version++;projection=next}
      used.clear();
    },
    apply(object,matrix){
      if(!object?.mesh||!projection?.enabled)return;
      used.add(object);
      let r=records.get(object);
      if(r&&object.mesh!==r.mesh&&object.mesh!==r.source){release(object,r);r=null}
      if(!r){const source=object.mesh,mesh=cloneMesh(source);r={source,mesh,points:source.points.map(p=>({...p}))};records.set(object,r);object.mesh=mesh}
      object.mesh=r.mesh;
      if(matrix){
        const values=matrix.m;
        if(r.version===version&&r.matrix&&r.matrix.every((value,i)=>value===values[i]))return;
        const inverse=matrix.copy().invert();
        for(let i=0;i<r.points.length;i++){
          const world=matrix.transformPoint(r.points[i]),out=projectPuzzlePoint(projection,world),local=inverse.transformPoint(out);
          r.mesh.points[i].set(local.x,local.y,local.z);
        }
        r.matrix=Array.from(values);r.version=version;
      }else{
        const p=object.pos3D,s=object.scale3D;
        if(r.version===version&&r.x===p.x&&r.y===p.y&&r.z===p.z&&r.sx===s.x&&r.sy===s.y&&r.sz===s.z)return;
        if(!s.x||!s.y||!s.z)return;
        for(let i=0;i<r.points.length;i++){
          const q=r.points[i],world={x:p.x+q.x*s.x,y:p.y+q.y*s.y,z:p.z+q.z*s.z};
          const out=projectPuzzlePoint(projection,world);
          r.mesh.points[i].set((out.x-p.x)/s.x,(out.y-p.y)/s.y,(out.z-p.z)/s.z);
        }
        Object.assign(r,{version,x:p.x,y:p.y,z:p.z,sx:s.x,sy:s.y,sz:s.z});
      }
      r.mesh.dirty=true;
    },
    end(){for(const [object,r]of records)if(!used.has(object))release(object,r)},
    restore(){for(const [object,r]of records)if(object.mesh===r.mesh)object.mesh=r.source},
    clear(){for(const [object,r]of records)release(object,r)},
  };
}

// Axis-aligned world boxes bound an affine source mesh. The correction is
// fractional-linear along each coordinate in its valid domain, so extrema lie
// on box corners. Invalid/near-plane domains deliberately skip custom culling.
export function projectedPuzzleBounds(p,bounds,m){
  const cx=(bounds.min.x+bounds.max.x)/2,cy=(bounds.min.y+bounds.max.y)/2,cz=(bounds.min.z+bounds.max.z)/2;
  const hx=(bounds.max.x-bounds.min.x)/2,hy=(bounds.max.y-bounds.min.y)/2,hz=(bounds.max.z-bounds.min.z)/2;
  const x=m[0]*cx+m[4]*cy+m[8]*cz+m[12],y=m[1]*cx+m[5]*cy+m[9]*cz+m[13],z=m[2]*cx+m[6]*cy+m[10]*cz+m[14];
  const ex=Math.abs(m[0])*hx+Math.abs(m[4])*hy+Math.abs(m[8])*hz;
  const ey=Math.abs(m[1])*hx+Math.abs(m[5])*hy+Math.abs(m[9])*hz;
  const ez=Math.abs(m[2])*hx+Math.abs(m[6])*hy+Math.abs(m[10])*hz;
  if(!p.enabled)return {center:{x,y,z},radius:Math.hypot(ex,ey,ez)};
  let minY=Infinity,maxY=-Infinity,minScale=Infinity,maxScale=-Infinity;
  // Positive-domain extrema occur at four Y/Z corners. X is monotone for
  // positive scale; its endpoints can be combined with the scale extrema.
  for(let iz=0;iz<2;iz++){
    const zz=z+(iz?ez:-ez),d=-p.eyeY*p.fy+(zz-p.eyeZ)*p.fz,a=-p.eyeY*p.uy+(zz-p.eyeZ)*p.uz,b=d*p.uy-p.fy*a;
    if(d<=.001||b<=.001)return null;
    for(let iy=0;iy<2;iy++){
      const yy=y+(iy?ey:-ey),den=b-p.fy*yy;if(den<=.001)return null;
      const outY=d*yy/den,scale=b/den;
      minY=Math.min(minY,outY);maxY=Math.max(maxY,outY);minScale=Math.min(minScale,scale);maxScale=Math.max(maxScale,scale);
    }
  }
  const left=x-ex-p.eyeX,right=x+ex-p.eyeX;
  const minX=p.eyeX+Math.min(left*minScale,left*maxScale),maxX=p.eyeX+Math.max(right*minScale,right*maxScale);
  return {center:{x:(minX+maxX)/2,y:(minY+maxY)/2,z},radius:Math.hypot(maxX-minX,maxY-minY,2*ez)/2};
}
