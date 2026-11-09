import { EngineObject3D, Color, Mesh, vec3, engineObjectsRaycast3D } from 'littlejsengine';

const DIAMETER=.20,PRESS_SCALE=.72,PRESS_TIME=95,RETURN_TIME=140,SIDES=32;
const keyOf=node=>`${node.x},${node.y},${node.z}`;
function roundedCorners(corners,cut=.06){
  const points=[];
  for(let i=0;i<corners.length;i++){
    const previous=corners[(i+corners.length-1)%corners.length],corner=corners[i],next=corners[(i+1)%corners.length];
    const ratio=Math.min(.2,cut/Math.hypot(previous[0]-corner[0],previous[1]-corner[1]),cut/Math.hypot(next[0]-corner[0],next[1]-corner[1]));
    const start=[corner[0]+(previous[0]-corner[0])*ratio,corner[1]+(previous[1]-corner[1])*ratio],end=[corner[0]+(next[0]-corner[0])*ratio,corner[1]+(next[1]-corner[1])*ratio];
    for(let step=0;step<=4;step++){const t=step/4,s=1-t;points.push([s*s*start[0]+2*s*t*corner[0]+t*t*end[0],s*s*start[1]+2*s*t*corner[1]+t*t*end[1]])}
  }
  return points;
}
function markerMesh(shape){
  const vertices=[vec3()];
  if(shape==='circle')for(let i=0;i<SIDES;i++){const a=i*Math.PI*2/SIDES;vertices.push(vec3(Math.cos(a)*.5,0,Math.sin(a)*.5))}
  else{
    const corners=shape==='diamond'?[[0,-.5],[.5,0],[0,.5],[-.5,0]]:[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
    for(const [x,z]of roundedCorners(corners))vertices.push(vec3(x,0,z));
  }
  const sides=vertices.length-1,indices=[];for(let i=1;i<=sides;i++)indices.push(0,i,i===sides?1:i+1);
  const mesh=new Mesh();mesh.addTriangles(vertices,indices,vec3(0,1,0),undefined,new Color(1));mesh.doubleSided=true;return mesh;
}

// These objects are visual controls only. They never enter movement collision geometry.
export function createMovementMarkers(){
  const entries=new Map,objects=new Map;
  const meshes={circle:markerMesh('circle'),diamond:markerMesh('diamond'),square:markerMesh('square')};
  let pressed=null,shadowShader,stretchY=y=>y,shape='circle';
  function dispose(){for(const entry of entries.values())entry.object.destroy();entries.clear();objects.clear();pressed=null}
  function sync(targets,positionFor,colorFor,stretch=y=>y,highlighted=new Set,highlightColorFor=colorFor,nextShape='circle'){
    stretchY=stretch;shape=Object.hasOwn(meshes,nextShape)?nextShape:'circle';
    const wanted=new Set(targets.map(keyOf));
    for(const [key,entry]of entries)if(!wanted.has(key)){entry.object.destroy();objects.delete(entry.object);entries.delete(key)}
    if(pressed&&!wanted.has(pressed.key))pressed=null;
    for(const target of targets){
      const key=keyOf(target),base=positionFor(target),color=colorFor(target),highlightColor=highlightColorFor(target);
      let entry=entries.get(key);
      if(!entry){
        const object=new EngineObject3D(base,meshes[shape],undefined,color);
        object.lighting=false;object.emissive=1;object.castShadow=false;object.receiveShadow=!!shadowShader;object.shader=shadowShader;
        entry={object,node:{...target},base,color,highlightColor,highlighted:highlighted.has(key)};entries.set(key,entry);objects.set(object,entry);
      }
      entry.object.mesh=meshes[shape];entry.base=base;entry.color=color;entry.highlightColor=highlightColor;entry.highlighted=highlighted.has(key);
    }
    update(performance.now());
  }
  function update(now){
    for(const [key,entry]of entries){
      let scale=1;
      if(pressed?.key===key){
        const elapsed=now-pressed.start;
        if(elapsed<PRESS_TIME){const t=Math.max(0,elapsed/PRESS_TIME),q=1-(1-t)**3;scale=1+(PRESS_SCALE-1)*q}
        else if(elapsed<PRESS_TIME+RETURN_TIME){const t=(elapsed-PRESS_TIME)/RETURN_TIME,q=1-(1-t)**3;scale=PRESS_SCALE+(1-PRESS_SCALE)*q}
        else pressed=null;
      }
      entry.object.pos3D=entry.base.add(vec3(0,stretchY(.001),0));
      entry.object.scale3D=vec3(DIAMETER*scale,1,DIAMETER*scale);
      entry.object.color=entry.highlighted?entry.highlightColor:entry.color;
    }
  }
  function press(node){
    const key=keyOf(node);if(!entries.has(key))return 0;
    pressed={key,start:performance.now()};return PRESS_TIME;
  }
  function pick(ray,occluders){
    if(!entries.size)return null;
    const hit=engineObjectsRaycast3D(ray,[...objects.keys(),...occluders])[0];
    return objects.get(hit)?.node??null;
  }
  function setShadowShader(shader){
    shadowShader=shader;
    for(const {object}of entries.values()){object.shader=shader;object.receiveShadow=!!shader}
  }
  return{sync,update,press,pick,setShadowShader,dispose,get renderObjects(){return [...objects.keys()]}};
}
