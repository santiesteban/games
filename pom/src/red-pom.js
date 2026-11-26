import {isPomEyeStyle} from './pom-eye-style.js';
import {pomIdleMotion,pomMovementEyes} from './pom-idle-motion.js';
import {stepJumpShape} from './pom-movement-pose.js';
import {createPomActionPulse} from './pom-action-pulse.js';
import {revisedPomPose} from './pom-revised-poses.js';
import {Color, EngineObject3D, Mesh, Shader, TextureInfo, TileInfo, glContext, render3D, vec2, vec3} from 'littlejsengine';

const occlusionShader=new Shader(`
  void mainImage(out vec4 color,vec2 uv){
    color=vec4(0.03,0.03,0.03,texture(iChannel0,uv).a*0.42);
  }
`);
// Each illustration's body has the same scale and contact point on the floor.
// Its features and accessories were extracted from the supplied SVG paths.
const alternateEyePoses=new Set(['happy-open','excited','worried','float','warp-in','warp-out']);
// Size the resting artwork to roughly one cell; movement remains cell-based.
const visualScale=1.27;
const poses={
  calm:{anchor:[56,90],layers:['body','eyes']},
  'happy-open':{anchor:[56,90],layers:['body','eyes','mouth']},
  happy:{anchor:[56,90],layers:['body','eyes','mouth']},
  excited:{anchor:[56,98],layers:['body','eyes','mouth','extra']},
  worried:{anchor:[56,90],layers:['body','eyes','mouth']},
  squash:{anchor:[61,82],layers:['body','eyes']},
  stretch:{anchor:[52,97],layers:['body','eyes']},
  'push-back':{anchor:[56,105],layers:['body','eyes','extra']},
  'push-left':{anchor:[56,107],layers:['body','eyes','extra']},
  'push-right':{anchor:[63,105],layers:['body','eyes','extra']},
  float:{anchor:[56,149],layers:['body','eyes','mouth','extra']},
  'warp-in':{anchor:[56,90],layers:['eyes','mouth']},
  'warp-out':{anchor:[56,90],layers:['eyes','mouth']},
};
async function loadLayer(name,layer,[anchorX,anchorY]){
  const image=new Image();image.src=`${import.meta.env.BASE_URL}assets/red-pom/parts/${name}-${layer}.svg`;
  await image.decode();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  canvas.getContext('2d').drawImage(image,128-anchorX,200-anchorY);
  const texture=new TextureInfo(canvas,true,false,false);
  return new TileInfo(vec2(),texture.size,texture,0,0);
}
async function loadRevisedPose(name){
  const image=new Image();image.src=`${import.meta.env.BASE_URL}assets/pom-revised/${name}.svg`;
  await image.decode();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  // Normalize the supplied sheets around Pom's body center and foot contact.
  const push=name.startsWith('push-'),scale=.8,anchorX=push?130:140,anchorY=push?204:255;
  canvas.getContext('2d').drawImage(image,128-anchorX*scale,200-anchorY*scale,image.width*scale,image.height*scale);
  const texture=new TextureInfo(canvas,true,false,false);
  return new TileInfo(vec2(),texture.size,texture,0,0);
}
const revisedNames=['standing-original','standing-relaxed','standing-wave','standing-step','neutral','excited','scared','thin-stretch','push-backward','push-left','push-right',...['up','side'].flatMap(kind=>['anticipation','launch','apex','descent','land'].map(phase=>`jump-${kind}-${phase}`))];
export async function createRedPom(parent){
  const actionPulse=createPomActionPulse();
  const entries=await Promise.all(Object.entries(poses).map(async([name,pose])=>{
    const parts=await Promise.all(pose.layers.map(async layer=>[layer,await loadLayer(name,layer,pose.anchor)]));
    if(alternateEyePoses.has(name)){
      const [bright,crazy,circle]=await Promise.all([loadLayer(name,'bright-eyes',pose.anchor),loadLayer(name,'crazy-eyes',pose.anchor),loadLayer(name,'circle-eyes',pose.anchor)]);
      parts.push(['brightEyes',bright],['crazyEyes',crazy],['circleEyes',circle]);
    }
    return [name,Object.fromEntries(parts)];
  }));
  const textures=Object.fromEntries(entries),factor=.72/.56,half=128/112;
  const contactY=-.05,bottom=contactY-(56/112)*factor,top=bottom+(256/112)*factor;
  const mesh=new Mesh().addQuad(vec3(-half,top,0),vec3(-half,bottom,0),vec3(half,bottom,0),vec3(half,top,0));mesh.doubleSided=true;
  const make=(z,tile,transparent,casts=false)=>{
    const part=new EngineObject3D(vec3(0,0,z),mesh,tile,new Color(1));
    // Preserve the illustrated colors as scene lighting fades during victory.
    part.emissive=1;part.receiveShadow=false;
    part.transparent=transparent;part.castShadow=casts;parent.addChild(part);return part;
  };
  // The body writes depth; a blended copy supplies the antialiased edge.
  const object=make(2,textures.calm.body,false,true),edge=make(2.1,textures.calm.body,true);
  const eyes=make(2.3,textures.calm.eyes,true),idleEyes=make(2.31,textures['happy-open'].eyes,true),mouth=make(2.35,textures['happy-open'].mouth,true),extra=make(2.4,textures['push-back'].extra,true);
  // Write the solid artwork to the depth buffer before drawing its smooth edge.
  // Otherwise later transparent surfaces can show through Pom's body.
  const revisedBody=make(2,undefined,false,true),revisedPrevious=make(2.15,undefined,true),revisedCurrent=make(2.2,undefined,true);
  revisedBody.mesh=revisedPrevious.mesh=revisedCurrent.mesh=undefined;
  const classicParts=[object,edge,eyes,idleEyes,mouth,extra],revisedParts=[revisedBody,revisedPrevious,revisedCurrent];
  const renderPart=EngineObject3D.prototype.render3D;
  for(const part of revisedParts)part.render3D=()=>{};
  const parts=[...classicParts,...revisedParts],baseDepths=parts.map(part=>part.pos3D.z);
  let active='',targetX=1,targetY=1,bodyX=1,bodyY=1,displayY=1,targetMouth=0,targetExtra=0,lastTime,idleTime=0,moving=false,eyeStyle='classic',currentPose='calm',currentExtra=true,stepJumpProgress=null;
  let characterStyle='classic',requestedStyle='classic',revisedTextures,revisedLoading,revisedFrame='',revisedFlip=false,revisedPreviousFlip=false,revisedFade=1,motion=null,pipe=false,push='backward';
  function showStyle(style){
    characterStyle=style;
    for(const part of classicParts){part.mesh=style==='classic'?mesh:undefined;part.render3D=style==='classic'?renderPart:()=>{}}
    for(const part of revisedParts){part.mesh=style==='revised'?mesh:undefined;part.render3D=style==='revised'?renderPart:()=>{}}
    revisedFrame='';revisedFade=1;
  }
  idleEyes.color.a=mouth.color.a=extra.color.a=0;
  function setPose(name,showExtra=true){
    const key=`${name}:${showExtra}`;
    if(key===active||(!textures[name]&&name!=='pipe-exit'))return;
    if(name==='pipe-exit'){
      active=key;currentPose=name;currentExtra=showExtra;idleTime=0;idleEyes.color.a=0;
      object.tileInfo=edge.tileInfo=textures.calm.body;
      const openEyes=textures['happy-open'];
      eyes.tileInfo=(eyeStyle==='bright'?openEyes.brightEyes:eyeStyle==='crazy'?openEyes.crazyEyes:eyeStyle==='circle'?openEyes.circleEyes:openEyes.eyes);eyes.color.a=1;
      extra.tileInfo=textures.excited.extra;targetMouth=0;targetExtra=showExtra?1:0;targetX=targetY=1;return;
    }
    active=key;currentPose=name;currentExtra=showExtra;
    if(name!=='calm'){idleTime=0;idleEyes.color.a=0}
    const bodyName=name==='float'?'float':'calm';
    object.tileInfo=edge.tileInfo=textures[bodyName].body;
    // The reference squash and stretch eyes are the calm eyes transformed
    // with the body. Keep one drawing through these poses to avoid a jump.
    const eyesName=name==='squash'||name==='stretch'?'calm':name;
    eyes.tileInfo=(eyeStyle==='bright'?textures[eyesName].brightEyes:eyeStyle==='crazy'?textures[eyesName].crazyEyes:eyeStyle==='circle'?textures[eyesName].circleEyes:undefined)||textures[eyesName].eyes;eyes.color.a=textures[eyesName].eyes?1:0;
    if(textures[name].mouth)mouth.tileInfo=textures[name].mouth;targetMouth=textures[name].mouth?1:0;
    if(textures[name].extra)extra.tileInfo=textures[name].extra;targetExtra=textures[name].extra&&showExtra?1:0;
    targetX=name==='squash'?122/112:name==='stretch'?104/112:1;
    targetY=name==='squash'?82/90:name==='stretch'?97/90:1;
  }
  setPose('calm');
  return {object,edge,parts,setPose,
    get characterStyle(){return characterStyle},
    setCharacterStyle(style){
      style=style==='revised'?'revised':'classic';
      if(style===requestedStyle)return;
      requestedStyle=style;
      if(style==='classic'){showStyle('classic');return}
      if(revisedTextures){showStyle('revised');return}
      revisedLoading??=Promise.all(revisedNames.map(async name=>[name,await loadRevisedPose(name)])).then(entries=>Object.fromEntries(entries));
      revisedLoading.then(textures=>{revisedTextures=textures;if(requestedStyle==='revised')showStyle('revised')}).catch(error=>{console.error('Unable to load revised Pom artwork',error);requestedStyle='classic';revisedLoading=null});
    },
    setMotion(value){motion=value},
    setPipePhase(value){pipe=!!value},
    setPushDirection(value){push=['left','right','backward'].includes(value)?value:'backward'},
    setEyeStyle(style){
      if(eyeStyle===style||!isPomEyeStyle(style))return;
      eyeStyle=style;
      idleEyes.tileInfo=style==='bright'?textures['happy-open'].brightEyes:style==='crazy'?textures['happy-open'].crazyEyes:style==='circle'?textures['happy-open'].circleEyes:textures['happy-open'].eyes;
      active='';setPose(currentPose,currentExtra);
    },
    setMoving(value){moving=value;idleTime=0;if(!value){motion=null;pipe=false}},
    setStepJump(progress){stepJumpProgress=progress},
    beginAction(){actionPulse.start()},
    setActionProgress(progress,now=performance.now()){actionPulse.advance(progress,now)},
    resetMotion(){moving=false;idleTime=0;motion=null;pipe=false;actionPulse.reset()},
    update(now,idle=false,size=1){
      size*=visualScale*actionPulse.scale(now)*(characterStyle==='revised'?.8:1);
      const dt=lastTime===undefined?0:Math.min(.05,(now-lastTime)/1000);lastTime=now;
      const ease=1-Math.exp(-14*dt);
      bodyX+=(targetX-bodyX)*ease;bodyY+=(targetY-bodyY)*ease;
      mouth.color.a+=(targetMouth-mouth.color.a)*ease;extra.color.a+=(targetExtra-extra.color.a)*ease;
      if(Math.abs(targetX-bodyX)<.001)bodyX=targetX;
      if(Math.abs(targetY-bodyY)<.001)bodyY=targetY;
      const resting=idle&&active.startsWith('calm:');
      if(!moving&&active.startsWith('calm:'))idleTime+=dt*1000;else idleTime=0;
      const normalEyes=['calm:','squash:','stretch:'].some(pose=>active.startsWith(pose));
      const idleMotion=resting?pomIdleMotion(idleTime):{breath:0};
      const opening=normalEyes?pomMovementEyes(idleTime,moving):0;
      const step=stepJumpProgress===null?null:stepJumpShape(stepJumpProgress);
      const displayX=step?step.x:bodyX*(1-idleMotion.breath*.55);displayY=step?step.y:bodyY*(1+idleMotion.breath);
      if(normalEyes)eyes.color.a=1-opening;
      idleEyes.color.a=opening;
      for(const part of [object,edge,eyes,idleEyes])part.scale3D=vec3(displayX*size,displayY*size,1);
      for(const part of [mouth,extra])part.scale3D=vec3(size,size,1);
      if(characterStyle==='revised'){
        const frame=revisedPomPose({pose:currentPose,motion,pipe,moving,idleTime,now,push});
        if(frame.name!==revisedFrame||frame.flip!==revisedFlip){
          revisedPrevious.tileInfo=revisedCurrent.tileInfo;revisedPreviousFlip=revisedFlip;
          revisedBody.tileInfo=revisedCurrent.tileInfo=revisedTextures[frame.name];revisedFlip=frame.flip;
          revisedFade=1;revisedFrame=frame.name;
        }
        revisedFade=Math.min(1,revisedFade+dt/.1);
        revisedCurrent.color.a=revisedFade;revisedPrevious.color.a=revisedPrevious.tileInfo?1-revisedFade:0;
        revisedCurrent.scale3D=vec3((revisedFlip?-1:1)*size,size,1);
        revisedBody.scale3D=revisedCurrent.scale3D.copy();
        revisedPrevious.scale3D=vec3((revisedPreviousFlip?-1:1)*size,size,1);
      }
      displayY=characterStyle==='revised'?size:displayY*size;
    },
    setCameraTilt(pitch){
      // Move the tilted artwork a little toward the camera to keep it clear
      // of the surface, without changing Pom's logical square.
      const offset=.10*Math.abs(Math.sin(pitch))/Math.max(.001,Math.abs(parent.scale3D.z));
      parts.forEach((part,index)=>{part.pos3D.z=baseDepths[index]+offset});
    },
    drawOcclusion(){
      const visibleEdge=characterStyle==='revised'?revisedCurrent:edge;
      if(!visibleEdge.mesh)return;
      render3D.flushTransparentQueue();render3D.flush();
      const state={shader:render3D.shader,lighting:render3D.lighting,blend:render3D.blend,depthTest:render3D.depthTest,depthWrite:render3D.depthWrite,receiveShadow:render3D.receiveShadow};
      try{
        render3D.shader=occlusionShader;render3D.lighting=false;render3D.blend=true;
        render3D.depthTest=true;render3D.depthWrite=false;render3D.receiveShadow=false;
        glContext.depthFunc(glContext.GREATER);
        render3D.drawMesh(visibleEdge.mesh,visibleEdge.getMatrix(),visibleEdge.tileInfo,new Color(1));
        // The floating pose's accessory layer is the umbrella. Draw its hidden
        // fragments with the same depth test and fade as the visible artwork.
        if(characterStyle==='classic'&&extra.mesh&&extra.tileInfo===textures.float.extra&&extra.color.a>.001){
          render3D.drawMesh(extra.mesh,extra.getMatrix(),extra.tileInfo,new Color(1,1,1,extra.color.a));
        }
        render3D.flush();
      }finally{
        // LittleJS and this game's other rendering paths use WebGL's default
        // depth function. Avoid a synchronous GPU state query on every frame.
        glContext.depthFunc(glContext.LESS);Object.assign(render3D,state);
      }
    },
    alignToSurface(surfaceOffset,anchorCorrection=vec3()){
      const matrix=parent.getMatrix(),upY=matrix.m[5];
      // Anchor the bottom-center of the drawing to the standing square, even
      // when the billboard tilts and the old sprite offset follows the camera.
      const target=parent.pos3D.add(anchorCorrection).add(vec3(0,surfaceOffset,0));
      const local=matrix.copy().invert().transformPoint(target);
      if(Math.abs(upY)>.0001)for(const part of parts){
        part.pos3D.x=local.x;part.pos3D.z+=local.z;
        const base=(target.y-matrix.m[13]-matrix.m[1]*part.pos3D.x-matrix.m[9]*part.pos3D.z)/upY-contactY;
        part.pos3D.y=base+(part===object||part===edge||part===eyes||part===idleEyes||revisedParts.includes(part)?contactY*(1-displayY):0);
      }
    }};
}
