import {createPuzzleMeshProjection,projectedPuzzleBounds} from './puzzle-projection.js';

// LittleJS 1.27.2 exposes fragment-only Shader snippets. This context-local
// adapter adds one guarded vertex operation to its colour and depth programs.
// The unused affine matrix element m3.w tags projected instances (2 vs 1).
// Object matrices stay untouched; shaders restore homogeneous w before use.
export const PUZZLE_VERTEX_GLSL=`
uniform vec4 llPuzzleEye;
uniform vec4 llPuzzleAxes;
vec4 llPuzzleVertex(vec4 w,float tag){
  w.w=1.0;
  if(tag<1.5||llPuzzleEye.w<0.5)return w;
  float d=-llPuzzleEye.y*llPuzzleAxes.x+(w.z-llPuzzleEye.z)*llPuzzleAxes.y;
  float a=-llPuzzleEye.y*llPuzzleAxes.z+(w.z-llPuzzleEye.z)*llPuzzleAxes.w;
  float b=d*llPuzzleAxes.z-llPuzzleAxes.x*a;
  float den=b-llPuzzleAxes.x*w.y;
  if(d<=0.001||b<=0.001||den<=0.001)return w;
  w.y=d*w.y/den;
  w.x=llPuzzleEye.x+(w.x-llPuzzleEye.x)*(d+llPuzzleAxes.x*w.y)/d;
  return w;
}
`;
export function patchPuzzleVertexSource(source){
  if(source.includes('llPuzzleVertex'))return {source,kind:null};
  let kind=null;
  const colour='vec4 w=mat4(m0,m1,m2,m3)*vec4(p,1.);';
  const depth='gl_Position=viewProj*mat4(m0,m1,m2,m3)*vec4(p,1.);';
  if(source.includes('out vec3 P,N;')&&source.includes(colour)){
    kind='colour';source=source.replace(colour,'vec4 w=llPuzzleVertex(mat4(m0,m1,m2,m3)*vec4(p,1.),m3.w);');
  }else if(source.includes('out vec2 T;out float A;')&&source.includes(depth)){
    kind='depth';source=source.replace(depth,'gl_Position=viewProj*llPuzzleVertex(mat4(m0,m1,m2,m3)*vec4(p,1.),m3.w);');
  }
  return {source:kind?source.replace('void main(){',PUZZLE_VERTEX_GLSL+'\nvoid main(){'):source,kind};
}

export function createPuzzleGPUProjection({gl,cloneMesh}){
  const sources=new Set(),tagged=new WeakSet(),uniforms=new WeakMap(),originalSources=new WeakMap();
  const picker=createPuzzleMeshProjection(cloneMesh),visibility=new WeakMap();
  const shaderSource=gl.shaderSource.bind(gl),useProgram=gl.useProgram.bind(gl),compileShader=gl.compileShader?.bind(gl);
  let renderer,drawMesh;
  let projection,active=false,failed=false,version=0,key,currentProgram;
  function upload(program){
    if(!program||!projection)return;
    let state=uniforms.get(program);
    if(!state){state={eye:gl.getUniformLocation(program,'llPuzzleEye'),axes:gl.getUniformLocation(program,'llPuzzleAxes'),version:-1};uniforms.set(program,state)}
    if(state.eye===null||state.version===version)return;
    gl.uniform4f(state.eye,projection.eyeX,projection.eyeY,projection.eyeZ,active?1:0);
    gl.uniform4f(state.axes,projection.fy,projection.fz,projection.uy,projection.uz);state.version=version;
  }
  function visibleBounds(mesh,matrix){
    let transforms=visibility.get(mesh);
    if(!transforms){transforms=new WeakMap();visibility.set(mesh,transforms)}
    const previous=transforms.get(matrix),values=matrix.m;
    if(previous&&previous.version===version&&!mesh.dirty&&previous.values.every((v,i)=>v===values[i]))return previous.bounds;
    if(mesh.dirty||!mesh.bounds)mesh.computeRadius();
    const bounds=projectedPuzzleBounds(projection,mesh.bounds,values);
    transforms.set(matrix,{version,values:Array.from(values),bounds});return bounds;
  }
  gl.shaderSource=(shader,source)=>{
    const patched=patchPuzzleVertexSource(source);if(patched.kind){sources.add(patched.kind);originalSources.set(shader,source)}
    shaderSource(shader,patched.source);
  };
  if(compileShader)gl.compileShader=shader=>{
    compileShader(shader);
    if(originalSources.has(shader)&&!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
      failed=true;active=false;version++;
      shaderSource(shader,originalSources.get(shader));compileShader(shader);upload(currentProgram);
    }
  };
  gl.useProgram=program=>{useProgram(program);currentProgram=program;upload(program)};

  return {
    attach(target){
      renderer=target;drawMesh=target.drawMesh;
      renderer.drawMesh=function(mesh,matrix,tileInfo,color){
        let projected=matrix?.m?.[15]===2;
        if(projected&&!active){matrix=matrix.copy();matrix.m[15]=1;projected=false}
        const mark=active&&tagged.has(mesh)&&matrix?.m;
        if((projected||mark)&&this.frustumCulling&&this.isSphereVisible){
          const bounds=visibleBounds(mesh,matrix);
          if(bounds&&!this.isSphereVisible(bounds.center,bounds.radius))return;
        }
        if(mark&&!projected){matrix=matrix.copy();matrix.m[15]=2;projected=true}
        // Corrected bounds above replace the native undeformed sphere. Deferred
        // transparent and shadow replay draws retain the tag and use this too.
        const culling=this.frustumCulling;
        if(projected)this.frustumCulling=false;
        try{return drawMesh.call(this,mesh,matrix,tileInfo,color)}finally{this.frustumCulling=culling}
      };
    },
    get ready(){return !failed&&sources.has('colour')&&sources.has('depth')},
    get active(){return active},
    begin(next,requested=true){
      const enabled=requested&&this.ready&&next.enabled;
      const nextKey=Object.values(next).join(':')+':'+enabled;
      if(nextKey!==key){key=nextKey;version++;projection=next;active=enabled;upload(currentProgram)}
      if(!active)picker.clear();
    },
    apply(object){if(active&&object?.mesh)tagged.add(object.mesh)},
    pick(objects,query){
      if(!active)return query();
      picker.begin(projection);
      try{
        for(const object of objects){
          picker.apply(object,object.getMatrix());
          if(object.mesh?.dirty){object.mesh.computeRadius();object.mesh.dirty=false}
        }
        picker.end();return query();
      }finally{picker.restore()}
    },
    dispose(){picker.clear();gl.shaderSource=shaderSource;gl.useProgram=useProgram;if(compileShader)gl.compileShader=compileShader;if(renderer)renderer.drawMesh=drawMesh},
  };
}
