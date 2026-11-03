import test from 'node:test';
import assert from 'node:assert/strict';
import {patchPuzzleVertexSource,createPuzzleGPUProjection} from './puzzle-projection-gpu.js';
const colour='uniform mat4 viewProj,lightViewProj;out vec3 P,N;void main(){vec4 w=mat4(m0,m1,m2,m3)*vec4(p,1.);gl_Position=viewProj*w;P=w.xyz;}';
const depth='uniform mat4 viewProj;out vec2 T;out float A;void main(){gl_Position=viewProj*mat4(m0,m1,m2,m3)*vec4(p,1.);}';
test('only matching colour/depth vertex programs receive the shared correction',()=>{
 for(const [source,kind]of [[colour,'colour'],[depth,'depth']]){
  const result=patchPuzzleVertexSource(source);assert.equal(result.kind,kind);assert(result.source.includes('llPuzzleVertex(mat4('));assert(result.source.includes('w.w=1.0;'));assert.equal(patchPuzzleVertexSource(result.source).source,result.source);
 }
 const other='void main(){gl_Position=vec4(0);}';assert.deepEqual(patchPuzzleVertexSource(other),{source:other,kind:null});
});
test('tagged GPU draws preserve source matrices, deferred tags and native culling state',()=>{
 const calls=[],uploads=[];const gl={shaderSource:(shader,source)=>calls.push(source),useProgram(){},getUniformLocation:(_,name)=>name,uniform4f:(...values)=>uploads.push(values)};
 const renderer={frustumCulling:true,drawMesh(mesh,matrix){calls.push({mesh,tag:matrix.m[15],culling:this.frustumCulling})}};
 const adapter=createPuzzleGPUProjection({gl,cloneMesh:()=>assert.fail()});adapter.attach(renderer);
 const p={enabled:true,eyeX:1,eyeY:2,eyeZ:10,fy:-.3,fz:-.9,uy:.9,uz:-.3};adapter.begin(p);assert.equal(adapter.active,false);
 gl.shaderSource({},colour);gl.shaderSource({},depth);adapter.begin(p);assert(adapter.ready&&adapter.active);
 const program={};gl.useProgram(program);const count=uploads.length;gl.useProgram(program);assert.equal(uploads.length,count);
 const matrix=()=>({m:[1,0,0,0,0,1,0,0,0,0,1,0,1,2,3,1],copy(){const clone=matrix();clone.m=[...this.m];return clone}});
 const mesh={},m=matrix();adapter.apply({mesh});renderer.drawMesh(mesh,m);assert.equal(m.m[15],1);assert.deepEqual(calls.at(-1),{mesh,tag:2,culling:false});assert.equal(renderer.frustumCulling,true);
 const deferred=m.copy();deferred.m[15]=2;renderer.drawMesh(mesh,deferred);assert.equal(calls.at(-1).culling,false);
 const scenery={};renderer.drawMesh(scenery,m);assert.equal(calls.at(-1).tag,1);assert.equal(calls.at(-1).culling,true);
 adapter.begin({...p,enabled:false});assert.equal(adapter.active,false);adapter.dispose();
});

test('a failed GPU vertex compile retries native source and keeps the CPU path available',()=>{
 const shader={},seen=[],gl={COMPILE_STATUS:1,shaderSource:(_,source)=>seen.push(source),compileShader(){},getShaderParameter:()=>false,useProgram(){},getUniformLocation:()=>null,uniform4f(){}};
 const adapter=createPuzzleGPUProjection({gl,cloneMesh:()=>assert.fail()});
 gl.shaderSource(shader,colour);gl.compileShader(shader);gl.shaderSource({},depth);
 assert.equal(seen.at(-2),colour);assert.equal(adapter.ready,false);adapter.begin({enabled:true});assert.equal(adapter.active,false);adapter.dispose();
});

test('GPU culling uses corrected bounds without changing renderer visibility settings',()=>{
 let draws=0,visible=false;const gl={shaderSource(){},useProgram(){},getUniformLocation:()=>null,uniform4f(){}};
 const renderer={frustumCulling:true,isSphereVisible(center,radius){assert(Number.isFinite(center.y)&&radius>0);return visible},drawMesh(){draws++;assert.equal(this.frustumCulling,false)}};
 const adapter=createPuzzleGPUProjection({gl,cloneMesh:()=>assert.fail()});adapter.attach(renderer);gl.shaderSource({},colour);gl.shaderSource({},depth);
 adapter.begin({enabled:true,eyeX:1,eyeY:2,eyeZ:10,fy:-.3,fz:-.9,uy:.9,uz:-.3});
 const mesh={bounds:{min:{x:0,y:0,z:0},max:{x:1,y:1,z:1}},dirty:false},matrix={m:[1,0,0,0,0,1,0,0,0,0,1,0,2,3,0,1],copy(){return {...this,m:[...this.m]}}};adapter.apply({mesh});
 renderer.drawMesh(mesh,matrix);assert.equal(draws,0);assert.equal(renderer.frustumCulling,true);assert.equal(matrix.m[15],1);
 visible=true;renderer.drawMesh(mesh,matrix);assert.equal(draws,1);assert.equal(renderer.frustumCulling,true);adapter.dispose();
});
