import {EngineObject3D,Mesh,Color,vec2,vec3} from 'littlejsengine';

// World-anchored scenery for the camera study. Scenery never enters gameplay
// collision or picking. The original registered images are reused unchanged.
export function createCameraScenery(){
  let key,objects=[];
  const color=hex=>new Color(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
  function add(mesh,tileInfo,tint=new Color(1)){
    mesh.doubleSided=true;const object=new EngineObject3D(vec3(),mesh,tileInfo,tint);
    object.lighting=false;object.emissive=1;object.castShadow=false;object.receiveShadow=false;objects.push(object);return object;
  }
  function patch(points,texture,uvs,tint){return add(new Mesh().addQuad(...points,tint,uvs),texture)}
  function polygon(points,tint){
    const mesh=new Mesh(),vertices=[vec3(points.reduce((n,p)=>n+p.x,0)/points.length,points.reduce((n,p)=>n+p.y,0)/points.length,points.reduce((n,p)=>n+p.z,0)/points.length),...points],indices=[];
    for(let i=1;i<vertices.length;i++)indices.push(0,i,i===vertices.length-1?1:i+1);
    return add(mesh.addTriangles(vertices,indices,vec3(0,0,1),undefined,color(tint)));
  }
  function tree(x,z,height,japan){
    const mesh=new Mesh(),trunk=color('#796550');
    mesh.addQuad(vec3(x-.1,0,z),vec3(x+.1,0,z),vec3(x+.08,height*.72,z),vec3(x-.08,height*.72,z),trunk);add(mesh);
    polygon(Array.from({length:24},(_,i)=>{const a=i*Math.PI/12,r=1+.055*Math.cos(i*2.6);return vec3(x+Math.cos(a)*height*.45*r,height*.7+Math.sin(a)*height*.34*r,z+.01)}),japan?'#e5b5bf':'#6e9270');
    polygon(Array.from({length:20},(_,i)=>{const a=i*Math.PI/10;return vec3(x+height*.09+Math.cos(a)*height*.32,height*.79+Math.sin(a)*height*.23,z+.025)}),japan?'#f2d4d5':'#92ae87');
  }
  function update({state,environment,textures,width,height,yaw=0}){
    const next=JSON.stringify([state.setting,state.environment,state.background,state.foreground,state.props,environment.variant,width,height,state.setting==='landscape'?yaw:0]);
    if(next===key)return;key=next;for(const object of objects)object.destroy();objects=[];
    const landscape=state.setting==='landscape',back=landscape?-8:-.45,cx=width/2,span=Math.max(48,width*3),wallHeight=Math.max(height+8,span/environment.aspectRatio*environment.groundAnchorY),groundFront=40;
    const anchor=Math.min(.97,Math.max(.1,environment.groundAnchorY)),uv=(a,b)=>[vec2(0,a),vec2(1,a),vec2(1,b),vec2(0,b)];
    // The set has a fixed wall. Distant landscape art behaves like an upright
    // panorama: its horizon stays level while the trees and terrain stay put.
    const wallPoint=(x,y)=>landscape?vec3(cx+Math.sin(yaw)*back+Math.cos(yaw)*x,y,Math.cos(yaw)*back-Math.sin(yaw)*x):vec3(cx+x,y,back);
    const wall=[wallPoint(-span/2,wallHeight),wallPoint(span/2,wallHeight),wallPoint(span/2,0),wallPoint(-span/2,0)];
    patch(wall,state.background?textures[0]:undefined,uv(0,anchor),state.background?new Color(1):color('#eee9df'));
    const groundBack=landscape?-40:back;
    const ground=[vec3(cx-span/2,-.045,groundBack),vec3(cx+span/2,-.045,groundBack),vec3(cx+span/2,-.045,groundFront),vec3(cx-span/2,-.045,groundFront)];
    patch(ground,undefined,undefined,color(landscape?'#a9b58a':'#c9c9a9'));
    if(state.foreground)patch(ground.map(p=>p.add(vec3(0,.003,0))),textures[1],uv(Math.min(.99,anchor+.025),1),new Color(1));
    if(!landscape){
      // A fine join makes the set's right-angle construction easy to inspect.
      patch([vec3(cx-span/2,0,back+.003),vec3(cx+span/2,0,back+.003),vec3(cx+span/2,.025,back+.003),vec3(cx-span/2,.025,back+.003)],undefined,undefined,color('#6f7765'));
    }else if(state.props){
      const japan=environment.id==='japan-spring';
      // Distant mounds and side trees leave the entire playable floor clear.
      for(const side of [-1,1]){
        const x=side<0?-4:width+4;
        polygon([vec3(x-9,0,-6),vec3(x-6,1.5,-6),vec3(x-2,2.7,-6),vec3(x+2,1.8,-6),vec3(x+7,0,-6)],'#9dac9a');
        tree(side<0?-3:width+3,-4,3.2,japan);tree(side<0?-5:width+5,1.5,4.4,japan);
        for(let i=0;i<4;i++){
          const xx=side<0?-2-i*.7:width+2+i*.7,z=5.5+i*.6;
          polygon([vec3(xx-.45,0,z),vec3(xx-.25,.55,z),vec3(xx,.15,z),vec3(xx+.18,.8,z),vec3(xx+.32,.2,z),vec3(xx+.5,0,z)],'#758b62');
        }
      }
    }
  }
  return{update,destroy(){for(const object of objects)object.destroy();objects=[];key=undefined}};
}
