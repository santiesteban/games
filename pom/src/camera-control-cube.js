// Project the three visible faces into one SVG. Shared edges are drawn once so
// neighboring faces cannot produce doubled or broken borders while rotating.
export function cameraControlCube(yaw,pitch){
  const a=yaw*Math.PI/180,b=pitch*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
  const vertices={};
  const project=(x,y,z)=>{
    const horizontal=x*ca+z*sa,depth=-x*sa+z*ca;
    return `${(36+horizontal*17).toFixed(2)} ${(36+(y*cb+depth*sb)*17).toFixed(2)}`;
  };
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
    const key=`${x},${y},${z}`;vertices[key]=project(x,y,z);
  }
  const k=(x,y,z)=>`${x},${y},${z}`,side=yaw>=0?-1:1;
  const faces={
    front:[k(-1,-1,1),k(1,-1,1),k(1,1,1),k(-1,1,1)],
    top:[k(-1,-1,-1),k(1,-1,-1),k(1,-1,1),k(-1,-1,1)],
    side:[k(side,-1,-1),k(side,-1,1),k(side,1,1),k(side,1,-1)],
  };
  const edges=new Map();
  for(const points of Object.values(faces))for(let i=0;i<points.length;i++){
    const from=points[i],to=points[(i+1)%points.length],id=[from,to].sort().join('|');
    edges.set(id,`M${vertices[from]}L${vertices[to]}`);
  }
  const path=points=>`M${points.map(key=>vertices[key]).join('L')}Z`;
  return {front:path(faces.front),top:path(faces.top),side:path(faces.side),edges:[...edges.values()].join(''),
    vertical:`M${project(0,-1.7,0)}L${project(0,1.7,0)}`,
    horizontal:`M${project(-1.7,0,0)}L${project(1.7,0,0)}`,
    verticalFace:`M${project(0,-1,0)}L${project(0,-1.7,0)}`,
    horizontalFace:`M${project(side,0,0)}L${project(side*1.7,0,0)}`};
}
