import test from 'node:test';
import assert from 'node:assert/strict';
import {puzzleProjection,projectPuzzlePoint,unprojectPuzzlePoint,createPuzzleMeshProjection,projectedPuzzleBounds} from './puzzle-projection.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function camera(distance,pitch,focus={x:4,y:3,z:1}){
  const s=Math.sin(pitch),c=Math.cos(pitch);
  return {eye:{x:focus.x,y:focus.y+distance*s,z:focus.z+distance*c},forward:{x:0,y:-s,z:-c},up:{x:0,y:c,z:-s}};
}
function screen(c,p){const d=(p.y-c.eye.y)*c.forward.y+(p.z-c.eye.z)*c.forward.z;return {x:(p.x-c.eye.x)/d,y:((p.y-c.eye.y)*c.up.y+(p.z-c.eye.z)*c.up.z)/d}}
test('cells and badge quads stay square at multiple heights, depths, pitches and zoom distances',()=>{
 for(const distance of [6,12,35,70])for(const pitch of [.14,.35,.8])for(const z of [0,1,2,3])for(const y of [0,2,7,15,31]){
  const c=camera(distance,pitch),projection=puzzleProjection(c),at=(x,y)=>screen(c,projectPuzzlePoint(projection,{x,y,z}));
  const a=at(2,y),b=at(3,y),d=at(2,y+1),e=at(3,y+1);
  near(a.x,d.x);near(b.x,e.x);near(a.y,b.y);near(d.y,e.y);near(b.x-a.x,d.y-a.y);
  const p={x:2.37,y:y+.43,z},back=unprojectPuzzlePoint(projection,projectPuzzlePoint(projection,p));near(back.x,p.x);near(back.y,p.y);near(back.z,p.z);
 }
});
test('the floor stays fixed, and disabled/side views keep original geometry',()=>{
 const c=camera(15,.35),p=puzzleProjection(c);
 for(const z of [0,1,3]){const q={x:2,y:0,z};assert.deepEqual(projectPuzzlePoint(p,q),q)}
 const q={x:3,y:8,z:1};assert.deepEqual(projectPuzzlePoint({...p,enabled:false},q),q);
 assert.equal(puzzleProjection({...c,forward:{...c.forward,x:.2}}).enabled,false);
});
test('mesh projection preserves shared originals, skips unchanged frames and disposes removed clones',()=>{
 let clones=0,disposed=0;
 const point=(x,y,z)=>({x,y,z,set(x,y,z){Object.assign(this,{x,y,z})}});
 const source={points:[point(0,0,0),point(1,1,0)]};
 const cache=createPuzzleMeshProjection(mesh=>{clones++;return {points:mesh.points.map(p=>point(p.x,p.y,p.z)),dispose(){disposed++},dirty:false}});
 const obj=()=>({mesh:source,pos3D:{x:2,y:5,z:1},scale3D:{x:1,y:1,z:1}}),a=obj(),b=obj(),p=puzzleProjection(camera(15,.35));
 cache.begin(p);cache.apply(a);cache.apply(b);cache.end();assert.equal(clones,2);assert.notEqual(a.mesh,b.mesh);assert.equal(source.points[1].y,1);
 a.mesh.dirty=false;cache.begin(p);cache.apply(a);cache.apply(b);cache.end();assert.equal(a.mesh.dirty,false);assert.equal(clones,2);
 cache.begin(puzzleProjection(camera(10,.35)));cache.apply(a);cache.end();assert.equal(a.mesh.dirty,true);assert.equal(b.mesh,source);assert.equal(disposed,1);
 cache.begin({...p,enabled:false});cache.apply(a);cache.end();assert.equal(a.mesh,source);assert.equal(disposed,2);cache.clear();assert.equal(disposed,2);
});

