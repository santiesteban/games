import {Color,EngineObject3D,Light3D,Mesh,Shader,vec3} from 'littlejsengine';
import {lightboxGroundShader} from './shadow-materials.js';

const glowShader=new Shader(`
  void mainImage(out vec4 color,vec2 uv){
    vec2 outside=max(abs((localUV-0.5)*1.6)-vec2(0.5),vec2(0.0));
    float glow=1.0-smoothstep(0.0,0.3,length(outside));
    color=vec4(1.0,1.0,1.0,glow*0.15);
  }
`);

// Six bounded point lights approximate an irregular luminous piece. They do
// not cast local shadows; the normal sunlight/shadow pipeline stays intact.
export function createSelectionLightbox(){
  const lights=Array.from({length:6},()=>new Light3D(vec3(),2.8,new Color(1),0));
  let halo,ground,key,currentGroup,samples=[];
  function clear(){
    halo?.destroy();ground?.destroy();halo=ground=undefined;key=currentGroup=undefined;
    for(const light of lights)light.intensity=0;
  }
  function update({group,width,height,worldPoint,tint,pulse,strength,spill,glow}){
    if(!group||strength<=0){clear();return}
    const next=`${width}:${height}:${group.id}:${group.depth}:${worldPoint(0,1,0).y}:${worldPoint(0,0,1).x}`;
    if(next!==key||currentGroup!==group){
      clear();key=next;currentGroup=group;
      const cells=group.cells,first=cells.reduce((a,b)=>a.y>b.y?a:b);
      samples=[first];
      while(samples.length<Math.min(6,cells.length)){
        const candidates=cells.filter(c=>!samples.includes(c));
        const distance=c=>Math.min(...samples.map(s=>(s.x-c.x)**2+(s.y-c.y)**2));
        samples.push(candidates.reduce((a,b)=>distance(a)>distance(b)?a:b));
      }
      const mesh=new Mesh();
      for(const c of cells){const x=c.x+.5,y=height-c.y-.5,z=group.depth+.012;
        mesh.addQuad(worldPoint(x-.8,y+.8,z),worldPoint(x-.8,y-.8,z),worldPoint(x+.8,y-.8,z),worldPoint(x+.8,y+.8,z));
      }
      mesh.doubleSided=true;halo=new EngineObject3D(vec3(),mesh);halo.emissive=1;halo.transparent=true;halo.additive=true;halo.shader=glowShader;halo.castShadow=halo.receiveShadow=false;
      const floor=new Mesh().addQuad(vec3(-3,-.004,0),vec3(width+3,-.004,0),vec3(width+3,-.004,8),vec3(-3,-.004,8));
      floor.doubleSided=true;ground=new EngineObject3D(vec3(),floor);ground.emissive=1;ground.transparent=true;ground.additive=true;ground.shader=lightboxGroundShader;ground.castShadow=ground.receiveShadow=false;
    }
    const peak=Math.max(.001,tint.r,tint.g,tint.b);
    tint=new Color(tint.r/peak,tint.g/peak,tint.b/peak);
    halo.color=new Color(tint.r,tint.g,tint.b,glow?strength*(.5+.5*pulse):0);
    for(let i=0;i<lights.length;i++){
      const cell=samples[i],light=lights[i];light.intensity=spill&&cell?.3*strength*(.7+.9*pulse)/Math.sqrt(samples.length):0;
      light.color=tint;
      if(cell)light.pos3D=worldPoint(cell.x+.5,height-cell.y-.5,group.depth+.5);
    }
  }
  return{update,clear};
}
