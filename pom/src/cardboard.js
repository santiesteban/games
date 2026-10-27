import {Mesh,Color,vec3} from 'littlejsengine';
import {triangulateContour} from './reach-motion.js';

// Shared physical edge for resting puzzle pieces and upright scenery cutouts.
// It is visual only: gameplay depths and floor occupancy remain integer based.
export const CARDBOARD_THICKNESS=.08;
export function cardboardMesh(points,color,backOffset=vec3(0,0,-CARDBOARD_THICKNESS)){
  const mesh=new Mesh(),indices=triangulateContour(points),backIndices=[];
  for(let i=0;i<indices.length;i+=3)backIndices.push(indices[i],indices[i+2],indices[i+1]);
  mesh.addTriangles(points,indices,vec3(0,0,1),undefined,color);
  const shade=n=>new Color(color.r*n,color.g*n,color.b*n,color.a);
  mesh.addTriangles(points.map(p=>p.add(backOffset)),backIndices,vec3(0,0,-1),undefined,shade(.68));
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],light=b.x<a.x?.86:b.y>a.y?.73:.62;
    mesh.addQuad(a,b,b.add(backOffset),a.add(backOffset),shade(light));
  }
  mesh.doubleSided=true;return mesh;
}