test('rotated character and child meshes use the same world-space correction as the puzzle',()=>{
 const angle=.35,c=Math.cos(angle),s=Math.sin(angle),translation={x:2,y:6,z:1};
 function matrix(inverse=false){return {
  m:[1,0,0,0,0,c,s,0,0,-s,c,0,translation.x,translation.y,translation.z,1],
  copy(){return matrix(inverse)},invert(){return matrix(!inverse)},
  transformPoint(p){if(inverse){const y=p.y-translation.y,z=p.z-translation.z;return {x:p.x-translation.x,y:y*c+z*s,z:-y*s+z*c}}return {x:p.x+translation.x,y:p.y*c-p.z*s+translation.y,z:p.y*s+p.z*c+translation.z}},
 }}
 const point=(x,y,z)=>({x,y,z,set(x,y,z){Object.assign(this,{x,y,z})}});
 const source={points:[point(-.3,0,0),point(.3,.5,.02)]},object={mesh:source};
 const cache=createPuzzleMeshProjection(mesh=>({points:mesh.points.map(p=>point(p.x,p.y,p.z)),dispose(){},dirty:false})),projection=puzzleProjection(camera(12,.35)),m=matrix();
 cache.begin(projection);cache.apply(object,m);cache.end();
 for(let i=0;i<source.points.length;i++){const expected=projectPuzzlePoint(projection,m.transformPoint(source.points[i])),actual=m.transformPoint(object.mesh.points[i]);near(actual.x,expected.x);near(actual.y,expected.y);near(actual.z,expected.z)}
 object.mesh.dirty=false;cache.begin(projection);cache.apply(object,m);cache.end();assert.equal(object.mesh.dirty,false);cache.clear();assert.equal(object.mesh,source);
});

test('temporary picking meshes can be restored and reused without cloning every query',()=>{
 let clones=0,disposed=0;const point=(x,y,z)=>({x,y,z,set(x,y,z){Object.assign(this,{x,y,z})}}),source={points:[point(0,1,0)]};
 const cache=createPuzzleMeshProjection(mesh=>{clones++;return {points:mesh.points.map(p=>point(p.x,p.y,p.z)),dispose(){disposed++}}}),object={mesh:source,pos3D:{x:1,y:2,z:0},scale3D:{x:1,y:1,z:1}},p=puzzleProjection(camera(15,.35));
 cache.begin(p);cache.apply(object);cache.end();const corrected=object.mesh;cache.restore();assert.equal(object.mesh,source);
 cache.begin(p);cache.apply(object);cache.end();assert.equal(object.mesh,corrected);assert.equal(clones,1);cache.restore();cache.clear();assert.equal(disposed,1);
});

test('corrected culling bounds contain transformed points throughout rotated boxes',()=>{
 const p=puzzleProjection(camera(10,.35)),bounds={min:{x:-.5,y:-.5,z:0},max:{x:.5,y:.5,z:1}};
 for(const angle of [0,.35,1])for(const y of [1,8,15]){
  const c=Math.cos(angle),s=Math.sin(angle),m=[c,s,0,0,-s,c,0,0,0,0,1,0,3,y,1,1],sphere=projectedPuzzleBounds(p,bounds,m);assert(sphere);
  for(let i=0;i<=4;i++)for(let j=0;j<=4;j++)for(let k=0;k<=4;k++){
   const x=-.5+i/4,yy=-.5+j/4,z=k/4,q=projectPuzzlePoint(p,{x:c*x-s*yy+3,y:s*x+c*yy+y,z:z+1});
   assert(Math.hypot(q.x-sphere.center.x,q.y-sphere.center.y,q.z-sphere.center.z)<=sphere.radius+1e-8);
  }
 }
 const nearEye={min:{x:0,y:0,z:p.eyeZ-.0001},max:{x:1,y:1,z:p.eyeZ+1}},identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];assert.equal(projectedPuzzleBounds(p,nearEye,identity),null);
});

test('experimental extrusion scales rendered depth and maps picks back to the logical grid',()=>{
  const original={x:2,y:3,z:2};
  for(const enabled of [false,true]){
    const projection=puzzleProjection({...camera(16,.18),enabled,depthScale:1.5});
    const stretched=projectPuzzlePoint(projection,original);
    near(stretched.z,3);
    const recovered=unprojectPuzzlePoint(projection,stretched);
    near(recovered.x,original.x);
    near(recovered.y,original.y);
    near(recovered.z,original.z);
  }
});
