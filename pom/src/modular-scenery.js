import {EngineObject3D,Mesh,Color,vec2,vec3} from 'littlejsengine';
import {CARDBOARD_THICKNESS} from './cardboard.js';
import {puzzleBackgroundDistance} from './scenery-distance.js';
import {pieceShadowShader} from './shadow-materials.js';
import {createSceneryKitLoader,hasSceneryKit} from './scenery-kits.js';

const white=new Color(1),edgeColor=new Color(.43,.35,.24);
// Meshes use the authored pixel pivot, including transparent margins. All art
// is fixed in world orientation; only the distant panorama turns with yaw.
function cardGeometry(asset){
  const {meta,mask}=asset,[px,py]=meta.pivotPixels,[,top,,bottom]=meta.alphaBoundsPixels;
  const unit=meta.visibleHeightWorldUnits/(bottom-top),point=(x,y,z=0)=>vec3((x-px)*unit,(py-y)*unit,z);
  const front=new Mesh().addQuad(point(0,0),point(0,meta.height),point(meta.width,meta.height),point(meta.width,0));
  const back=new Mesh().addQuad(point(meta.width,0,-CARDBOARD_THICKNESS),point(meta.width,meta.height,-CARDBOARD_THICKNESS),point(0,meta.height,-CARDBOARD_THICKNESS),point(0,0,-CARDBOARD_THICKNESS));
  const sides=new Mesh(),{width:w,height:h,rgba}=mask,solid=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&rgba[(y*w+x)*4+3]>=96;
  const P=(x,y,z)=>point(x*meta.width/w,y*meta.height/h,z);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(solid(x,y)){
    const edge=(a,b)=>sides.addQuad(P(...a,0),P(...b,0),P(...b,-CARDBOARD_THICKNESS),P(...a,-CARDBOARD_THICKNESS));
    if(!solid(x,y-1))edge([x,y],[x+1,y]);
    if(!solid(x+1,y))edge([x+1,y],[x+1,y+1]);
    if(!solid(x,y+1))edge([x+1,y+1],[x,y+1]);
    if(!solid(x-1,y))edge([x,y+1],[x,y]);
  }
  sides.doubleSided=true;
  const [left,,right]=meta.alphaBoundsPixels;
  return {front,back,sides,left:(left-px)*unit,right:(right-px)*unit,height:meta.visibleHeightWorldUnits};
}
export function createModularScenery({onChange=()=>{},onStatus=()=>{}}={}){
  const loader=createSceneryKitLoader(),meshCache=new WeakMap,notified=new Set;
  let key,objects=[],reference,bounds,contacts=[];
  function clear(){for(const object of objects)object.destroy();objects=[];key=reference=bounds=undefined;contacts=[]}
  function object(mesh,texture,tint=white,{shadow=false,receive=false}={}){
    const o=new EngineObject3D(vec3(),mesh,texture,tint);o.emissive=1;o.castShadow=shadow;o.receiveShadow=receive;
    if(receive)o.shader=pieceShadowShader;objects.push(o);return o;
  }
  function quad(points,texture,uvs,options){const mesh=new Mesh().addQuad(...points,white,uvs);mesh.doubleSided=true;return object(mesh,texture,white,options)}
  function card(asset,x,z){
    if(!meshCache.has(asset))meshCache.set(asset,cardGeometry(asset));
    const geometry=meshCache.get(asset);
    const front=object(geometry.front,asset.texture,white,{shadow:true});front.pos3D=vec3(x,0,z);
    const back=object(geometry.back,asset.texture,new Color(.6,.56,.48),{shadow:true});back.pos3D=front.pos3D.copy();
    const sides=object(geometry.sides,undefined,edgeColor,{shadow:true});sides.pos3D=front.pos3D.copy();
    contacts.push({asset:asset.meta.webp,x,z,footY:0,thickness:CARDBOARD_THICKNESS});
    return geometry;
  }
  function update({state,width,height,artworkBounds,yaw=0,target=vec3(width/2,0,1.5)}){
    const originX=artworkBounds?.left??0;width=artworkBounds?artworkBounds.right-artworkBounds.left:width;height=artworkBounds?.height??height;
    if(state.artworkSet!=='kit'||state.setting!=='landscape'||!hasSceneryKit(state.environment)){
      clear();return null;
    }
    const record=loader.load(state.environment);
    if(!notified.has(record)){notified.add(record);record.promise.then(()=>onChange())}
    if(record.status!=='ready'){
      clear();onStatus(record.status==='error'?`New kit unavailable: ${record.error.message}`:'Loading the new image kit…');return null;
    }
    onStatus(`New ${state.environment==='meadow'?'Meadow':'Japan Spring'} image kit · grounded cardboard cutouts`);
    const pivot=state.horizonLock?{x:target.x,z:target.z}:{x:originX+width/2,z:0};
    const next=JSON.stringify([state.environment,originX,width,height,yaw,pivot,state.backgroundDistance,state.background,state.foreground,state.props]);
    if(next===key)return reference;
    clear();key=next;
    const a=record.assets,cx=originX+width/2,span=Math.max(192,width*6),margin=state.props?10:1;
    // The panorama can approach the board, but must stay behind the farthest
    // world-space silhouette at this bearing (including a locked/follow target).
    const dx=Math.max(Math.abs(originX-margin-pivot.x),Math.abs(originX+width+margin-pivot.x));
    const safeBack=Math.abs(Math.sin(yaw))*dx+Math.abs(Math.cos(yaw))*(Math.abs(pivot.z)+(state.props?5:1))+1;
    const back=-Math.max(state.backgroundDistance??puzzleBackgroundDistance(width),safeBack);
    const wall=(x,y,offset=0)=>vec3(pivot.x+Math.sin(yaw)*(back+offset)+Math.cos(yaw)*x,y,pivot.z+Math.cos(yaw)*(back+offset)-Math.sin(yaw)*x);
    if(state.background){
      const paintHeight=Math.max(24,height+16),paintTop=paintHeight-3,paintWidth=paintHeight*2,top=Math.max(100,height*3),bottom=-80;
      quad([wall(-span/2,top),wall(span/2,top),wall(span/2,bottom),wall(-span/2,bottom)],a.sky.texture,[vec2(.5-span/2/paintWidth,(paintTop-top)/paintHeight),vec2(.5+span/2/paintWidth,(paintTop-top)/paintHeight),vec2(.5+span/2/paintWidth,(paintTop-bottom)/paintHeight),vec2(.5-span/2/paintWidth,(paintTop-bottom)/paintHeight)]);
      const ridgeHeight=5.5,ridgeWidth=ridgeHeight*4;
      quad([wall(-span/2,ridgeHeight,.08),wall(span/2,ridgeHeight,.08),wall(span/2,0,.08),wall(-span/2,0,.08)],a['distant-hills'].texture,[vec2(-span/2/ridgeWidth,0),vec2(span/2/ridgeWidth,0),vec2(span/2/ridgeWidth,1),vec2(-span/2/ridgeWidth,1)]);
    }
    // Exact world UV scale: one repeat covers 16 x 16 puzzle cells. Horizontal
    // geometry supplies perspective; no painted foreground is stretched onto it.
    const reach=Math.max(100,width*4,height*4),left=cx-reach,right=cx+reach,far=-reach,near=reach;
    const floor=[vec3(left,-.005,far),vec3(right,-.005,far),vec3(right,-.005,near),vec3(left,-.005,near)];
    if(state.foreground)quad(floor,a['ground-tile'].texture,[vec2(left/16,far/16),vec2(right/16,far/16),vec2(right/16,near/16),vec2(left/16,near/16)],{receive:true});
    else quad(floor,undefined,undefined,{receive:true}).color=new Color(.7,.72,.57);
    if(state.props){
      const placements=[['tree-a',-1,-2,3],['tree-b',1,-4,3],['shrub-a',-1,1.5,2.8],['shrub-b',1,.5,2.8],['grass-a',-1,5.5,4.8],['grass-b',1,5.8,4.8],['flowers-a',-1,3.8,3.5],['flowers-b',1,4.4,3.8]];
      for(const [name,side,z,clearance]of placements){
        const asset=a[name];if(!meshCache.has(asset))meshCache.set(asset,cardGeometry(asset));
        const g=meshCache.get(asset),x=side<0?originX-clearance-g.right:originX+width+clearance-g.left;
        card(asset,x,z);
      }
    }
    bounds={left:originX-12,right:originX+width+12,back:-12,front:10};
    reference={source:'modular-kit',distance:-back,theme:state.environment,curved:false,points:[wall(-1,0,.08),wall(0,0,.08),wall(1,0,.08)]};
    return reference;
  }
  return {update,clear,get bounds(){return bounds},get contacts(){return contacts},get ready(){return !!reference}};
}
