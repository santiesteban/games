import {Color,EngineObject3D,Render3DPlugin,buildBox,engineInit,render3D,setCanvasClearColor,setCanvasFixedSize,setDebugWatermark,vec2,vec3} from 'littlejsengine';
import {createRedPom} from './red-pom.js';
import {createWarpPipeAssets,INVERTED_PIPE_LENGTH,WARP_PIPE_HEIGHT,invertedPipeExtension} from './warp-pipe-assets.js';
import {createMovementBoard,planMovement,pipeEntryStepPlan,sampleMovement,sampleMovementProgress} from './movement-routes.js';
import {jumpBodyMotion,jumpRouteTiming,pomMovementPose,pieceEffortScale,PIECE_EFFORT_DURATION} from './pom-movement-pose.js';
import {normalPipeFrame,normalPipeEntryProgress,invertedPipeEntryFrame,invertedPipeExitFrame} from './pipe-animation.js';

const scene=new URLSearchParams(location.search).get('scene');
const makePlan=(grid,from,to)=>planMovement(createMovementBoard(grid,[1,1]),from,to);
const step=makePlan(['.A','BA'],{x:0,y:1,z:0},{x:1,y:0,z:0});
const walk=makePlan(['AA'],{x:0,y:0,z:0},{x:1,y:0,z:0});
const gap=makePlan(['A.B'],{x:0,y:0,z:0},{x:2,y:0,z:0});
const gapDown=makePlan(['A..','A..','A.B'],{x:0,y:0,z:0},{x:2,y:2,z:0});
const fall=makePlan(['A.','A.','.B'],{x:0,y:0,z:0},{x:1,y:2,z:0});
const pipeJump=pipeEntryStepPlan({x:.5,y:.205,z:.5},{x:1.5,y:2-INVERTED_PIPE_LENGTH-.22,z:.5});
const highJump=pipeEntryStepPlan({x:1.5,y:.205,z:.5},{x:1.5,y:2-INVERTED_PIPE_LENGTH-.22,z:.5});
const underJump=pipeEntryStepPlan({x:1.5,y:.205,z:.5},{x:1.5,y:1-INVERTED_PIPE_LENGTH-.22,z:.5});
const wrap=document.querySelector('#view');let pom,sprite,pieceEnd=[],state={time:0,yaw:20,pitch:20},clock=0,lastTime=0;
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='animation-playground')state=event.data});
function box(x,y,z,color){
  const mesh=buildBox(),object=new EngineObject3D(vec3(x,y,z),mesh,undefined,color),parts=[object];
  object.lighting=false;object.castShadow=false;object.receiveShadow=false;
  for(const a of [-.5,.5])for(const b of [-.5,.5])for(const axis of ['x','y','z']){
    const pos=axis==='x'?vec3(x,y+a,z+b):axis==='y'?vec3(x+a,y,z+b):vec3(x+a,y+b,z);
    const edge=new EngineObject3D(pos,mesh,undefined,new Color(.16,.145,.12));
    parts.push(edge);
    edge.scale3D=axis==='x'?vec3(1,.026,.026):axis==='y'?vec3(.026,1,.026):vec3(.026,.026,1);
    edge.lighting=false;edge.castShadow=false;edge.receiveShadow=false;
  }
  return parts.map(part=>({part,mesh:part.mesh}));
}
function addPipe(inverted,y){
  const assets=createWarpPipeAssets(),parts=assets.createEnd(0,false,inverted),height=WARP_PIPE_HEIGHT,extension=inverted?invertedPipeExtension():0;
  for(const name of ['body','rim','opening']){
    const part=parts[name];part.mesh=assets.meshes[name];part.pos3D=vec3(1.5,y+(inverted?-1:1)*(name==='body'?0:extension),.5);
    part.rotation3D.z=inverted?Math.PI:0;part.scale3D=vec3(1,name==='body'?height+extension/.23:height,1);
  }
  parts.badge.destroy();parts.badgePulse.destroy();parts.cap.destroy();
}
function init(){
  setCanvasFixedSize(vec2(480,280));setCanvasClearColor(new Color(1,.976,.91));setDebugWatermark(false);new Render3DPlugin();
  const tall=['pipe','inverted-high','inverted-out','gap-down','umbrella'].includes(scene);
  render3D.camera.orthographic=tall?4.5:3.8;
  const color=scene==='step'?new Color(1,.67,.36):scene.includes('pipe')||scene.startsWith('inverted')||scene.startsWith('normal')?new Color(.14,.68,.69):new Color(.59,.76,.36);
  if(scene==='push'||scene==='pull'){
    box(1.5,.5,.5,color);
    if(scene==='push')pieceEnd=box(1.5,.5,1.5,color);
    else {box(1.5,.5,1.5,color);pieceEnd=box(1.5,.5,2.5,color)}
  }
  else if(scene==='gap-level'){box(.5,-.5,.5,color);box(2.5,-.5,.5,color)}
  else if(scene==='gap-down'){for(let y=0;y<3;y++)box(.5,y-.5,.5,color);box(2.5,-.5,.5,color)}
  else if(scene==='umbrella'){for(let y=0;y<3;y++)box(.5,y-.5,.5,color);box(1.5,-.5,.5,color)}
  else if(scene==='inverted-under'){box(1.5,-.5,.5,color);box(1.5,1.5,.5,color);addPipe(true,1)}
  else if(['pipe','inverted-high','inverted-out'].includes(scene)){for(let x=0;x<3;x++)box(x+.5,-.5,.5,color);box(1.5,2.5,.5,color);addPipe(true,2)}
  else {for(let x=0;x<3;x++)box(x+.5,-.5,.5,color);if(scene==='step')box(1.5,.5,.5,color);if(scene.startsWith('normal'))addPipe(false,0)}
  pom=new EngineObject3D(vec3(),undefined);pom.scale3D=vec3(.72,.56,.018);pom.castShadow=false;
  createRedPom(pom).then(value=>{sprite=value;sprite.setMoving(scene!=='idle')}).catch(console.error);
}
function update(){
  if(!pom)return;
  const previousTime=lastTime;
  if(state.time>=500&&(lastTime<500||state.time<lastTime)&&['step','pipe','inverted-high','inverted-under','gap-level','gap-down','push','pull'].includes(scene))sprite?.beginAction();
  if(state.time!==lastTime){clock+=(state.time-lastTime+4000)%4000;lastTime=state.time}
  const camera=render3D.camera,tall=['pipe','inverted-high','inverted-out','gap-down','umbrella'].includes(scene);
  camera.orbit(vec3(1.5,tall?1.25:.65,.5),9,state.yaw*Math.PI/180,state.pitch*Math.PI/180);
  const elapsed=Math.max(0,state.time-500),moving=scene!=='idle';
  let plan=scene==='walk'?walk:scene==='step'?step:scene==='pipe'?pipeJump:scene==='gap-level'?gap:scene==='gap-down'?gapDown:scene==='umbrella'?fall:scene==='inverted-high'?highJump:scene==='inverted-under'?underJump:null;
  let progress=plan?Math.max(0,Math.min(1,elapsed/plan.duration)):0,flight=progress,point={x:1.5,y:.205,z:.5},pose='calm',shape=null,size=1,squash=0;
  sprite?.setCharacterStyle(state.appearance);
  sprite?.setPushDirection('backward');
  sprite?.setPipePhase(false);
  let effortScale={x:1,y:1};
  if(scene==='push'||scene==='pull'){
    const triggered=state.time>=500,active=triggered&&elapsed<PIECE_EFFORT_DURATION;
    point={x:1.5,y:.205,z:triggered?(scene==='push'?1.5:3.5):2.5};
    pose=active?'push-back':'calm';if(active)effortScale=pieceEffortScale(elapsed);
    sprite?.setActionProgress(Math.min(1,elapsed/PIECE_EFFORT_DURATION),clock);
    for(const {part,mesh} of pieceEnd)part.mesh=(scene==='push'?!triggered:triggered)?mesh:undefined;
  }
  if(plan){
    sprite?.setMotion({kind:scene==='step'||scene==='pipe'||scene==='inverted-high'||scene==='inverted-under'?'up':plan.isJump?'side':'walk',progress,direction:1});
    const timing=jumpRouteTiming(plan,progress);flight=timing.flight;
    if(['step','pipe','inverted-high','inverted-under','gap-level','gap-down'].includes(scene)&&elapsed<plan.duration)sprite?.setActionProgress(plan.isJump?timing.progress:progress*progress*(3-2*progress),clock);
    point=plan.isJump?sampleMovementProgress(plan,timing.progress):sampleMovement(plan,progress);
    if(scene==='step'||scene==='walk'||scene==='gap-level')point={...point,y:point.y-plan.points[0].y+.205};
    if(scene==='gap-down'||scene==='umbrella')point={...point,y:point.y-plan.points.at(-1).y+.205};
    if(scene==='step'||scene==='pipe'||scene==='inverted-high'||scene==='inverted-under'){
      pose=pomMovementPose({isStepJump:true},{y:1},{y:0},progress,progress);
      if(progress>0&&progress<1)shape=progress;
    }else if(plan.isJump||plan.isFall){
      pose=pomMovementPose(plan,{y:0},{y:plan.isFall?2:0},progress,flight);
      if(plan.isJump){squash=jumpBodyMotion(plan,progress,flight,timing.launchAt).squash;if(!plan.continuousFlight)point={...point,y:point.y-.2*squash}}
    }
  }
  if(scene==='inverted-under'||scene==='inverted-high'||scene==='pipe'){
    const jumpDuration=plan.duration,entry=invertedPipeEntryFrame(elapsed-jumpDuration);
    if(elapsed>=jumpDuration){
      sprite?.setMotion(null);sprite?.setPipePhase(elapsed<jumpDuration+500);
      if(previousTime<500+jumpDuration||state.time<previousTime)sprite?.beginAction();
      sprite?.setActionProgress(entry.progress,clock);
      const start=vec3(point.x,point.y,point.z),end=vec3(1.5,(scene==='inverted-under'?1:2)-INVERTED_PIPE_LENGTH+.18,.5);point=start.lerp(end,entry.progress);size=entry.size;shape=null;pose='calm';
    }
  }
  if(scene==='normal-in'||scene==='normal-out'){
    const frame=normalPipeFrame(scene==='normal-in'?Math.min(1400,elapsed):1700+Math.min(900,elapsed));
    if(scene==='normal-in'){if(state.time>=950&&(previousTime<950||state.time<previousTime))sprite?.beginAction();sprite?.setActionProgress(normalPipeEntryProgress(elapsed),clock)}
    size=Math.max(.001,frame.size*frame.visibility);point={x:1.5,y:.205+.266+frame.lift,z:.5};pose=scene==='normal-out'?'pipe-exit':'calm';
    sprite?.setPipePhase(scene==='normal-in'?elapsed>=450&&elapsed<1400:elapsed<500);
    if(scene==='normal-out'&&elapsed>=650)shape=Math.min(1,.82+.18*(elapsed-650)/250);
  }
  if(scene==='inverted-out'){
    const frame=invertedPipeExitFrame(elapsed,true),emergence=vec3(1.5,2-INVERTED_PIPE_LENGTH+.18,.5),landing=vec3(1.5,.205,.5);
    point=emergence.lerp(landing,frame.burst);size=frame.size;squash=frame.squash;shape=frame.stepJump;pose='pipe-exit';
    sprite?.setPipePhase(elapsed<450);
  }
  pom.pos3D=vec3(point.x,point.y,point.z);pom.rotation3D=camera.rotation.copy();pom.scale3D=vec3(.72*size*(1+squash)*effortScale.x,.56*size*(1-squash)*effortScale.y,.018);
  if(sprite){sprite.setPose(pose);sprite.setStepJump(shape);sprite.update(clock,!moving);sprite.setCameraTilt(camera.rotation.x);sprite.alignToSurface(-.205,vec3())}
}
await engineInit(init,update,undefined,undefined,undefined,[],wrap);
