import {paddedCutout} from './cutout-padding.js';
import {defaultSceneryLayout,cutoutMaterial} from './scenery-layout.js';
import {EngineObject3D,Mesh,Color,vec2,vec3,render3D,TextureInfo} from 'littlejsengine';
import {CARDBOARD_THICKNESS} from './cardboard.js';
import {puzzleBackgroundDistance} from './scenery-distance.js';
import {pieceShadowShader,createGroundSurfaceShader,createSceneryProjectionShader} from './shadow-materials.js';
import {minimumBackdropDistance,projectStageShadow} from './stage-geometry.js';
import {createSceneryKitLoader,hasSceneryKit} from './scenery-kits.js';

const white=new Color(1),edgeColor=new Color(.43,.35,.24);
// Meshes use the authored pixel pivot, including transparent margins. All art
// is fixed in world orientation; only the distant panorama turns with yaw.
function cardGeometry(asset,style={},ground=-Infinity){
  function clippedQuad(mesh,points){
    let polygon=points;const result=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],inside=a.y>=ground,next=b.y>=ground;
      if(inside)result.push(a);
      if(inside!==next){const t=(ground-a.y)/(b.y-a.y);result.push(a.lerp(b,t))}
    }
    if(result.length<3)return;
    const indices=[];for(let i=1;i<result.length-1;i++)indices.push(0,i,i+1);
    mesh.addTriangles(result,indices);
  }
  const thickness=style.depth??CARDBOARD_THICKNESS,padding=style.padding??0;
  const {meta,mask}=asset,[px,py]=meta.pivotPixels??meta.originPixels,[,top,,bottom]=meta.alphaBoundsPixels;
  const unit=meta.visibleHeightWorldUnits/(bottom-top),point=(x,y,z=0)=>vec3((x-px)*unit,(py-y)*unit,z);
  const front=new Mesh().addQuad(point(0,0),point(0,meta.height),point(meta.width,meta.height),point(meta.width,0));
  const back=new Mesh().addQuad(point(meta.width,0,-thickness),point(meta.width,meta.height,-thickness),point(0,meta.height,-thickness),point(0,0,-thickness));
  const sides=new Mesh(),border=new Mesh(),grid=paddedCutout(mask,padding/(meta.width/mask.width*unit)),{width:w,height:h,solid,pad}=grid;
  const P=(x,y,z)=>point((x-pad)*meta.width/mask.width,(y-pad)*meta.height/mask.height,z);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(solid(x,y)){
    if(thickness<=0)continue;
    const edge=(a,b)=>clippedQuad(sides,[P(...a,0),P(...b,0),P(...b,-thickness),P(...a,-thickness)]);
    if(!solid(x,y-1))edge([x,y],[x+1,y]);
    if(!solid(x+1,y))edge([x+1,y],[x+1,y+1]);
    if(!solid(x,y+1))edge([x+1,y+1],[x,y+1]);
    if(!solid(x-1,y))edge([x,y+1],[x,y]);
  }
  let borderTexture;
  if(padding>0){
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const context=canvas.getContext('2d'),pixels=context.createImageData(w,h),radius=padding/(meta.width/mask.width*unit);
    for(let i=0;i<w*h;i++){pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=255;pixels.data[i*4+3]=Math.round(255*Math.max(0,Math.min(1,radius+.5-grid.distances[i])))}
    context.putImageData(pixels,0,0);borderTexture=new TextureInfo(canvas,true,false,false);
    // Cover the painted interior too: antialiased source edges can never reveal
    // a gap between the art and its backing. Clip only this backing at ground.
    const end=Math.min(h,(py-ground/unit)*mask.height/meta.height+pad);
    if(end>0)border.addQuad(P(0,0,-.001),P(0,end,-.001),P(w,end,-.001),P(w,0,-.001),white,[vec2(0,0),vec2(0,end/h),vec2(1,end/h),vec2(1,0)]);
  }
  border.doubleSided=true;
  sides.doubleSided=true;
  const [left,,right]=meta.alphaBoundsPixels;
  return {front,back,sides,border,borderTexture,left:(left-px)*unit,right:(right-px)*unit,height:meta.visibleHeightWorldUnits};
}
export function createModularScenery({onChange=()=>{},onStatus=()=>{}}={}){
  const loader=createSceneryKitLoader(),notified=new Set;
  let meshCache=new WeakMap,clippedCache=new WeakMap,styleKey,cutoutStyle={};
  const backingTextures=new Set();
  let shadowStyleKey,groundShader=pieceShadowShader,floorProjection,wallProjection,shadowPlanes=[],shadowBlur=0,shadowStrength=1,shadowsEnabled=true;
  const tint=hex=>new Color(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
  let key,objects=[],reference,bounds,contacts=[],pickRecords=[];
  function clear(){for(const object of objects)object.destroy();objects=[];key=reference=bounds=undefined;contacts=[];pickRecords=[]}
  function object(mesh,texture,tint=white,{shadow=false,receive=false}={}){
    const o=new EngineObject3D(vec3(),mesh,texture,tint);o.emissive=1;o.castShadow=shadow;o.receiveShadow=receive;
    if(receive)o.shader=pieceShadowShader;objects.push(o);return o;
  }
  function quad(points,texture,uvs,options){const mesh=new Mesh().addQuad(...points,white,uvs);mesh.doubleSided=true;return object(mesh,texture,white,options)}
  function projectShadow(corners,texture){
    if(!shadowsEnabled||shadowStrength<=0)return;
    for(const plane of shadowPlanes){
      const projection=projectStageShadow(corners,render3D.sunDirection,plane,plane.floor?shadowBlur:.08);if(!projection)continue;
      const mesh=new Mesh(),p=projection.polygon,center=p.reduce((sum,v)=>sum.add(vec3(v.x,v.y,v.z)),vec3()).scale(1/p.length);
      for(let i=1;i<p.length-1;i++){
        const triangle=[p[0],p[i],p[i+1]],points=triangle.map(v=>vec3(v.x+plane.normal.x*.0005-center.x,v.y+plane.normal.y*.0005-center.y,v.z+plane.normal.z*.0005-center.z));
        mesh.addTriangles(points,[0,1,2],undefined,triangle.map(v=>vec2(v.u,v.v)));
      }
      mesh.doubleSided=true;const o=object(mesh,texture);o.pos3D=center;o.transparent=true;o.emissive=1;o.shader=plane.floor?floorProjection:wallProjection;o.castShadow=false;
    }
  }
  function card(asset,x,z,y=0,scale=1,tilt=0,material=cutoutStyle,scenic=false){
    if(!clippedCache.has(asset))clippedCache.set(asset,new Map());
    const cache=clippedCache.get(asset),ground=-y/scale,cacheKey=JSON.stringify([ground,material]);
    if(!cache.has(cacheKey)){if(cache.size>2){for(const g of cache.values())if(g.borderTexture){g.borderTexture.destroyWebGLTexture();backingTextures.delete(g.borderTexture)}cache.clear()}const g=cardGeometry(asset,material,ground);if(g.borderTexture)backingTextures.add(g.borderTexture);cache.set(cacheKey,g)}
    const geometry=cache.get(cacheKey);
    const front=object(geometry.front,asset.texture,white,{shadow:false});front.pos3D=vec3(x,y,z);
    const back=(material.depth??CARDBOARD_THICKNESS)>0?object(geometry.back,asset.texture,scenic?white:new Color(.6,.56,.48),{shadow:false}):null;if(back)back.pos3D=front.pos3D.copy();
    const border=geometry.borderTexture?object(geometry.border,geometry.borderTexture,tint(material.paddingColor??'#fffaf0'),{shadow:false}):null;if(border){border.pos3D=front.pos3D.add(render3D.camera.getForward().scale(.002));border.transparent=true}
    const sides=object(geometry.sides,undefined,material.depthColor?tint(material.depthColor):edgeColor,{shadow:false});sides.pos3D=front.pos3D.copy();
    const support=material.support?object(new Mesh().addTriangles([vec3(-.025,-y/scale,-(material.depth??.08)),vec3(-.025,geometry.height*.55,-(material.depth??.08)),vec3(-.025,-y/scale,-Math.max(.5,geometry.height*.3)),vec3(.025,-y/scale,-(material.depth??.08)),vec3(.025,geometry.height*.55,-(material.depth??.08)),vec3(.025,-y/scale,-Math.max(.5,geometry.height*.3))],[0,1,2,5,4,3,0,2,5,0,5,3,1,4,5,1,5,2]),undefined,tint(material.paddingColor??'#fffaf0'),{shadow:false}):null;
    if(support){support.pos3D=front.pos3D.copy();support.mesh.doubleSided=true}
    for(const o of [front,back,sides,border,support].filter(Boolean)){o.scale3D=vec3(scale,scale,scale);o.rotation3D=vec3(0,tilt*Math.PI/180,0)}
    if(scenic)for(const o of [front,back].filter(Boolean)){o.transparent=true;o.lighting=false}
    // One silhouette per card, rather than front/back duplicates. The padding
    // backing includes the image interior and is used when present.
    const m=asset.meta,[ox,oy]=m.pivotPixels??m.originPixels,k=scale*m.visibleHeightWorldUnits/(m.alphaBoundsPixels[3]-m.alphaBoundsPixels[1]),angle=tilt*Math.PI/180;
    const world=(px,py)=>vec3(x+(px-ox)*k*Math.cos(angle),y+(oy-py)*k,z-(px-ox)*k*Math.sin(angle));
    if(geometry.borderTexture){
      const radius=material.padding/k*scale,edge=radius+2*m.width/asset.mask.width;
      projectShadow([world(-edge,-edge),world(m.width+edge,-edge),world(m.width+edge,m.height+edge),world(-edge,m.height+edge)],geometry.borderTexture);
    }else projectShadow([world(0,0),world(m.width,0),world(m.width,m.height),world(0,m.height)],asset.texture);
    contacts.push({asset:asset.meta.webp,x,z,footY:y,thickness:(material.depth??CARDBOARD_THICKNESS)*scale});
    return geometry;
  }
  function update({state,width,height,artworkBounds,yaw=0,target=vec3(width/2,0,1.5)}){
    const originX=artworkBounds?.left??0;width=artworkBounds?artworkBounds.right-artworkBounds.left:width;height=artworkBounds?.height??height;
    if(state.artworkSet!=='kit'||state.setting!=='landscape'||!hasSceneryKit(state.environment)){
      clear();return null;
    }
    const nextStyle=JSON.stringify(state.cutoutStyle??{});if(nextStyle!==styleKey){styleKey=nextStyle;cutoutStyle=state.cutoutStyle??{};for(const texture of backingTextures)texture.destroyWebGLTexture();backingTextures.clear();meshCache=new WeakMap;clippedCache=new WeakMap}
    const record=loader.load(state.environment);
    if(!notified.has(record)){notified.add(record);record.promise.then(()=>onChange())}
    if(record.status!=='ready'){
      clear();onStatus(record.status==='error'?`New kit unavailable: ${record.error.message}`:'Loading the new image kit…');return null;
    }
    onStatus(`New ${state.environment==='daisy-meadow'?'Daisy Meadow':state.environment==='meadow'?'Meadow':'Japan Spring'} image kit · grounded cardboard cutouts`);
    const pivot=state.horizonLock?{x:target.x,z:target.z}:{x:originX+width/2,z:0};
    const next=JSON.stringify([state.environment,originX,width,height,yaw,pivot,state.backgroundDistance,state.background,state.foreground,state.props,state.scenicAtmosphere,state.sceneryLayout,state.cutoutStyle,state.environmentShadowStrength,state.groundShadowBlur,state.sceneryShadows,render3D.sunDirection,state.scenicAtmosphere?render3D.camera.getUp():null]);
    if(next===key)return reference;
    clear();key=next;
    const a=record.assets,cx=originX+width/2,span=Math.max(192,width*6);
    const back=-Math.max(state.backgroundDistance??puzzleBackgroundDistance(width),minimumBackdropDistance(width,yaw));
    const wall=(x,y,offset=0)=>vec3(pivot.x+Math.sin(yaw)*(back+offset)+Math.cos(yaw)*x,y,pivot.z+Math.cos(yaw)*(back+offset)-Math.sin(yaw)*x);
    shadowStrength=state.environmentShadowStrength??1;shadowBlur=state.groundShadowBlur??0;shadowsEnabled=state.sceneryShadows!==false;
    const shadowRange=Math.max(width+24,10-Math.min(-12,back),height)+6;
    const shadowKey=JSON.stringify([shadowStrength,shadowBlur,shadowRange]);
    if(shadowKey!==shadowStyleKey){
      if(groundShader!==pieceShadowShader)groundShader.dispose();floorProjection?.dispose();wallProjection?.dispose();
      groundShader=createGroundSurfaceShader(shadowBlur,shadowRange);floorProjection=createSceneryProjectionShader(shadowStrength,shadowBlur);wallProjection=createSceneryProjectionShader(shadowStrength,.08);shadowStyleKey=shadowKey;
    }
    const wallHeight=Math.max(24,height+16),wallWidth=wallHeight*(a['flat-background']??a['static-background'])?.meta.width/(a['flat-background']??a['static-background'])?.meta.height;
    shadowPlanes=[{floor:true,origin:vec3(),normal:vec3(0,1,0)}];
    if(state.background)shadowPlanes.push({origin:wall(0,0),normal:vec3(Math.sin(yaw),0,Math.cos(yaw)),top:wallHeight,halfWidth:Number.isFinite(wallWidth)?wallWidth/2:span/2});
    const backdrop=a['flat-background']??a['static-background'];
    if(state.background&&backdrop){
      const h=Math.max(24,height+16),w=h*backdrop.meta.width/backdrop.meta.height;
      quad([wall(-w/2,h),wall(w/2,h),wall(w/2,0),wall(-w/2,0)],backdrop.texture,[vec2(0,0),vec2(1,0),vec2(1,1),vec2(0,1)],{receive:true});
    }else if(state.background){
      const paintHeight=Math.max(24,height+16),paintTop=paintHeight-3,paintWidth=paintHeight*2,top=Math.max(100,height*3),bottom=-80;
      quad([wall(-span/2,top),wall(span/2,top),wall(span/2,bottom),wall(-span/2,bottom)],a.sky.texture,[vec2(.5-span/2/paintWidth,(paintTop-top)/paintHeight),vec2(.5+span/2/paintWidth,(paintTop-top)/paintHeight),vec2(.5+span/2/paintWidth,(paintTop-bottom)/paintHeight),vec2(.5-span/2/paintWidth,(paintTop-bottom)/paintHeight)],{receive:true});
      const ridgeHeight=5.5,ridgeWidth=ridgeHeight*4;
      quad([wall(-span/2,ridgeHeight,.08),wall(span/2,ridgeHeight,.08),wall(span/2,0,.08),wall(-span/2,0,.08)],a['distant-hills'].texture,[vec2(-span/2/ridgeWidth,0),vec2(span/2/ridgeWidth,0),vec2(span/2/ridgeWidth,1),vec2(-span/2/ridgeWidth,1)],{receive:true});
    }
    // Exact world UV scale: one repeat covers 16 x 16 puzzle cells. Horizontal
    // geometry supplies perspective; no painted foreground is stretched onto it.
    const reach=Math.max(100,width*4,height*4),left=cx-reach,right=cx+reach,far=-reach,near=reach;
    const floor=[vec3(left,-.005,far),vec3(right,-.005,far),vec3(right,-.005,near),vec3(left,-.005,near)];
    if(state.foreground)quad(floor,a['ground-tile'].texture,[vec2(left/16,far/16),vec2(right/16,far/16),vec2(right/16,near/16),vec2(left/16,near/16)],{receive:true}).shader=groundShader;
    else {const o=quad(floor,undefined,undefined,{receive:true});o.color=new Color(.7,.72,.57);o.shader=groundShader}
    const layout=state.environment==='daisy-meadow'?(state.sceneryLayout??defaultSceneryLayout()):defaultSceneryLayout();
    if(state.props){
      const placements=[['tree-a',-1,-2,3],['tree-b',1,-4,3],['shrub-a',-1,1.5,2.8],['shrub-b',1,.5,2.8],['grass-a',-1,5.5,4.8],['grass-b',1,5.8,4.8],['flowers-a',-1,3.8,3.5],['flowers-b',1,4.4,3.8],['round-daisy-patch',1,2,3.5]];
      for(const item of layout){
        const placement=placements.find(p=>p[0]===item.role);if(!placement)continue;
        const [name,side,z,clearance]=placement;
        const asset=a[name];if(!meshCache.has(asset))meshCache.set(asset,cardGeometry(asset,{...cutoutStyle,padding:0}));
        const g=meshCache.get(asset),x=side<0?originX-clearance-g.right:originX+width+clearance-g.left;
        const px=x+item.x,pz=z+item.z,m=asset.meta,[ox,oy]=m.pivotPixels,k=item.scale*m.visibleHeightWorldUnits/(m.alphaBoundsPixels[3]-m.alphaBoundsPixels[1]);
        card(asset,px,pz,item.y,item.scale,item.tilt??0,cutoutMaterial(item.role,cutoutStyle,item.cutout));
        const angle=(item.tilt??0)*Math.PI/180;
        const point=(xx,yy)=>vec3(px+(xx-ox)*k*Math.cos(angle),item.y+(oy-yy)*k,pz-(xx-ox)*k*Math.sin(angle));
        pickRecords.push({id:item.id,mask:asset.mask,corners:[point(0,0),point(m.width,0),point(m.width,m.height),point(0,m.height)],axis:{x:1,y:0,z:0},depthAxis:{x:0,y:0,z:1}});
      }
    }
    if(state.props&&state.scenicAtmosphere&&state.environment==='daisy-meadow'){
      // Scenic bodies and cords share the backdrop transform, not the camera's pitch.
      const side=Math.max(3,width*.4),fogSide=Math.max(4,width*.55);
      const positions=[['hanging-cloud-a',-side,Math.max(5,height+1)],['hanging-cloud-b',side,Math.max(6,height+2)],['low-fog-a',-fogSide,.15],['low-fog-b',fogSide,.15],['large-arching-cloud',Math.max(8,width*.35+5),Math.max(8,height+2)]];
      for(const item of layout){
        const position=positions.find(p=>p[0]===item.role);if(!position)continue;
        const [name,bx,by]=position,x=bx+item.x,y=by+item.y;
        const asset=a[name],m=asset.meta,[ox,oy]=m.originPixels,scale=item.scale*m.visibleHeightWorldUnits/(m.alphaBoundsPixels[3]-m.alphaBoundsPixels[1]);
        const angle=(item.tilt??0)*Math.PI/180;
        const point=(px,py)=>wall(x+(px-ox)*scale*Math.cos(angle),y+(oy-py)*scale,1+item.z-(px-ox)*scale*Math.sin(angle));
        const origin=wall(x,y,1+item.z);
        card(asset,origin.x,origin.z,origin.y,item.scale,(yaw+angle)*180/Math.PI,cutoutMaterial(item.role,cutoutStyle,item.cutout),true);
        pickRecords.push({id:item.id,mask:asset.mask,corners:[point(0,0),point(m.width,0),point(m.width,m.height),point(0,m.height)],axis:{x:Math.cos(yaw),y:0,z:-Math.sin(yaw)},depthAxis:{x:Math.sin(yaw),y:0,z:Math.cos(yaw)}});
        for(const [px,py]of m.attachmentPixels??[]){
          const xx=x+(px-ox)*scale,yy=y+(oy-py)*scale;
          // Camera-up projects vertically even when a side cloud is viewed in
          // perspective. Keep the lower endpoint attached to the cloud.
          const foot=point(px,py),up=render3D.camera.getUp(),right=render3D.camera.getRight().scale(.012);
          const top=foot.add(up.scale(Math.max(1,(35-foot.y)/Math.max(.1,up.y))));
          const cord=quad([top.subtract(right),top.add(right),foot.add(right),foot.subtract(right)],undefined,undefined);
          cord.color=new Color(.45,.43,.38);cord.lighting=false;
        }
      }
    }
    bounds={left:originX-12,right:originX+width+12,back:Math.min(-12,back),front:10};
    reference={source:'modular-kit',distance:-back,theme:state.environment,environmentShadowStrength:shadowStrength,groundShadowBlur:shadowBlur,shadowReceivers:shadowPlanes.length,curved:false,points:[wall(-1,0,.08),wall(0,0,.08),wall(1,0,.08)]};
    return reference;
  }
  return {async prepare(id,options){const record=loader.load(id,options);await record.promise;if(record.status!=='ready')throw record.error??new Error('The scenery kit could not be loaded.')},update,clear,get bounds(){return bounds},get pickRecords(){return pickRecords},get contacts(){return contacts},get ready(){return !!reference}};
}
