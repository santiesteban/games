import { EngineObject3D, buildCylinder, Color, vec3, render3D, engineObjectsRaycast3D } from 'littlejsengine';

const DIAMETER=.26,REST_HEIGHT=.04,PRESSED_HEIGHT=.006,PRESS_TIME=95,RETURN_TIME=140,SIDES=28;
const keyOf=node=>`${node.x},${node.y},${node.z}`;

// These objects are visual controls only. They never enter movement collision geometry.
export function createMovementMarkers(){
  const entries=new Map,objects=new Map;
  const mesh=buildCylinder(1,1,SIDES,false,true,.045,2);
  mesh.colors=mesh.normals.map(normal=>{const shade=normal.y>.5?1:.93;return new Color(shade,shade,shade)});
  mesh.dirty=true;
  let hovered=null,pressed=null,shadowShader,stretchY=y=>y;
  function dispose(){for(const entry of entries.values())entry.object.destroy();entries.clear();objects.clear();hovered=null;pressed=null}
  function sync(targets,positionFor,colorFor,stretch=y=>y){
    stretchY=stretch;
    const wanted=new Set(targets.map(keyOf));
    for(const [key,entry]of entries)if(!wanted.has(key)){entry.object.destroy();objects.delete(entry.object);entries.delete(key)}
    if(pressed&&!wanted.has(pressed.key))pressed=null;
    for(const target of targets){
      const key=keyOf(target),base=positionFor(target),color=colorFor(target);
      let entry=entries.get(key);
      if(!entry){
        const object=new EngineObject3D(base,mesh,undefined,color);
        object.lighting=false;object.emissive=1;object.castShadow=false;object.receiveShadow=!!shadowShader;object.shader=shadowShader;
        entry={object,node:{...target},base,color,height:REST_HEIGHT};entries.set(key,entry);objects.set(object,entry);
      }
      entry.base=base;entry.color=color;
    }
    update(performance.now());
  }
  function update(now){
    for(const [key,entry]of entries){
      let height=REST_HEIGHT;
      if(pressed?.key===key){
        const elapsed=now-pressed.start;
        if(elapsed<PRESS_TIME){const t=Math.max(0,elapsed/PRESS_TIME),q=1-(1-t)**3;height=REST_HEIGHT+(PRESSED_HEIGHT-REST_HEIGHT)*q}
        else if(elapsed<PRESS_TIME+RETURN_TIME){const t=(elapsed-PRESS_TIME)/RETURN_TIME,q=1-(1-t)**3;height=PRESSED_HEIGHT+(REST_HEIGHT-PRESSED_HEIGHT)*q}
        else pressed=null;
      }
      entry.height=height;
      entry.object.pos3D=entry.base.add(vec3(0,stretchY(height/2+.005),0));
      entry.object.scale3D=vec3(DIAMETER,stretchY(height),DIAMETER);
      entry.object.color=entry.color;
    }
  }
  function press(node){
    const key=keyOf(node);if(!entries.has(key))return 0;
    pressed={key,start:performance.now()};hovered=null;return PRESS_TIME;
  }
  function pick(ray,occluders){
    if(!entries.size)return null;
    const hit=engineObjectsRaycast3D(ray,[...objects.keys(),...occluders])[0];
    return objects.get(hit)?.node??null;
  }
  function setHovered(node){hovered=node?keyOf(node):null}
  function setShadowShader(shader){
    shadowShader=shader;
    for(const {object}of entries.values()){object.shader=shader;object.receiveShadow=!!shader}
  }
  function drawOutlines(width,style){
    if(width<=0||style?.opacity===0)return;
    const state={shader:render3D.shader,receiveShadow:render3D.receiveShadow};
    render3D.shader=shadowShader;render3D.receiveShadow=!!shadowShader;
    for(const entry of entries.values()){
      const opacity=Math.min(1,(style?.opacity??.16)+(keyOf(entry.node)===hovered ? .12 : 0)),color=style?.color??new Color(0,0,0);
      const ink=new Color(entry.color.r+(color.r-entry.color.r)*opacity,entry.color.g+(color.g-entry.color.g)*opacity,entry.color.b+(color.b-entry.color.b)*opacity),top=entry.base.y+stretchY(entry.height+.006);
      for(let i=0;i<SIDES;i++){
        const a=i*Math.PI*2/SIDES,b=(i+1)*Math.PI*2/SIDES,r=DIAMETER*.455;
        render3D.drawLine(vec3(entry.base.x+Math.cos(a)*r,top,entry.base.z+Math.sin(a)*r),vec3(entry.base.x+Math.cos(b)*r,top,entry.base.z+Math.sin(b)*r),width,ink);
      }
    }
    render3D.flush();render3D.shader=state.shader;render3D.receiveShadow=state.receiveShadow;
  }
  return{sync,update,press,pick,setHovered,setShadowShader,drawOutlines,dispose};
}
