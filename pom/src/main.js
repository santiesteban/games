import {
  timeReal, buildMatrix, engineInit, Render3DPlugin, EngineObject3D, Mesh, buildBox, buildCapsule, buildLathe, buildSphere, vec2, vec3,
  Color, render3D, textureInfos, setCanvasFixedSize, setCanvasPixelRatio, setCanvasClearColor, glSetAntialias, setDebugWatermark, setLoadingScreen, engineObjectsRaycast3D,
} from 'littlejsengine';
import catalog from '#level-catalog';
import { createLevelProgress } from './level-progress.js';
import { createLevelPreferences } from './level-preferences.js';
import { CONTROL_FEATURES, TOP_FACE_STYLES, createControlFeatures } from './control-features.js';
import { createMovementMarkers } from './movement-markers.js';
import { puzzleFloorBounds } from './floor-grid.js';
import { outsidePolygonSegments } from './surface-patterns.js';
import { sampleCameraIntro } from './camera-intro.js';
import { cellYStretch, stretchBoardY, unStretchBoardY } from './cell-squareness.js';
import { createDesignPlayground } from './design-playground.js';
import { createBackgroundStudio } from './background-studio.js';
import { createCameraLab } from './camera-lab.js';
import { createCameraScenery } from './camera-scenery.js';
import { ENVIRONMENTS, DEFAULT_ENVIRONMENT, environmentById, environmentFrame, environmentCacheKey, selectEnvironmentComposition, createEnvironmentLoader } from './environments.js';
import { createVictoryEffects, victoryLandingOffset, victoryArrival } from './victory-effects.js';
import { pieceShadowShader, groundShadowShader } from './shadow-materials.js';
import { createLevelGridObserver } from './level-grid.js';
import { puzzleThumbnail } from './puzzle-thumbnail.js';
import { createMyPuzzles } from './my-puzzles.js';
import { canReachPiece, safePieceChange } from '../shared/rules.js';
import { decodePuzzle, puzzleLevel } from '../shared/puzzle.js';
import { deploymentUrls } from '../shared/deployment.js';
import { reachTiming, reachOutline, reachFaceDepth, triangulateContour } from './reach-motion.js';
import { createMovementBoard, planMovement, sampleMovement, movementSegmentClear, movementNeighbors, findMovementPath, movementProfiles } from './movement-routes.js';
import { movementExamples, studioLevel } from './movement-studio.js';
import { cameraPosition, cameraSlant, CAMERA_PITCHES, DEFAULT_VIEW, createViewController } from './camera-view.js';
import skyBackground from '../sky-background.webp';
import meadowForeground from '../meadow-foreground.webp';

const makerPlaytestToken=new URLSearchParams(location.hash.slice(1)).get('playtest');
const isMakerPlaytest=__PLAYTEST_BUILD__||makerPlaytestToken!==null;
let playtestResult,playtestLoading;
if(isMakerPlaytest){
  document.documentElement.classList.add('maker-playtest');
  playtestLoading=document.createElement('div');playtestLoading.className='playtest-loading';playtestLoading.textContent='Opening your puzzle…';document.body.append(playtestLoading);
  document.querySelector('#levelSettings').style.visibility='hidden';
  document.querySelector('#exitLevel').setAttribute('aria-label','Back to editor');
}
function returnToMaker(){
  if(window.parent!==window){let origin;try{origin=new URL(document.referrer).origin}catch{}if(origin){window.parent.postMessage({type:'little-ledges:close-playtest'},origin);return}}
  location.replace(deploymentUrls().creator);
}
function showPlaytestResult(){
  victoryEffects.reset();
  if(!playtestResult){playtestResult=document.createElement('dialog');playtestResult.className='puzzle-import playtest-result';playtestResult.setAttribute('aria-label','Playtest complete');playtestResult.innerHTML='<h2>Little world, big success!</h2><p>Pom reached your flag.</p><div class="import-actions"><button class="btn menu-primary" data-retry>Play again</button><button class="btn" data-return>Back to editor</button></div>';document.body.append(playtestResult);playtestResult.querySelector('[data-retry]').onclick=()=>{playtestResult.close();resetLevelState(activeLevel)};playtestResult.querySelector('[data-return]').onclick=returnToMaker;playtestResult.addEventListener('cancel',e=>{e.preventDefault();returnToMaker()})}
  playtestResult.showModal();
}
const wrap = document.querySelector('#canvasWrap');
const victoryEffects=createVictoryEffects(document.querySelector('.app'));
let cameraFrameHeight=0,cameraFocus,followAnchor,followTime=0;
let viewUnit=0,viewTarget,viewReady=false,viewMobile=false,viewTouched=false,introFrame=0,introPlaying=false,settingsReturnToLevel=false,viewWidth=0,viewHeight=0;
const boardPointers=new Map();let boardGesture=null,introTick=null,keepInterruptedView=false;
const pageUrl=new URL(location.href);if(pageUrl.searchParams.has('style')){pageUrl.searchParams.delete('style');window.history.replaceState(null,'',pageUrl)}
function syncScreenAppearance(screen){
  document.documentElement.dataset.screen=screen;
  document.querySelector('meta[name="theme-color"]').content=screen==='home'?'#b4f5de':'#eee8fa';
}
window.addEventListener('pageshow',()=>syncScreenAppearance(document.documentElement.dataset.screen));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncScreenAppearance(document.documentElement.dataset.screen)});
const svgNS='http://www.w3.org/2000/svg';
const FLOOR_DEPTH=4,GRID_DEPTH=4,DEPTH_SKEW=.16, ink='#28251f';
let viewPitch=cameraPosition(DEFAULT_VIEW.horizontal,DEFAULT_VIEW.vertical).pitch,viewHeightStep=0;
const movementRouteCache=new Map;let movementBoardCache,movementBoardKey,reachableKey,reachableValue;
const {levels,groups:levelGroups}=catalog;
const cameraLab=!isMakerPlaytest&&new URLSearchParams(location.search).has('camera-lab')?createCameraLab({levels,environments:ENVIRONMENTS,onChange:applyCameraStudy,onLevel:startLevel}):null;
const cameraScenery=cameraLab?createCameraScenery():null;
function studyPerspective(){return cameraLab?.state.projection==='perspective'}
function studyStraight(){return !!cameraLab&&cameraLab.state.projection!=='oblique'}
function viewSpan(){return studyPerspective()?(cameraFrameHeight||baseCameraHeight||1):render3D.camera.orthographic}
function depthSkew(side=viewSide){return studyStraight()?0:cameraSlant(side)*DEPTH_SKEW}
function cameraYaw(){return studyStraight()&&cameraLab.state.motion!=='track'?-cameraLab.state.yaw*Math.PI/180:0}
function cameraPitch(){return studyStraight()?cameraLab.state.pitch*Math.PI/180:cameraPosition(viewSide,viewHeightStep).pitch}
function isPreviewLevel(level){return ['design-playground','background-studio'].includes(level.kind)}
const levelProgress=isMakerPlaytest||cameraLab?{key:null,count:0,has:()=>false,reload(){},complete:()=>false,clear:()=>false}:createLevelProgress(levels.filter(level=>!isPreviewLevel(level)));
const levelPreferences=createLevelPreferences();
let toastTimer,helpKind=null,openingHelpShown=false,interactionHelpKey=null;
function syncHelpVisibility(){document.querySelector('#toast').hidden=levelPreferences.hideHelpText;if(levelPreferences.hideHelpText)hideHelp()}
syncHelpVisibility();
const controlFeatures=createControlFeatures({persistent:!isMakerPlaytest&&!cameraLab});
let movementMarkers;
const levelGridObserver=createLevelGridObserver();
let progressSaved=true;
let activeLevel=levels.find(level=>level.compatibility.playable);
if(!activeLevel)throw new Error('The level catalog has no playable puzzles.');
const designPlayground=createDesignPlayground(document.querySelector('#designPanel'),()=>{
  if(!gameReady)return;
  refreshCellSquareness();syncBlocks();syncFlag();syncHoverSpot();if(!busy)syncPlayer();syncMovementMarkers();
},design=>{
  let saved=true;
  if(!controlFeatures.setTopFaceStyle(design.topFaces))saved=false;
  syncControlFeatureInputs();
  for(const [id,enabled]of [['movementStuds',design.studs.enabled],['pieceShadows',design.shadows.enabled],['floorGrid',design.floorGrid.enabled]]){
    if(!controlFeatures.set(id,enabled))saved=false;
    document.querySelector(`#${id}`).checked=enabled;
  }
  return saved;
});
let shadowFloor,environmentLoader,activeEnvironment=environmentById(DEFAULT_ENVIRONMENT),activeEnvironmentTextures,environmentRequest=0,environmentRequestKey,failedEnvironmentKey,environmentSelection;
const backgroundStudio=createBackgroundStudio(document.querySelector('#backgroundPanel'),()=>{
  if(!gameReady)return;
  requestLevelEnvironment(true);syncBackground();syncFloorGrid();
});
function isDesignPlayground(){return activeLevel.kind==='design-playground'}
function isBackgroundStudio(){return activeLevel.kind==='background-studio'}
function currentBackgroundConfiguration(){return isBackgroundStudio()?backgroundStudio.values:backgroundStudio.appliedValues}
function requestLevelEnvironment(retry=false){
  if(!environmentLoader)return;
  const preview=currentBackgroundConfiguration();
  const id=cameraLab?.state.environment??preview?.environment??activeLevel.environment??levelGroups.find(group=>group.id===activeLevel.group)?.environment??DEFAULT_ENVIRONMENT;
  const source=environmentById(id),width=Math.max(1,wrap.clientWidth),height=Math.max(1,wrap.clientHeight);
  const selectionKey=`${source.id}:${activeLevel.id}:${width}:${height}:${viewSide}:${viewHeightStep}:${preview?.composition??'auto'}`;
  if(environmentSelection?.key!==selectionKey){
    // Use the full-board horizon to choose artwork, so panning/zooming does not
    // download a different composition. Resizes and camera angles still adapt.
    const frame=sceneFrame(width,height),groundFraction=.5+(frame.target.y*Math.cos(viewPitch)-frame.target.z*Math.sin(viewPitch))/frame.height;
    const previous=environmentSelection?.environment.id===source.id?environmentSelection.environment.variant:undefined;
    environmentSelection={key:selectionKey,environment:selectEnvironmentComposition(source,{width,height,groundFraction,previous,preferred:cameraLab?'landscape':preview?.composition})};
  }
  const environment={...environmentSelection.environment};
  if(preview){if(isBackgroundStudio())backgroundStudio.setComposition(environment);environment.groundAnchorY=backgroundStudio.anchorFor(environment,preview)}
  const key=`${environmentCacheKey(environment)}:${environment.groundAnchorY}`;
  if(key===environmentRequestKey&&!(retry&&failedEnvironmentKey===key))return;
  environmentRequestKey=key;failedEnvironmentKey=undefined;
  const request=++environmentRequest;
  const apply=(textures,art=environment,fallback=false)=>{
    if(request!==environmentRequest)return;
    activeEnvironment=art;activeEnvironmentTextures=textures;syncBackground();syncFloorGrid();
    if(isBackgroundStudio())backgroundStudio.setStatus(fallback?`${art.name}: showing the original artwork because the new composition could not load. Choose the environment again to retry.`:`${art.name}${art.variant?` (${art.variant})`:''} ready. Use Apply to all levels to save the current configuration.`);
  };
  const cached=environmentLoader.cached(environment);if(cached){apply(cached);return}
  if(isBackgroundStudio())backgroundStudio.setStatus(`Loading ${environment.name}…`);
  environmentLoader.load(environment).then(textures=>apply(textures)).catch(async()=>{
    if(request!==environmentRequest)return;failedEnvironmentKey=key;
    if(environment.variant){try{const textures=await environmentLoader.load(source);apply(textures,source,true);return}catch{}}
    if(request===environmentRequest&&isBackgroundStudio())backgroundStudio.setStatus('The scenery could not be loaded. Choose the environment again to retry. The previous scenery is still displayed.');
  });
}
function currentDesign(){return isDesignPlayground()?designPlayground.values:designPlayground.appliedValues}
function movementMarkersEnabled(){return isDesignPlayground()?designPlayground.values.studs.enabled:controlFeatures.enabled('movementStuds')}
function topFaceStyle(){return isDesignPlayground()?designPlayground.values.topFaces:controlFeatures.topFaceStyle}
function depthColorsEnabled(){return topFaceStyle()==='pull-depth'}
function walkabilityFacesEnabled(){return topFaceStyle()==='walkability'}
function reachableSurfaceKeys(){return new Set([player,...standableReachable()].filter(p=>movementBoard().validNode(p)).map(nodeKey))}
function customFloorGridEnabled(){return isDesignPlayground()?designPlayground.values.floorGrid.enabled:controlFeatures.enabled('floorGrid')}
let W=activeLevel.width,H=activeLevel.height,mural=activeLevel.grid.map(row=>[...row]),goalCell={...activeLevel.goal};
let palette,topPalette,sidePalette;
const pullDepthPalette=[new Color(151/255,197/255,143/255),new Color(245/255,216/255,113/255),new Color(236/255,151/255,137/255)];
const depthRowColor=(depth,z)=>pullDepthPalette[depth-1-z];
function depthBandTone(color,t){
  const band=currentDesign().bands[pullDepthPalette.indexOf(color)],dark=designColor(band.dark),light=designColor(band.light);
  return new Color(dark.r+(light.r-dark.r)*t,dark.g+(light.g-dark.g)*t,dark.b+(light.b-dark.b)*t);
}
function designColor(hex){return new Color(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255)}
function platformTopColor(group,x,z,fraction=.5){
  if(depthColorsEnabled())return depthBandTone(depthRowColor(group.depth,z),fraction);
  if(walkabilityFacesEnabled())return topPalette[group.color];
  const color=palette[group.color],shade=topFaceShade(x,z,color);
  return new Color(color.r*shade.r,color.g*shade.g,color.b*shade.b);
}
function useLevelPalette(level){
  palette=Object.fromEntries(Object.entries(level.palette).map(([slot,[r,g,b]])=>[slot,new Color(r/255,g/255,b/255)]));
  topPalette=Object.fromEntries(Object.entries(palette).map(([slot,color])=>[slot,tinted(color,.035)]));
  sidePalette=Object.fromEntries(Object.entries(palette).map(([slot,color])=>[slot,shaded(color,.96)]));
}
useLevelPalette(activeLevel);
let groups=[],byCell=Array.from({length:H},()=>Array(W).fill(null)),player={x:activeLevel.start.x,y:activeLevel.start.y??H,z:activeLevel.start.z},selected=null,hovered=null,history=[],won=false,busy=false,falling=false,viewSide=DEFAULT_VIEW.horizontal,blockObjects=[],extrusionObjects=[],extrusionOutlines=[],topObjectInfo=new Map,sideObjectInfo=new Map,playerObject,pomBody,pomReaching=false,pomParts=[],hoverObject,studioTargetObject,flagPole,flagCloth,flagPrint,flagVase,flagCap,flagMeshes,umbrellaCanopy,umbrellaHandle,umbrellaPanels=[],pomEyes=[],sweatDrops=[],effortFrame=0,backgroundObjects=[],celebration=null,baseCameraHeight=0,gameReady=false;
const box=buildBox(),flagMesh=new Mesh().addStrip([vec3(-.5,.5,0),vec3(-.5,-.5,0),vec3(.5,0,0)],vec3(0,0,1));
const inkColor=new Color(.157,.145,.122);
const viewControls=createViewController(document.querySelector('#viewController'),position=>changeView(position.horizontal,position.vertical));
function squareFace(m,map,bounds,color,normal){const [u0,u1,v0,v1]=bounds,pts=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]],center=map((u0+u1)/2,(v0+v1)/2),vertices=[center,...pts.map(([u,v])=>map(u,v))],indices=[];for(let i=1;i<=4;i++)indices.push(0,i,i===4?1:i+1);m.addTriangles(vertices,indices,normal,undefined,color);return m}
function frontTileMesh(){const m=new Mesh();squareFace(m,(x,y)=>vec3(x,y,0),[-.5,.5,-.5,.5],new Color(1),vec3(0,0,1));m.doubleSided=true;return m}
function makeFanMesh(perimeter){const points=[vec3() ,...perimeter.map(([x,y])=>vec3(x,y,0))],indices=[];for(let i=1;i<points.length;i++)indices.push(0,i,i===points.length-1?1:i+1);const mesh=new Mesh().addTriangles(points,indices,vec3(0,0,1));mesh.doubleSided=true;return mesh}
function makeSectorMesh(center,perimeter){const points=[vec3(center[0],center[1],0),...perimeter.map(([x,y])=>vec3(x,y,0))],indices=[];for(let i=1;i<points.length;i++)indices.push(0,i,i===points.length-1?1:i+1);const mesh=new Mesh().addTriangles(points,indices,vec3(0,0,1));mesh.doubleSided=true;return mesh}
function quadraticSegment(a,c,b,steps=8){return Array.from({length:steps+1},(_,i)=>{const t=i/steps,s=1-t;return[s*s*a[0]+2*s*t*c[0]+t*t*b[0],s*s*a[1]+2*s*t*c[1]+t*t*b[1]]})}
function standingSpotMesh(){
  const skew=depthSkew(),points=[],half=.31,radius=.09,m=new Mesh();
  for(const [x,z,start] of [[half-radius,half-radius,0],[-half+radius,half-radius,Math.PI/2],[-half+radius,-half+radius,Math.PI],[half-radius,-half+radius,Math.PI*1.5]])for(let i=0;i<=8;i++){const a=start+i*Math.PI/16,xx=x+radius*Math.cos(a),zz=z+radius*Math.sin(a);points.push(vec3(xx+skew*zz,0,zz))}
  const vertices=[vec3(),...points],indices=[];for(let i=1;i<vertices.length;i++)indices.push(0,i,i===vertices.length-1?1:i+1);m.addTriangles(vertices,indices,vec3(0,1,0),undefined,new Color(1,1,1));m.doubleSided=true;return m;
}
function standingSpotCenter(p){const ground=p.y===H,top=ground?0:H-p.y;return worldPoint(p.x+.5,top+(ground?.005:.006),p.z+.5+(ground?.025:0))}
function syncHoverSpot(){if(!hoverObject)return;hoverObject.setMesh(standingSpotMesh());if(studioTargetObject){studioTargetObject.setMesh(standingSpotMesh());if(activeLevel.previewMove)studioTargetObject.pos3D=standingSpotCenter(activeLevel.previewMove)}if(hovered)hoverObject.pos3D=standingSpotCenter(hovered)}
function setUmbrellaVisible(show){if(umbrellaCanopy)umbrellaCanopy.color=new Color(.15,.2,.27,show?1:0);if(umbrellaHandle)umbrellaHandle.color=new Color(.15,.2,.27,show?1:0);for(let i=0;i<umbrellaPanels.length;i++){const color=i%2?new Color(.64,.83,.97):new Color(.98,.99,.96);color.a=show?1:0;umbrellaPanels[i].color=color}}
function positionUmbrella(t=0){const sway=Math.sin(t*Math.PI*2)*.06,y=.84+Math.sin(t*Math.PI*4)*.025;if(umbrellaCanopy)umbrellaCanopy.pos3D=vec3(sway,y,3);if(umbrellaHandle)umbrellaHandle.pos3D=vec3(sway,y,2.96);for(const panel of umbrellaPanels)panel.pos3D=vec3(sway,y,3.035)}
function animateEffort(){
  const frame=++effortFrame,start=performance.now(),duration=440;
  function tick(now){
    if(frame!==effortFrame)return;const elapsed=now-start,t=Math.min(1,elapsed/duration),effort=Math.sin(Math.PI*t);
    playerObject.scale3D=vec3(.72*(1+.025*effort),.56*(1-.04*effort),.018);
    for(let i=0;i<sweatDrops.length;i++){const drop=sweatDrops[i],q=Math.max(0,Math.min(1,(elapsed-i*65)/340)),alpha=Math.sin(Math.PI*q);drop.outline.pos3D=vec3(.48+i*.17+q*.16,.65-i*.20-q*.12,2.8);drop.outline.color=new Color(.157,.145,.122,alpha);drop.fill.color=new Color(.64,.83,.97,alpha)}
    if(t<1)requestAnimationFrame(tick);else{playerObject.scale3D=vec3(.72,.56,.018);for(const drop of sweatDrops){drop.outline.color.a=0;drop.fill.color.a=0}}
  }
  requestAnimationFrame(tick);
}
const pomContour=[quadraticSegment([-1,.28],[-1.02,1.15],[0,1.22]),quadraticSegment([0,1.22],[1.02,1.15],[1,.28]),quadraticSegment([1,.28],[.84,-.12],[0,-.12]),quadraticSegment([0,-.12],[-.84,-.12],[-1,.28])].flatMap((segment,index)=>index?segment.slice(1):segment).map(([x,y])=>[x*.5,y*.709-.294]).reverse();
const pomBlob=makeFanMesh(pomContour),pomEye=makeFanMesh(Array.from({length:20},(_,i)=>[Math.cos(i*Math.PI/10)*.5,Math.sin(i*Math.PI/10)*.5]));

function makeGroups(){const board=createMovementBoard(mural,activeLevel.initialDepths);groups=board.groups;byCell=board.byCell;for(const g of groups)g.objects=[]}
function clearMovementRoutes(){movementRouteCache.clear();movementBoardCache=null;movementBoardKey=null;reachableKey=null;reachableValue=null}
function movementBoard(){const key=groups.map(g=>g.depth).join(',');if(!movementBoardCache||key!==movementBoardKey){movementBoardKey=key;movementBoardCache=createMovementBoard(mural,groups.map(g=>g.depth))}return movementBoardCache}
function routeFor(from,to){const board=movementBoard(),key=`${nodeKey(from)}>${nodeKey(to)}:${movementBoardKey}`;if(!movementRouteCache.has(key))movementRouteCache.set(key,planMovement(board,from,to));return movementRouteCache.get(key)}
function cellDepth(x,y){return y===H?0:(byCell[y]?.[x]?.depth??-1)}
function nodesAt(x,y){if(x< -1||x>=W||y<0||y>H)return[];if(y===H){const front=Math.max(0,cellDepth(x,H-1));return Array.from({length:Math.max(0,FLOOR_DEPTH-front)},(_,i)=>({x,y,z:front+i}))}if(x<0)return[];const d=cellDepth(x,y),above=cellDepth(x,y-1);if(d<=0)return[];return Array.from({length:Math.max(0,d-Math.max(0,above))},(_,i)=>({x,y,z:Math.max(0,above)+i}))}
function validNode(x,y,z){return nodesAt(x,y).some(n=>n.z===z)}
function nodeKey(p){return `${p.x},${p.y},${p.z}`}
function jumpPose(from,to,t,profile){const p=sampleMovement(routeFor(from,to),t,profile);return worldPoint(p.x,p.y,p.z)}
function resetPomShape(){
  if(!pomReaching)return;
  playerObject.setMesh(pomBlob);pomBody.setMesh(pomBlob);pomBody.scale3D=vec3(.88,.88,1);setPomFaceDepth();pomReaching=false;
}
function setPomFaceDepth(depth=2){for(const {white,black} of pomEyes){white.pos3D.z=depth;black.pos3D.z=depth+.2}}
function shapePomReach(from,to,t,profile){
  const timing=reachTiming(t),plan=routeFor(from,to),board=movementBoard();let tailTime=timing.tail;
  while(timing.head-tailTime>.0001&&!movementSegmentClear(board,sampleMovement(plan,tailTime,profile),sampleMovement(plan,timing.head,profile)))tailTime=(tailTime+timing.head)/2;
  const head=jumpPose(from,to,timing.head,profile);
  if(timing.head-timing.tail<.00001){resetPomShape();return head}
  const right=render3D.camera.getRight(),up=render3D.camera.getUp(),back=right.cross(up);
  const tailDelta=jumpPose(from,to,tailTime,profile).subtract(head);tailDelta.y=unStretchY(tailDelta.y);
  const span=Math.hypot(tailDelta.dot(right)/.72,tailDelta.dot(up)/.56),amount=Math.min(1,.45/Math.max(.001,span));
  // Allow a visible stretch, capped at 45% of Pom's width on steeper climbs.
  const centers=[{x:tailDelta.dot(right)/.72*amount,y:tailDelta.dot(up)/.56*amount,z:tailDelta.dot(back)/.018*amount},{x:0,y:0,z:0}];
  const outline=reachOutline(centers,pomContour),fill=reachOutline(centers,pomContour,.055);
  const mesh=contour=>{const m=new Mesh().addTriangles(contour.map(p=>vec3(p.x,p.y,p.z)),triangulateContour(contour),vec3(0,0,1));m.doubleSided=true;return m};
  playerObject.setMesh(mesh(outline));pomBody.setMesh(mesh(fill));pomBody.scale3D=vec3(1,1,1);setPomFaceDepth(reachFaceDepth(outline,fill));pomReaching=true;
  return head;
}
function neighbors(p){return movementNeighbors(movementBoard(),p,routeFor)}
function findPath(target){return findMovementPath(movementBoard(),player,target,routeFor)}
function standableReachable(){
  const board=movementBoard(),key=`${nodeKey(player)}:${movementBoardKey}`;if(key===reachableKey)return reachableValue;
  const q=[player],seen=new Set([nodeKey(player)]),out=[];
  while(q.length){const p=q.shift();for(const n of neighbors(p)){const k=nodeKey(n);if(!seen.has(k)){seen.add(k);out.push(n);q.push(n)}}}
  reachableKey=key;reachableValue=out.filter(p=>board.validNode(p));return reachableValue;
}
function reachableTop(target){if(findPath(target))return target;return standableReachable().filter(p=>Math.abs(p.x-target.x)+Math.abs(p.y-target.y)<=1).sort((a,b)=>(Math.abs(a.x-target.x)+Math.abs(a.y-target.y)+Math.abs(a.z-target.z))-(Math.abs(b.x-target.x)+Math.abs(b.y-target.y)+Math.abs(b.z-target.z)))[0]||target}
function canReach(g){return canReachPiece(movementBoard(),movementBoard().groups[g?.id],player)}
function goalNode(){const g=byCell[goalCell.y]?.[goalCell.x];return{x:goalCell.x,y:goalCell.y,z:Math.max(0,(g?.depth||0)-1)}}
function save(){history.push({player:{...player},depths:groups.map(g=>g.depth),selected:selected?.id??null,won});if(history.length>80)history.shift()}
function safeManipulation(g,next,dir){return safePieceChange(movementBoard(),movementBoard().groups[g.id],player,next,dir)}
function canInteract(g){return g&&canReach(g)&&((g.depth<3&&safeManipulation(g,g.depth+1,1))||(g.depth>0&&safeManipulation(g,g.depth-1,-1)))}
function autoSelectNearbyPiece(){
  if(!controlFeatures.enabled('autoSelectPieces')||busy||won||introPlaying)return;
  const row=byCell[player.y-1];
  // Board coordinates keep right/left consistent at every camera angle.
  const candidates=[row?.[player.x],row?.[player.x+1],row?.[player.x-1]];
  selected=candidates.find(canInteract)??null;
}

function extrusion(depth){return{x:depthSkew()*depth,z:depth}}
let yStretch=1,liveCellPitch=0;
function stretchY(y){return stretchBoardY(y,yStretch)}
function unStretchY(y){return unStretchBoardY(y,yStretch)}
function worldPoint(x,y,z){return vec3(x+depthSkew()*z,stretchY(y),z)}
function boardRay(ray){
  // Keep the ray parameter and X/Z unchanged; invert only board geometry's Y.
  const origin=vec3(ray.origin.x,unStretchY(ray.origin.y),ray.origin.z),direction=vec3(ray.direction.x,ray.direction.y/yStretch,ray.direction.z);
  return {origin,direction,getPosition:t=>origin.add(direction.scale(t))};
}
function refreshCellSquareness(){
  liveCellPitch=Math.asin(Math.min(1,Math.abs(render3D.camera.getForward().y)));
  const next=cellYStretch(studyStraight()?0:currentDesign().cellSquareness,liveCellPitch),changed=next!==yStretch;
  yStretch=next;return changed;
}
function syncCellGeometry(){
  if(!refreshCellSquareness()||!blockObjects.length)return;
  syncBlocks();syncFlag();syncHoverSpot();syncMovementMarkers();if(!busy)syncPlayer();
}
function syncPomMatrix(){
  if(!playerObject)return;
  if(yStretch===1){playerObject.localMatrix=undefined;return}
  // Billboard rotation mixes local Y/Z. Scale world Y of its basis, once;
  // the anchor has already passed through stretchY. Children inherit this matrix.
  const matrix=buildMatrix(playerObject.pos3D,playerObject.rotation3D,playerObject.scale3D);
  for(const i of [1,5,9])matrix.m[i]=stretchY(matrix.m[i]);
  playerObject.localMatrix=matrix;
}
function cellMeasurement(){
  const size=vec2(wrap.clientWidth,wrap.clientHeight),matrix=blockObjects[0]?.getMatrix();
  if(!matrix)return {pitch:liveCellPitch,stretch:yStretch,ratio:Math.cos(liveCellPitch)*yStretch};
  const origin=render3D.worldToScreen(matrix.transformPoint(vec3(-.5,-.5,0)),size),x=render3D.worldToScreen(matrix.transformPoint(vec3(.5,-.5,0)),size),y=render3D.worldToScreen(matrix.transformPoint(vec3(-.5,.5,0)),size);
  if(!origin||!x||!y)return {pitch:liveCellPitch,stretch:yStretch,ratio:Math.cos(liveCellPitch)*yStretch};
  return {pitch:liveCellPitch,stretch:yStretch,ratio:Math.hypot(y.x-origin.x,y.y-origin.y)/Math.hypot(x.x-origin.x,x.y-origin.y)};
}
function blockPose(c,depth){return{pos:worldPoint(c.x+.5,H-c.y-.5,depth)}}
function tinted(color,amount){return new Color(color.r+(1-color.r)*amount,color.g+(1-color.g)*amount,color.b+(1-color.b)*amount)}
function shaded(color,amount){return new Color(color.r*amount,color.g*amount,color.b*amount)}
function blockActionText(color){
  const luminance=channels=>channels.map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i],0);
  const background=luminance([color.r,color.g,color.b]),dark=luminance([41/255,37/255,55/255]),light=luminance([1,250/255,240/255]);
  const contrast=value=>(Math.max(value,background)+.05)/(Math.min(value,background)+.05);
  return contrast(light)>contrast(dark)?'#fffaf0':'#292537';
}
function makeSurface(pos,mesh,color){const o=new EngineObject3D(pos,mesh,undefined,color);o.lighting=false;o.emissive=1;o.receiveShadow=false;o.castShadow=false;return o}
function topFaceShade(x,z,pigment){
  if((x+z)%2!==1)return new Color(1);
  const contrast=pigment.g>pigment.r*1.15?(pigment.g>pigment.b*1.15?.69:.80):.90;
  return pigment.r>.9&&pigment.g>.75&&pigment.b<.4?new Color(1,.88,.65):new Color(contrast,contrast,contrast);
}
function gradientBandFace(mesh,map,bounds,color,normal,sideFace=false){
  const [u0,u1,v0,v1]=bounds,lines=currentDesign().lines;
  const face=(rect,lineStyle=null)=>{
    const [a,b,c,d]=rect,points=[[(a+b)/2,(c+d)/2],[a,c],[b,c],[b,d],[a,d]];
    const ink=lineStyle?designColor(lineStyle.color):null;
    const colors=points.map(([,v])=>{const base=depthBandTone(color,(v-v0)/(v1-v0)),alpha=lineStyle?.opacity??0;return ink?new Color(base.r+(ink.r-base.r)*alpha,base.g+(ink.g-base.g)*alpha,base.b+(ink.b-base.b)*alpha):base});
    mesh.addTriangles(points.map(([u,v])=>map(u,v).add(normal.scale(lineStyle ? .002 : 0))),[0,1,2,0,2,3,0,3,4,0,4,1],normal,undefined,colors);
  };
  face(bounds);
  // Each face supplies half a seam, keeping shared square edges equally thin.
  const uLine=sideFace?lines.horizontal:lines.vertical,vLine=sideFace?lines.vertical:lines.horizontal;
  const du=uLine.width/2,dv=vLine.width/2;
  if(du&&uLine.opacity)for(const strip of [[u0,u0+du,v0,v1],[u1-du,u1,v0,v1]])face(strip,uLine);
  if(dv&&vLine.opacity)for(const strip of [[u0,u1,v0,v0+dv],[u0,u1,v1-dv,v1]])face(strip,vLine);
}
function walkabilityFace(mesh,map,bounds,walkable){
  const [u0,u1,v0,v1]=bounds,normal=vec3(0,1,0),width=.014;
  squareFace(mesh,map,bounds,new Color(1),normal);
  const line=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length*width/2,ny=dx/length*width/2,shade=walkable?.86:.80;
    mesh.addQuad(map(a[0]+nx,a[1]+ny).add(vec3(0,.002,0)),map(b[0]+nx,b[1]+ny).add(vec3(0,.002,0)),map(b[0]-nx,b[1]-ny).add(vec3(0,.002,0)),map(a[0]-nx,a[1]-ny).add(vec3(0,.002,0)),new Color(shade,shade,shade));
  };
  if(walkable){const h=width/2;for(const [a,b]of [[[u0+h,v0+h],[u1-h,v0+h]],[[u1-h,v0+h],[u1-h,v1-h]],[[u1-h,v1-h],[u0+h,v1-h]],[[u0+h,v1-h],[u0+h,v0+h]]])line(a,b)}
  else for(let t=-.8;t<1;t+=.2){const a=Math.max(0,-t)+.01,b=Math.min(1,1-t)-.01;if(b>a)line([u0+a,v0+a+t],[u0+b,v0+b+t])}
}
function prismMesh(cx,cy,depth,side,color,top=false,start=0,pulledDepth=depth,walkable=true){
  side=cameraSlant(side);
  const pigment=palette[color],m=new Mesh(),s=depthSkew(),lo=-.5,hi=.5,defaultFace=top?new Color(1):shaded(pigment,.72);
  const P=(x,y,z)=>vec3(x+s*z,stretchY(y),z);
  const quad=(a,b,c,d,face=defaultFace)=>m.addQuad(P(...a),P(...b),P(...c),P(...d),face);
  if(top){
    if(walkabilityFacesEnabled())walkabilityFace(m,(x,z)=>P(x,.5,z),[lo,hi,start,start+1],walkable);
    else if(depthColorsEnabled())gradientBandFace(m,(x,z)=>P(x,.5,z),[lo,hi,start,start+1],depthRowColor(pulledDepth,start),vec3(0,1,0));
    else squareFace(m,(x,z)=>P(x,.5,z),[lo,hi,start,start+1],new Color(1),vec3(0,1,0));
  }
  else {
    squareFace(m,(x,y)=>P(x,y,depth),[lo,hi,lo,hi],defaultFace,vec3(0,0,1));
    quad([hi,lo,0],[lo,lo,0],[lo,hi,0],[hi,hi,0]);
    if(depthColorsEnabled()){
      for(let z=0;z<depth;z++)gradientBandFace(m,(x,z)=>P(x,hi,z),[lo,hi,z,z+1],depthRowColor(depth,z),vec3(0,1,0));
    }else squareFace(m,(x,z)=>P(x,hi,z),[lo,hi,0,depth],topPalette[color],vec3(0,1,0));
    quad([lo,lo,0],[hi,lo,0],[hi,lo,depth],[lo,lo,depth]);
    const sx=side>0?lo:hi;
    const ox=side>0?hi:lo;
    if(depthColorsEnabled()){
      for(let z=0;z<depth;z++){
        const face=depthRowColor(depth,z);
        gradientBandFace(m,(y,z)=>P(sx,y,z),[lo,hi,z,z+1],face,vec3(Math.sign(sx),0,0),true);
        gradientBandFace(m,(y,z)=>P(ox,y,z),[lo,hi,z,z+1],face,vec3(Math.sign(ox),0,0),true);
      }
    }else{
      squareFace(m,(y,z)=>P(sx,y,z),[lo,hi,0,depth],sidePalette[color],vec3(side,0,0));
      quad([ox,lo,depth],[ox,lo,0],[ox,hi,0],[ox,hi,depth]);
    }
  }
  m.doubleSided=true;return m;
}
function rebuildBlockMeshes(){for(const o of blockObjects)o.destroy();blockObjects=[];for(const g of groups){g.objects=[];for(const c of g.cells){const p=vec3(c.x+.5,H-c.y-.5,0),o=makeSurface(p,frontTileMesh(),palette[g.color]);g.objects.push(o);blockObjects.push(o)}}syncBlocks()}
function syncExtrusions(){for(const o of [...extrusionObjects,...extrusionOutlines])o.destroy();extrusionObjects=[];extrusionOutlines=[];topObjectInfo.clear();sideObjectInfo.clear();
  const reachable=walkabilityFacesEnabled()?reachableSurfaceKeys():null;
  for(const g of groups)if(g.depth)for(const c of g.cells){
    const base=vec3(c.x+.5,stretchY(H-c.y-.5),0),dark=makeSurface(base,prismMesh(c.x,c.y,g.depth,viewSide,g.color,false),new Color(1));
    extrusionOutlines.push(dark);sideObjectInfo.set(dark,g);
    for(let z=0;z<g.depth;z++){const top=makeSurface(base.add(vec3(0,stretchY(.003),0)),prismMesh(c.x,c.y,1,viewSide,g.color,true,z,g.depth,reachable?.has(nodeKey({x:c.x,y:c.y,z}))??true),depthColorsEnabled()?new Color(1):platformTopColor(g,c.x,z));top.scale3D=vec3(1,1,1);topObjectInfo.set(top,{x:c.x,y:c.y,z});extrusionObjects.push(top)}
  }
}
function drawMapOutlines(){
  const material={shader:render3D.shader,receiveShadow:render3D.receiveShadow,lighting:render3D.lighting,emissive:render3D.emissive};render3D.shader=undefined;render3D.receiveShadow=false;render3D.lighting=false;render3D.emissive=1;
  const height=wrap.clientHeight,size=vec2(wrap.clientWidth,height),stroke=2.4*viewSpan()/height,bias=render3D.camera.getForward().scale(-.026),seen=new Set,joins=new Map;
  const pointKey=p=>{const q=render3D.worldToScreen(p,size);return q?`${q.x.toFixed(1)},${q.y.toFixed(1)}`:null};
  const edge=(a,b)=>{const ka=pointKey(a),kb=pointKey(b),key=ka<kb?`${ka}|${kb}`:`${kb}|${ka}`,aa=a.add(bias),bb=b.add(bias);if(!ka||!kb||seen.has(key))return;seen.add(key);joins.set(ka,aa);joins.set(kb,bb);render3D.drawLine(aa,bb,stroke,inkColor)};
  const sameBlock=(g,x,y)=>byCell[y]?.[x]===g;
  for(const g of groups){for(const c of g.cells){
    const x0=c.x,x1=c.x+1,y1=H-c.y,y0=y1-1,d=g.depth;
    if(!d){const z=.028;
      if(!sameBlock(g,c.x,c.y+1))edge(vec3(x0,stretchY(y0),z),vec3(x1,stretchY(y0),z));
      if(!sameBlock(g,c.x+1,c.y))edge(vec3(x1,stretchY(y0),z),vec3(x1,stretchY(y1),z));
      if(!sameBlock(g,c.x,c.y-1))edge(vec3(x1,stretchY(y1),z),vec3(x0,stretchY(y1),z));
      if(!sameBlock(g,c.x-1,c.y))edge(vec3(x0,stretchY(y1),z),vec3(x0,stretchY(y0),z));
      continue}
    const side=cameraSlant(viewSide),skew=depthSkew(),P=(x,y,z)=>vec3(x+skew*z,stretchY(y),z),frontZ=d+.04;
    if(!sameBlock(g,c.x,c.y+1))edge(P(x0,y0,frontZ),P(x1,y0,frontZ));
    if(!sameBlock(g,c.x+1,c.y))edge(P(x1,y0,frontZ),P(x1,y1,frontZ));
    if(!sameBlock(g,c.x,c.y-1))edge(P(x1,y1,frontZ),P(x0,y1,frontZ));
    if(!sameBlock(g,c.x-1,c.y))edge(P(x0,y1,frontZ),P(x0,y0,frontZ));
  }}
  // Round caps bridge each pair of ribbon ends with the same width and depth bias.
  for(const point of joins.values())render3D.drawSphere(point,stroke,inkColor);
  const studs=currentDesign().studs;
  movementMarkers?.drawOutlines(studs.width*viewSpan()/height,{color:designColor(studs.color),opacity:studs.opacity});
  drawSelectedOutline();drawReferenceSquares();drawHoverSpot();drawPomOcclusionShadow();
  render3D.flush();Object.assign(render3D,material);
}
// Boundary edges keep the selected material on their screen-right side, including holes.
function roundedInsetLoop(points,offset,radius){if(points.length<3)return[];const sign=-1,verts=points.map((v,i)=>{const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length],normal=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return{x:-dy/l*sign,y:dx/l*sign}},n0=normal(prev,v),n1=normal(v,next),sx=n0.x+n1.x,sy=n0.y+n1.y,l=Math.hypot(sx,sy)||1,n={x:sx/l,y:sy/l},k=offset/(n.x*n1.x+n.y*n1.y||1);return{x:v.x+n.x*k,y:v.y+n.y*k}}),result=[];for(let i=0;i<verts.length;i++){const v=verts[i],prev=verts[(i+verts.length-1)%verts.length],next=verts[(i+1)%verts.length],unit=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return{x:dx/l,y:dy/l}},u0=unit(v,prev),u1=unit(v,next),r=Math.min(radius,Math.hypot(v.x-prev.x,v.y-prev.y)/2,Math.hypot(v.x-next.x,v.y-next.y)/2),a={x:v.x+u0.x*r,y:v.y+u0.y*r},b={x:v.x+u1.x*r,y:v.y+u1.y*r};for(let step=0;step<=5;step++){const t=step/5,s=1-t;result.push({x:s*s*a.x+2*s*t*v.x+t*t*b.x,y:s*s*a.y+2*s*t*v.y+t*t*b.y})}}return result}
function drawSelectedOutline(){
  const g=selected,selection=currentDesign().selection;
  if(!g||won||!selection.enabled)return;
  const color=designColor(selection.color),solid=selection.style==='solid';
  const width=wrap.clientWidth,height=wrap.clientHeight,size=vec2(width,height),z=g.depth+.028,offset=5.5,radius=6,dash=6,gap=4,stroke=2.2*viewSpan()/height;
  const frontWorld=point=>{const ray=render3D.screenToRay(vec2(point.x,point.y),size),t=(z-ray.origin.z)/ray.direction.z;return ray.getPosition(t)};
  const edges=[],has=(x,y)=>byCell[y]?.[x]===g;
  for(const c of g.cells){
    const x=c.x,y0=H-c.y-1,y1=H-c.y;
    if(!has(c.x,c.y+1))edges.push([[x,y0],[x+1,y0]]);
    if(!has(c.x+1,c.y))edges.push([[x+1,y0],[x+1,y1]]);
    if(!has(c.x,c.y-1))edges.push([[x+1,y1],[x,y1]]);
    if(!has(c.x-1,c.y))edges.push([[x,y1],[x,y0]]);
  }
  const key=p=>p.join(','),loops=[];
  while(edges.length){
    const first=edges.pop(),loop=[first[0],first[1]];
    while(key(loop.at(-1))!==key(loop[0])){
      const at=edges.findIndex(e=>key(e[0])===key(loop.at(-1)));if(at<0)break;
      loop.push(edges.splice(at,1)[0][1]);
    }
    if(key(loop.at(-1))===key(loop[0])){
      loop.pop();
      const screen=loop.map(([x,y])=>render3D.worldToScreen(worldPoint(x,y,z),size));
      if(screen.every(Boolean))loops.push(roundedInsetLoop(screen,offset,radius));
    }
  }
  for(const loop of loops){
    if(loop.length<2)continue;
    const points=[...loop,loop[0]],period=dash+gap;let traveled=0;
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1],length=Math.hypot(b.x-a.x,b.y-a.y)||0;
      if(solid){
        render3D.drawLine(frontWorld(a),frontWorld(b),stroke,color);
        render3D.drawSphere(frontWorld(a),stroke,color);
        continue;
      }
      let local=0;
      while(local<length){
        const phase=(traveled+local)%period;
        if(phase<dash){
          const step=Math.min(length-local,dash-phase),t0=local/length,t1=(local+step)/length,p0={x:a.x+(b.x-a.x)*t0,y:a.y+(b.y-a.y)*t0},p1={x:a.x+(b.x-a.x)*t1,y:a.y+(b.y-a.y)*t1};
          render3D.drawLine(frontWorld(p0),frontWorld(p1),stroke,color);local+=step;
        }else local+=Math.min(length-local,period-phase);
      }
      traveled+=length;
    }
  }
}
function drawReferenceSquares(){
  if(!isDesignPlayground()||!currentDesign().showReferenceSquares)return;
  const size=vec2(wrap.clientWidth,wrap.clientHeight),z=3.09;
  // Construct in screen space then unproject to a fixed front plane. The
  // reference must remain a true screen square, independent of board stretch.
  for(const g of groups){const c=g.cells[0],a=render3D.worldToScreen(worldPoint(c.x,H-c.y-1,g.depth+.05),size),b=render3D.worldToScreen(worldPoint(c.x+1,H-c.y-1,g.depth+.05),size),width=Math.hypot(b.x-a.x,b.y-a.y),corners=[[a.x,a.y],[a.x+width,a.y],[a.x+width,a.y-width],[a.x,a.y-width]].map(([x,y])=>{const ray=render3D.screenToRay(vec2(x,y),size);return ray.getPosition((z-ray.origin.z)/ray.direction.z)});
    for(let i=0;i<4;i++)render3D.drawLine(corners[i],corners[(i+1)%4],1.5*viewSpan()/size.y,new Color(.15,.25,.85));
  }
}
function drawHoverSpot(){
  if(!hoverObject||won)return;
  render3D.flushTransparentQueue();render3D.flush();const state={blend:render3D.blend,depthTest:render3D.depthTest,depthWrite:render3D.depthWrite,lighting:render3D.lighting};
  render3D.blend=true;render3D.depthTest=false;render3D.depthWrite=false;render3D.lighting=false;
  for(const spot of [hoverObject,studioTargetObject])if(spot&&spot.color.a>0&&!(spot===studioTargetObject&&movementMarkersEnabled()))render3D.drawMesh(spot.mesh,spot.getMatrix(),undefined,spot.color);render3D.flush();
  render3D.blend=state.blend;render3D.depthTest=state.depthTest;render3D.depthWrite=state.depthWrite;render3D.lighting=state.lighting;
}
function drawPomOcclusionShadow(){if(!playerObject||!pomParts.length)return;syncPomMatrix();render3D.flushTransparentQueue();render3D.flush();const state={blend:render3D.blend,depthWrite:render3D.depthWrite,depthTest:render3D.depthTest,lighting:render3D.lighting};render3D.blend=true;render3D.depthWrite=false;render3D.depthTest=false;render3D.lighting=false;render3D.drawMesh(playerObject.mesh,playerObject.getMatrix(),undefined,new Color(.13,.105,.08,.52));render3D.flush();render3D.depthTest=true;const pose=playerObject.pos3D.copy();playerObject.pos3D=pose.add(render3D.camera.getForward().scale(-.003));syncPomMatrix();playerObject.updateTransforms();const visible=pomParts.map(part=>({mesh:part.mesh,matrix:part.getMatrix().copy(),color:part.color.copy()}));playerObject.pos3D=pose;syncPomMatrix();playerObject.updateTransforms();for(const part of visible)render3D.drawMesh(part.mesh,part.matrix,undefined,part.color);render3D.flush();render3D.blend=state.blend;render3D.depthWrite=state.depthWrite;render3D.depthTest=state.depthTest;render3D.lighting=state.lighting}
function syncFloorGrid(){
  if(cameraLab){syncStudyFloor();return}
  const showFloor=currentBackgroundConfiguration()?.showGuides??true,custom=customFloorGridEnabled(),floor=currentDesign().floorGrid;
  wrap.dataset.floorStyle=custom?'walkability-custom-grid':'walkability-grid';
  const o=backgroundObjects[backgroundObjects.length-1];if(!o)return;
  if(!showFloor){o.mesh=undefined;return}
  const m=new Mesh(),width=wrap.clientWidth,height=wrap.clientHeight,ortho=render3D.camera.orthographic,aspect=width/height,worldWidth=ortho*aspect,line=(custom?floor.gridWidth:1.5)*ortho/height,gridColor=custom?designColor(floor.gridColor):new Color(1,1,1,.55),floorWash=custom?designColor(floor.color):new Color(1,1,1,0),size=vec2(width,height);
  if(custom){gridColor.a=floor.gridOpacity;floorWash.a=floor.opacity}
  render3D.updateMatrices(aspect);
  const toPlane=p=>{const q=render3D.worldToScreen(p,size);return vec2((q.x/width-.5)*worldWidth,(.5-q.y/height)*ortho)};
  const horizon=render3D.worldToScreen(vec3(4,0,0),size),hy=(.5-horizon.y/height)*ortho;
  const addPlaneLine=(p,q)=>{if(line<=0||gridColor.a<=0)return;const dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy)||1,nx=-dy/length*line/2,ny=dx/length*line/2,limit=hy-line/2;let poly=[vec2(p.x+nx,p.y+ny),vec2(q.x+nx,q.y+ny),vec2(q.x-nx,q.y-ny),vec2(p.x-nx,p.y-ny)],clipped=[];for(let i=0;i<poly.length;i++){const cur=poly[i],prev=poly[(i+poly.length-1)%poly.length],ci=cur.y<=limit,pi=prev.y<=limit;if(ci!==pi){const t=(limit-prev.y)/(cur.y-prev.y);clipped.push(vec2(prev.x+(cur.x-prev.x)*t,limit))}if(ci)clipped.push(cur)}if(clipped.length<3)return;const center=vec2(clipped.reduce((sum,v)=>sum+v.x,0)/clipped.length,clipped.reduce((sum,v)=>sum+v.y,0)/clipped.length),vertices=[vec3(center.x,center.y,0),...clipped.map(v=>vec3(v.x,v.y,0))],indices=[];for(let i=1;i<=clipped.length;i++)indices.push(0,i,i===clipped.length?1:i+1);m.addTriangles(vertices,indices,vec3(0,0,1),undefined,gridColor)};
  const addLine=(a,b)=>addPlaneLine(toPlane(a),toPlane(b));
  const foregroundWash=designColor(floor.foregroundColor);foregroundWash.a=custom?floor.foregroundOpacity:0;
  // Wash the entire scenery below the horizon; the puzzle remains in front
  // because this camera-facing layer sits behind the playfield geometry.
  m.addQuad(vec3(-worldWidth/2,hy,0),vec3(worldWidth/2,hy,0),vec3(worldWidth/2,-ortho/2,0),vec3(-worldWidth/2,-ortho/2,0),foregroundWash);
  const s=depthSkew(),ground=0,{left,right,back,front}=puzzleFloorBounds(mural,GRID_DEPTH);
  const reachable=reachableSurfaceKeys(),walkable=[];
  for(const key of reachable){const [x,y,z]=key.split(',').map(Number);if(y!==H)continue;
    walkable.push({x,z,polygon:[[x,z],[x+1,z],[x+1,z+1],[x,z+1]].map(([xx,zz])=>toPlane(worldPoint(xx,ground,zz)))});
  }
  // Diagonals cover non-walkable ground; cut them at exact walking-cell edges.
  const walkingPolygons=walkable.map(cell=>cell.polygon);
  const low=-ortho/2,high=Math.min(hy,ortho/2),rise=high-low,spacing=10*ortho/height;
  if(rise>0)for(let x=-worldWidth/2-rise;x<=worldWidth/2;x+=spacing){
    for(const [a,b]of outsidePolygonSegments({x,y:low},{x:x+rise,y:high},walkingPolygons))addPlaneLine(a,b);
  }
  const seen=new Set();
  for(const {x,z,polygon}of walkable){
    m.addQuad(...polygon.map(p=>vec3(p.x,p.y,0)),floorWash);
    for(const [a,b]of [[[x,z],[x+1,z]],[[x+1,z],[x+1,z+1]],[[x+1,z+1],[x,z+1]],[[x,z+1],[x,z]]]){
      const ka=a.join(','),kb=b.join(','),key=ka<kb?`${ka}|${kb}`:`${kb}|${ka}`;if(seen.has(key))continue;seen.add(key);
      addLine(worldPoint(a[0],ground,a[1]),worldPoint(b[0],ground,b[1]));
    }
  }
  wrap.dataset.walkableFloorCells=String(walkable.length);
  wrap.dataset.floorBounds=JSON.stringify({left,right,back,front});
  const thickness=2.4*ortho/height;
  m.addQuad(vec3(-worldWidth/2,hy+thickness/2,0),vec3(worldWidth/2,hy+thickness/2,0),vec3(worldWidth/2,hy-thickness/2,0),vec3(-worldWidth/2,hy-thickness/2,0),inkColor);
  m.doubleSided=true;o.setMesh(m);o.pos3D=render3D.camera.pos.add(render3D.camera.getForward().scale(89.4));o.rotation3D=render3D.camera.rotation.copy();o.size3D=vec3(worldWidth,ortho,.1);o.color=new Color(1);o.lighting=false;o.transparent=true;
}
function syncDesignLighting(){
  const enabled=isDesignPlayground()?designPlayground.values.shadows.enabled:controlFeatures.enabled('pieceShadows');
  render3D.shadows=enabled;
  for(const object of [...blockObjects,...extrusionObjects,...extrusionOutlines]){object.emissive=1;object.shader=enabled?pieceShadowShader:undefined;object.castShadow=false;object.receiveShadow=enabled}
  // The solid prisms cast shadows. Decorative top overlays and the offset front
  // faces only receive them, avoiding multiple almost-coplanar shadow layers.
  for(const object of extrusionOutlines)object.castShadow=enabled;
  for(const group of groups)if(!group.depth)for(const object of group.objects)object.castShadow=enabled;
  movementMarkers?.setShadowShader(enabled?pieceShadowShader:undefined);
  for(const part of pomParts){part.emissive=1;part.shader=enabled?pieceShadowShader:undefined;part.castShadow=enabled&&part===playerObject;part.receiveShadow=enabled}
  for(const part of [flagPole,flagCloth,flagVase,flagCap,flagPrint].filter(Boolean)){part.emissive=1;part.shader=enabled?pieceShadowShader:undefined;part.castShadow=enabled&&!!part.mesh&&part!==flagPrint;part.receiveShadow=enabled}
  if(!enabled){
    shadowFloor?.destroy();shadowFloor=undefined;render3D.sunDirection=vec3(-.45,.8,.5);render3D.sunColor=new Color(1,.91,.75);render3D.ambientColor=new Color(.52,.51,.4);render3D.ambientGroundColor=new Color(.35,.4,.3);return;
  }
  const shadows=currentDesign().shadows,azimuth=shadows.direction*Math.PI/180,elevation=shadows.elevation*Math.PI/180,strength=shadows.strength;
  render3D.sunDirection=vec3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation));
  render3D.sunColor=new Color(strength,strength,strength);render3D.ambientColor=new Color(1-strength,1-strength,1-strength);render3D.ambientGroundColor=render3D.ambientColor;
  render3D.shadowSoftness=shadows.softness;render3D.shadowBias=.0008;render3D.shadowMapSize=2048;const visual=puzzleVisualBounds();render3D.shadowRange=Math.max(visual.right-visual.left,visual.height)+6;render3D.shadowCenter=worldPoint((visual.left+visual.right)/2,visual.height/2,1.5);
  if(!shadowFloor){
    const mesh=new Mesh();mesh.addQuad(vec3(-1,0,-1),vec3(1,0,-1),vec3(1,0,1),vec3(-1,0,1));mesh.doubleSided=true;
    shadowFloor=makeSurface(vec3(),mesh,new Color(1));shadowFloor.scale3D=vec3((W+8)/2,1,5);shadowFloor.shader=groundShadowShader;shadowFloor.transparent=true;shadowFloor.castShadow=false;shadowFloor.receiveShadow=true;
  }
  // The receiver begins in front of the wall (z > 0), below the horizon plane.
  // Its projection therefore cannot paint the sky, even after panning or zooming.
  shadowFloor.scale3D=vec3((visual.right-visual.left+8)/2,1,4);shadowFloor.pos3D=worldPoint((visual.left+visual.right)/2,-.008,4.025);
}
let pulsePiece=null,pulseStart=0;
const reducedSelectionMotion=matchMedia('(prefers-reduced-motion:reduce)');
function selectedSurfaceColor(g,now=performance.now()){
  const color=palette[g.color];if(g!==selected||won)return color;
  if(pulsePiece!==g){pulsePiece=g;pulseStart=now}
  const phase=(1-Math.cos((now-pulseStart)*Math.PI*2/1400))/2;
  return tinted(color,reducedSelectionMotion.matches?.12:.26*phase);
}
function syncBlocks(){for(const g of groups)for(let i=0;i<g.cells.length;i++){const c=g.cells[i],o=g.objects[i],pose=blockPose(c,g.depth),face=selectedSurfaceColor(g);o.pos3D=vec3(pose.pos.x,pose.pos.y,pose.pos.z+.025);o.scale3D=vec3(1,stretchY(1),1);o.color=face}syncExtrusions();syncFloorGrid();syncDesignLighting()}
function worldPosition(n,offset=.5){const top=n.y===H?0:H-n.y;return worldPoint(n.x+.5,top+.22,n.z+offset)}
function syncBackground(){
  if(cameraLab){
    for(const object of backgroundObjects.slice(0,3)){object.mesh=undefined;object.tileInfo=undefined}
    if(gameReady)requestLevelEnvironment();
    if(activeEnvironmentTextures){
      const reference=cameraScenery.update({state:cameraLab.state,environment:activeEnvironment,textures:activeEnvironmentTextures,width:W,height:H,yaw:cameraYaw(),target:cameraFocus??viewTarget??sceneFrame(wrap.clientWidth,wrap.clientHeight).target});
      const size=vec2(wrap.clientWidth,wrap.clientHeight),points=reference.points.map(point=>render3D.worldToScreen(point,size)),[left,center,right]=points;
      const valid=points.every(point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y));
      const slope=valid?(right.y-left.y)/(right.x-left.x||1):0,y=valid?(reference.curved?center.y:center.y+slope*(size.x/2-center.x)):NaN;
      cameraLab.measure({percent:y/size.y*100,tilt:Math.atan(slope)*180/Math.PI,curved:reference.curved,unit:viewUnit||size.y/viewSpan(),cameraHeight:render3D.camera.pos.y});
    }
    wrap.dataset.environment=activeEnvironment.id;wrap.dataset.scenerySetting=cameraLab.state.setting;return;
  }
  const width=wrap.clientWidth,height=wrap.clientHeight,ratio=width/height,cam=render3D.camera,forward=cam.getForward(),up=cam.getUp(),right=cam.getRight(),ortho=cam.orthographic,worldWidth=ortho*ratio;
  if(!activeEnvironmentTextures||backgroundObjects.length<2)return;
  if(gameReady)requestLevelEnvironment();
  render3D.updateMatrices(ratio);const base=render3D.worldToScreen(vec3(4,0,0),vec2(width,height)),groundQ=base?(height/2-base.y)*ortho/height:-ortho*.28;if(base)wrap.style.setProperty('--horizon-y',`${Math.max(0,Math.min(100,base.y/height*100))}%`);
  const place=(o,distance,x,y,w,h)=>{o.pos3D=cam.pos.add(forward.scale(distance)).add(right.scale(x)).add(up.scale(y));o.scale3D=vec3(w,h,.012);o.rotation3D=cam.rotation.copy()};
  const frame=environmentFrame(activeEnvironment,{ortho,worldWidth,groundQ}),preview=currentBackgroundConfiguration();
  const sky=backgroundObjects[0],ground=backgroundObjects[1];
  for(const [index,object]of [sky,ground].entries()){const visible=!preview||preview.layers==='both'||preview.layers===(index?'foreground':'background');object.mesh=visible||index===0?box:undefined;object.tileInfo=visible?activeEnvironmentTextures[index]:undefined;if(index===0)object.color=visible?new Color(1):designColor('#eee8fa')}
  place(sky,90,0,frame.backgroundY,frame.backgroundHeight*activeEnvironment.aspectRatio,frame.backgroundHeight);
  place(ground,89.7,0,frame.foregroundY,frame.foregroundHeight*activeEnvironment.aspectRatio,frame.foregroundHeight);ground.color=new Color(1,1,1,activeEnvironment.foregroundOpacity);
  const overlay=backgroundObjects[2],overlayMesh=new Mesh(),horizon=Math.max(-ortho/2,Math.min(ortho/2,groundQ));
  // The divider is the same projected ground plane used by the floor guide.
  // Paint behind the puzzle and floor/shadows, independent of image cropping.
  if(preview)for(const [id,top,bottom]of [['background',ortho/2,horizon],['foreground',horizon,-ortho/2]]){
    const setting=preview.overlays[id];if(setting.opacity<=0||top<=bottom)continue;
    const color=designColor(setting.color);color.a=setting.opacity;
    overlayMesh.addQuad(vec3(-worldWidth/2,top,0),vec3(worldWidth/2,top,0),vec3(worldWidth/2,bottom,0),vec3(-worldWidth/2,bottom,0),color);
  }
  overlayMesh.doubleSided=true;overlay.mesh=preview?overlayMesh:undefined;place(overlay,89.55,0,0,1,1);
  wrap.dataset.environment=activeEnvironment.id;wrap.dataset.environmentVariant=activeEnvironment.variant??'legacy';wrap.dataset.groundAnchor=String(activeEnvironment.groundAnchorY);wrap.dataset.backgroundLayers=preview?.layers??'both';
  wrap.dataset.sceneryOverlays=JSON.stringify(preview?{...preview.overlays,horizonY:(.5-horizon/ortho)*height}:null);
  wrap.dataset.backgroundFrame=JSON.stringify({width:frame.backgroundHeight*activeEnvironment.aspectRatio*height/ortho,height:frame.backgroundHeight*height/ortho,left:width/2-frame.backgroundHeight*activeEnvironment.aspectRatio*height/ortho/2,top:height/2-(frame.backgroundY+frame.backgroundHeight/2)*height/ortho});
}
function syncPlayer(){resetPomShape();const p=worldPosition(player),jump=celebration?.jump??0;playerObject.pos3D=p.add(vec3(celebration?.pomOffset??0,stretchY(jump),0)).add(render3D.camera.getForward().scale(-.045));playerObject.rotation3D=render3D.camera.rotation.copy();playerObject.scale3D=vec3(.72*(1-jump*.2),.56*(1+jump*.2),.018);syncPomMatrix()}
function syncFlag(){
  const g=byCell[goalCell.y]?.[goalCell.x];if(!flagPole||!g)return;
  const raised=g.depth>0,cx=goalCell.x+.5,cy=H-goalCell.y-.5;
  // The front-face badge disappears together with its flag when the piece rises.
  flagPrint.mesh=raised?undefined:flagMeshes.print;flagPrint.pos3D=vec3(cx,stretchY(cy),.032);flagPrint.scale3D=vec3(1,stretchY(1),1);
  for(const [part,mesh]of [[flagPole,flagMeshes.pole],[flagCloth,flagMesh],[flagVase,flagMeshes.vase],[flagCap,flagMeshes.cap]]){
    part.mesh=raised?mesh:undefined;part.rotation3D=vec3();part.scale3D=vec3(1,stretchY(1),1);part.castShadow=raised&&render3D.shadows;
  }
  if(!raised)return;
  // Center the flag in the landing square. Pom's final hop makes room for it.
  const base=worldPoint(cx,H-goalCell.y,g.depth-.5);
  flagVase.pos3D=base.add(vec3(0,stretchY(.005),0));
  flagPole.pos3D=base.add(vec3(0,stretchY(.43),0));flagPole.scale3D=vec3(1,stretchY(1),1);
  flagCloth.pos3D=base.add(vec3(.19,stretchY(.65),.006));flagCloth.scale3D=vec3(.38,stretchY(.24),1);
  flagCap.pos3D=base.add(vec3(0,stretchY(.78),0));
}
function updateUI(){
  cameraLab?.setBusy(busy||won||introPlaying);
  wrap.classList.toggle('no-piece-selected',!selected);
  document.querySelector('#levelSettings').disabled=busy||won||introPlaying;
  document.querySelector('.control-deck').inert=won;
  document.querySelector('#level-number').textContent=activeLevel.userPuzzle?'★':String(activeLevel.number).padStart(2,'0');document.querySelector('#levelBadge').setAttribute('aria-label',`Level ${activeLevel.number}`);document.querySelector('#level-title').textContent=activeLevel.name;document.querySelector('#exitLevel').disabled=false;
  document.querySelector('#pull').disabled=busy||won||introPlaying||!selected||!canReach(selected)||selected.depth>=3||!safeManipulation(selected,selected.depth+1,1);
  document.querySelector('#push').disabled=busy||won||introPlaying||!selected||!canReach(selected)||selected.depth<=0||!safeManipulation(selected,selected.depth-1,-1);
  document.querySelector('#undo').disabled=busy||!history.length;
  document.querySelector('#reset').disabled=busy||(!history.length&&!won&&!groups.some(g=>g.depth));
  document.querySelector('#studioControls').hidden=!activeLevel.previewMove;document.querySelector('#previewClimb').disabled=busy;document.querySelector('#movementCase').disabled=busy;
  if(activeLevel.studioExample)document.querySelector('#movementCase').value=activeLevel.studioExample.id;
  if(studioTargetObject){studioTargetObject.color=new Color(1,.95,.73,activeLevel.previewMove ? .85 : 0);if(activeLevel.previewMove)studioTargetObject.pos3D=standingSpotCenter(activeLevel.previewMove)}
  syncInteractionHelp();
  viewControls.update(viewSide,viewHeightStep);viewControls.setDisabled(busy||won||introPlaying);
  const color=selected?palette[selected.color]:null;wrap.style.setProperty('--block-color',color?`rgb(${Math.round(color.r*255)} ${Math.round(color.g*255)} ${Math.round(color.b*255)})`:'#eee8fa');
  wrap.style.setProperty('--block-ink',color?blockActionText(color):'#292537');
  syncBlocks();syncPlayer();syncFlag();syncMovementMarkers();
}
function syncMovementMarkers(){
  if(!movementMarkers)return;
  if(!movementMarkersEnabled()||won||introPlaying){movementMarkers.dispose();return}
  movementMarkers.sync(standableReachable().filter(p=>p.y<H),standingSpotCenter,p=>platformTopColor(byCell[p.y][p.x],p.x,p.z),stretchY);
}
function pickMovementMarker(ray){return movementMarkersEnabled()?movementMarkers?.pick(ray,[...blockObjects,...extrusionObjects,...extrusionOutlines]):null}
function hideHelp(){clearTimeout(toastTimer);toastTimer=undefined;helpKind=null;const el=document.querySelector('#toast');el.classList.remove('on');el.textContent=''}
function showHelp(text,kind,duration=4800){
  if(levelPreferences.hideHelpText)return false;
  hideHelp();helpKind=kind;const el=document.querySelector('#toast');el.textContent=text;el.classList.add('on');
  toastTimer=setTimeout(()=>{hideHelp();if(kind==='intro')syncInteractionHelp()},duration);return true;
}
function syncInteractionHelp(){
  if(busy||won||introPlaying||document.querySelector('.stage').inert||!document.querySelector('#menuScreen').hidden)return;
  const pieces=groups.filter(canInteract);
  if(pieces.length<2){interactionHelpKey=null;if(helpKind==='choices')hideHelp();return}
  if(helpKind==='intro')return;
  // Explain a new set of choices once, rather than on every selection or pull.
  const key=`${activeLevel.id}:${pieces.map(g=>g.id).sort().join(',')}`;
  if(key!==interactionHelpKey&&showHelp('Pom can push or pull more than one piece here. Choose a piece by tapping its front or side.','choices'))interactionHelpKey=key;
}
function showOpeningHelp(){
  if(introPlaying)return;
  if(!openingHelpShown&&!isPreviewLevel(activeLevel)&&showHelp('Pull the blocks out to make steps, then guide Pom to the flag.','intro',6500))openingHelpShown=true;
  else syncInteractionHelp();
}
function showMenu(panel='title',completedLevelId,{preserveVictoryTransition=false,deferCheck=false}={}){
  if(isMakerPlaytest)return Promise.resolve(null);
  if(!preserveVictoryTransition)victoryEffects.reset();
  let cardReady=Promise.resolve(null);
  syncScreenAppearance(panel==='title'?'home':panel);
  hideHelp();interactionHelpKey=null;stopIntro();celebration=null;viewControls.close();
  const menu=document.querySelector('#menuScreen');menu.hidden=false;menu.classList.toggle('is-levels',panel==='levels');menu.classList.toggle('is-settings',panel==='settings');
  for(const name of ['title','levels','settings'])document.querySelector(`#${name}Panel`).hidden=panel!==name;
  document.querySelector('#clearProgressConfirm').hidden=true;document.querySelector('#clearProgress').hidden=false;document.querySelector('#progressMessage').textContent='';
  if(panel==='levels'){
    renderLevelList(completedLevelId);document.querySelector('#levelList').scrollTop=0;
    if(completedLevelId)cardReady=new Promise(resolve=>requestAnimationFrame(()=>{
      if(menu.hidden||!menu.classList.contains('is-levels')){resolve(null);return}
      const list=document.querySelector('#levelList'),card=[...list.querySelectorAll('.level-card')].find(card=>card.dataset.levelId===completedLevelId);
      if(!card){resolve(null);return}
      const rect=card.getBoundingClientRect(),listRect=list.getBoundingClientRect();
      list.scrollTop+=rect.top-listRect.top-(list.clientHeight-rect.height)/2;
      if(!deferCheck){card.focus({preventScroll:true});card.classList.add('is-just-completed')}
      resolve(card);
    }));
  }
  if(panel==='settings'){document.querySelector('#settingsHome').setAttribute('aria-label',settingsReturnToLevel?'Back to level':'Back to home');updateProgressSettings()}
  document.querySelector('.stage').classList.remove('is-won');document.querySelector('.stage').inert=true;
  if(panel==='settings')document.querySelector('#settingsHome').focus();
  return cardReady;
}
function levelIsAvailable(level){return level.compatibility.playable&&(!levelPreferences.hideKnownIssues||!level.knownIssues)}
function renderLevelList(revealLevelId){
  if(isMakerPlaytest)return;
  levelGridObserver.disconnect();
  const list=document.querySelector('#levelList'),scroll=list.scrollTop,gallery=document.createElement('div');gallery.className='level-gallery';list.replaceChildren(gallery);
  for(const [index,group]of levelGroups.entries()){
    const groupLevels=levels.filter(level=>level.group===group.id);
    const section=document.createElement('section');section.className='level-group';section.setAttribute('aria-labelledby',`levelGroup${index}`);
    const header=document.createElement('header');header.className='level-group-header';
    const heading=document.createElement('h2');heading.id=`levelGroup${index}`;heading.textContent=group.name;
    const range=document.createElement('span');range.className='level-group-range';range.textContent=group.rangeLabel??(groupLevels.length?`${String(groupLevels[0].number).padStart(2,'0')}–${groupLevels.at(-1).number}`:'');header.append(heading,range);
    const items=document.createElement('div');items.className='level-group-items';
    for(const level of groupLevels.filter(level=>level.id===revealLevelId||levelIsAvailable(level))){
      const issues=level.knownIssues,completed=levelProgress.has(level.id);
      const button=document.createElement('button');button.type='button';button.className='level-card';button.dataset.levelId=level.id;button.classList.toggle('has-known-issues',issues);button.setAttribute('aria-label',`Level ${level.number}: ${level.name}`);
      const number=document.createElement('span');number.className='card-number';number.textContent=String(level.number).padStart(2,'0');number.setAttribute('aria-hidden','true');
      const details=document.createElement('span');details.className='level-details';const name=document.createElement('strong');name.textContent=level.name;details.append(name);const preview=document.createElement('span');preview.className='level-preview';preview.append(puzzleThumbnail(level.kind==='movement-studio'?studioLevel(levels,movementExamples[0]):level),number);const caption=document.createElement('span');caption.className='level-card-caption';caption.append(details);button.append(preview,caption);
      if(completed){const check=document.createElement('span');check.className='completion-mark';check.classList.toggle('is-pending',level.id===revealLevelId);check.textContent='✓';check.setAttribute('aria-hidden','true');preview.append(check)}
      if(issues||completed){
        const badges=document.createElement('span');badges.className='level-badges';badges.id=`levelStatus${level.id}`;
        for(const [show,label,tone]of [[completed,'Completed','completed'],[issues,'Known issues','issues']])if(show){const status=document.createElement('span');status.className=`level-status is-${tone}`;status.textContent=label;badges.append(status)}
        button.setAttribute('aria-describedby',badges.id);preview.append(badges);
      }
      button.addEventListener('click',()=>startLevel(level.id));items.append(button);
    }
    if(items.childElementCount){const frame=document.createElement('div');frame.className='level-grid';const outline=document.createElementNS(svgNS,'svg');outline.setAttribute('class','level-grid-outline');outline.setAttribute('aria-hidden','true');outline.setAttribute('focusable','false');frame.append(items,outline);section.append(header,frame);gallery.append(section);levelGridObserver.observe(items)}
  }
  myPuzzles.render(gallery,revealLevelId,levelGridObserver);
  list.scrollTop=scroll;
}
function updateProgressSettings(){
  document.querySelector('#progressCount').textContent=`${levelProgress.count} of ${levels.filter(level=>!isPreviewLevel(level)).length} levels completed`;
  document.querySelector('#clearProgress').disabled=levelProgress.count===0;
  if(!progressSaved)document.querySelector('#progressMessage').textContent='Your browser could not save progress. Check that site storage is allowed.';
}
function recordCompletedLevel(){if(cameraLab)return;if(activeLevel.userPuzzle){myPuzzles.complete(activeLevel);return}progressSaved=levelProgress.complete(activeLevel.id);const menu=document.querySelector('#menuScreen');if(!menu.hidden&&menu.classList.contains('is-levels'))renderLevelList();updateProgressSettings()}
function resetLevelState(level){
  victoryEffects.reset();
  activeLevel=level;document.querySelector('.stage').classList.toggle('is-design',isDesignPlayground());document.querySelector('.stage').classList.toggle('has-studio-panel',!cameraLab&&isPreviewLevel(level));document.querySelector('#designPanel').hidden=!isDesignPlayground();document.querySelector('#backgroundPanel').hidden=!isBackgroundStudio();useLevelPalette(level);W=level.width;H=level.height;mural=level.grid.map(row=>[...row]);goalCell={...level.goal};
  clearMovementRoutes();followAnchor=undefined;
  groups=[];byCell=Array.from({length:H},()=>Array(W).fill(null));makeGroups();player={x:level.start.x,y:level.start.y??H,z:level.start.z};selected=null;hovered=null;history=[];won=false;busy=false;falling=false;viewSide=DEFAULT_VIEW.horizontal;viewHeightStep=0;viewPitch=cameraPitch();viewControls.close();cameraLab?.setLevel(level.id);celebration=null;
  hideHelp();interactionHelpKey=null;setUmbrellaVisible(false);rebuildBlockMeshes();autoSelectNearbyPiece();updateUI();startBoardView();requestLevelEnvironment();
}
function playUserPuzzle(level){if(!gameReady)return;syncScreenAppearance('game');document.querySelector('.stage').classList.remove('is-won');document.querySelector('#menuScreen').hidden=true;document.querySelector('.stage').inert=false;resetLevelState(level)}
function startLevel(id){if(!gameReady||isMakerPlaytest)return;let level=levels.find(item=>item.id===id);if(!level||!level.compatibility.playable)return;if(level.kind==='movement-studio')level=studioLevel(levels,movementExamples[0]);syncScreenAppearance('game');document.querySelector('.stage').classList.remove('is-won');document.querySelector('#menuScreen').hidden=true;document.querySelector('.stage').inert=false;resetLevelState(level);showOpeningHelp()}
document.querySelector('#openLevels').addEventListener('click',()=>showMenu('levels'));
document.querySelector('#openSettings').addEventListener('click',()=>{settingsReturnToLevel=false;showMenu('settings')});
document.querySelector('#levelSettings').addEventListener('click',()=>{if(busy||won||introPlaying)return;settingsReturnToLevel=true;showMenu('settings')});
function syncControlFeatureInputs(){
  for(const feature of CONTROL_FEATURES){const input=document.querySelector(`#${feature.id}`);if(input)input.checked=controlFeatures.enabled(feature.id)}
  const appearance=document.querySelector('#topFaceAppearance');if(appearance)appearance.value=controlFeatures.topFaceStyle;
}
for(const feature of CONTROL_FEATURES){
  if(feature.id==='walkabilityTopFaces')continue;
  if(feature.id==='pullDepthColors'){
    const row=document.createElement('label');row.className='setting-toggle';
    const text=document.createElement('span');text.textContent='Top-face appearance';
    const help=document.createElement('small');help.id='topFaceAppearanceHelp';help.textContent='Choose checkerboard, pull-distance colors, or a grid with diagonal lines on platforms Pom cannot reach.';text.append(help);
    const choice=document.createElement('select');choice.id='topFaceAppearance';choice.setAttribute('aria-label','Top-face appearance');choice.setAttribute('aria-describedby',help.id);
    for(const [id,name]of TOP_FACE_STYLES){const option=document.createElement('option');option.value=id;option.textContent=name;choice.append(option)}choice.value=controlFeatures.topFaceStyle;
    choice.onchange=()=>{const saved=controlFeatures.setTopFaceStyle(choice.value);refreshControlFeatures();document.querySelector('#controlFeatureMessage').textContent=saved?'':'This setting applies now, but could not be saved in this browser.'};
    row.append(text,choice);document.querySelector('#controlFeatureToggles').append(row);continue;
  }
  const label=document.createElement('label');label.className='setting-toggle';
  const text=document.createElement('span');text.textContent=feature.label;
  const help=document.createElement('small');help.id=`${feature.id}Help`;help.textContent=feature.description;text.append(help);
  const toggle=document.createElement('input');toggle.type='checkbox';toggle.id=feature.id;toggle.setAttribute('role','switch');toggle.setAttribute('aria-label',feature.label);toggle.setAttribute('aria-describedby',help.id);toggle.checked=controlFeatures.enabled(feature.id);
  toggle.addEventListener('change',()=>{const saved=controlFeatures.set(feature.id,toggle.checked);refreshControlFeatures(feature.id==='autoSelectPieces'&&toggle.checked);document.querySelector('#controlFeatureMessage').textContent=saved?'':'This control applies now, but could not be saved in this browser.'});
  label.append(text,toggle);document.querySelector('#controlFeatureToggles').append(label);
}
function refreshControlFeatures(selectNearby=false){
  clearBoardHover();if(!gameReady)return;
  if(selectNearby&&!busy){autoSelectNearbyPiece();updateUI()}
  else{syncBlocks();syncMovementMarkers()}
}
window.addEventListener('storage',event=>{if(event.key===controlFeatures.key||event.key===null){const wasAutomatic=controlFeatures.enabled('autoSelectPieces');controlFeatures.reload();syncControlFeatureInputs();refreshControlFeatures(!wasAutomatic&&controlFeatures.enabled('autoSelectPieces'))}});
for(const name of ['hideKnownIssues','hideHelpText']){
  const toggle=document.querySelector(`#${name}`);toggle.checked=levelPreferences[name];
  toggle.addEventListener('change',()=>{const saved=levelPreferences.set(name,toggle.checked);document.querySelector('#preferenceMessage').textContent=saved?'':'This setting applies now, but could not be saved in this browser.';syncHelpVisibility();if(name==='hideKnownIssues')renderLevelList()});
}
window.addEventListener('storage',event=>{if(event.key===levelPreferences.key||event.key===null){levelPreferences.reload();for(const name of ['hideKnownIssues','hideHelpText'])document.querySelector(`#${name}`).checked=levelPreferences[name];syncHelpVisibility();renderLevelList()}});
document.querySelector('#settingsHome').addEventListener('click',()=>{
  if(!settingsReturnToLevel){showMenu('title');return}
  settingsReturnToLevel=false;document.querySelector('#menuScreen').hidden=true;document.querySelector('.stage').inert=false;syncScreenAppearance('game');updateUI();document.querySelector('#levelSettings').focus();
});
document.querySelector('#clearProgress').addEventListener('click',()=>{document.querySelector('#clearProgress').hidden=true;document.querySelector('#clearProgressConfirm').hidden=false;document.querySelector('#cancelClearProgress').focus()});
document.querySelector('#cancelClearProgress').addEventListener('click',()=>{document.querySelector('#clearProgressConfirm').hidden=true;document.querySelector('#clearProgress').hidden=false;document.querySelector('#clearProgress').focus()});
document.querySelector('#confirmClearProgress').addEventListener('click',()=>{
  const message=document.querySelector('#progressMessage');
  if(!levelProgress.clear()){message.textContent='Your browser could not clear progress. Check that site storage is allowed.';return}
  progressSaved=true;renderLevelList();updateProgressSettings();document.querySelector('#clearProgressConfirm').hidden=true;document.querySelector('#clearProgress').hidden=false;message.textContent='Your progress has been cleared.';document.querySelector('#settingsHome').focus();
});
window.addEventListener('storage',event=>{if(event.key===levelProgress.key||event.key===null){levelProgress.reload();renderLevelList();updateProgressSettings();if(levelProgress.count===0){document.querySelector('#clearProgressConfirm').hidden=true;document.querySelector('#clearProgress').hidden=false}}});
document.querySelector('#backTitle').addEventListener('click',()=>showMenu('title'));
document.querySelector('#exitLevel').addEventListener('click',()=>isMakerPlaytest?returnToMaker():showMenu('levels',won?activeLevel.id:undefined));
const menuScreen=document.querySelector('#menuScreen'),levelList=document.querySelector('#levelList');
window.addEventListener('wheel',e=>{
  if(menuScreen.hidden||!menuScreen.classList.contains('is-levels'))return;
  const unit=e.deltaMode===1?16:e.deltaMode===2?levelList.clientHeight:1;
  if(e.deltaY)levelList.scrollTop+=e.deltaY*unit;
  e.preventDefault();e.stopPropagation();
},{capture:true,passive:false});
const creatorUrl=deploymentUrls().creator;
const myPuzzles=isMakerPlaytest?{render(){},complete(){},openPending(){
  try{const level={...puzzleLevel(decodePuzzle(makerPlaytestToken)),temporaryPlaytest:true};playUserPuzzle(level);playtestLoading.remove()}
  catch{playtestLoading.replaceChildren(document.createTextNode('This playtest could not be opened. '));const back=document.createElement('button');back.className='btn';back.textContent='Back to editor';back.onclick=returnToMaker;playtestLoading.append(back)}
}}:createMyPuzzles({play:playUserPuzzle,onChange:()=>{if(document.querySelector('#levelsPanel').hidden===false)renderLevelList()},creatorUrl});
renderLevelList();
function puzzleVisualBounds(){
  if(!activeLevel.userPuzzle)return{left:0,right:W,height:H};
  const floor=puzzleFloorBounds(mural,GRID_DEPTH),cells=groups.flatMap(g=>g.cells);
  return{left:Math.min(floor.left,activeLevel.start.x-.5),right:Math.max(floor.right,activeLevel.start.x+1.5),height:Math.max(1,...cells.map(c=>H-c.y),H-activeLevel.start.y)};
}
function applyCameraStudy({refit=false,orbit=false,centerPom=false}={}){
  if(!gameReady||busy||won)return;
  stopIntro();viewPitch=cameraPitch();viewTouched=true;keepInterruptedView=false;
  // Orbiting or tracking moves the camera; straight board geometry stays put.
  if(!orbit){refreshCellSquareness();syncBlocks();syncFlag();syncHoverSpot();syncPlayer();syncMovementMarkers()}
  if(refit){const frame=sceneFrame(wrap.clientWidth,wrap.clientHeight);viewUnit=wrap.clientHeight/frame.height;viewTarget=frame.target;baseCameraHeight=frame.height;viewTouched=false}
  if(centerPom){viewTarget=worldPosition(player);cameraLab.state.truck=0}
  requestLevelEnvironment();applyBoardView(false);resetStudyFollow({paused:!centerPom});if(!orbit)updateUI();
  wrap.dataset.projection=cameraLab.state.projection;wrap.dataset.cameraYaw=String(cameraYaw());
}
function studyFrame(width,height){
  const visual=puzzleVisualBounds(),floor=puzzleFloorBounds(mural,GRID_DEPTH),cx=(visual.left+visual.right)/2,cy=(visual.height+.85)/2,cz=1.5,points=[];
  // One conservative scale across presets allows a fair camera comparison.
  for(const yaw of [-40,0,40].map(degrees=>degrees*Math.PI/180))for(const pitch of [0,.38,Math.PI/4])for(const skew of [-DEPTH_SKEW,0,DEPTH_SKEW]){
    const project=(x,y,z)=>{x=x+skew*z-cx;y-=cy;z-=cz;return [Math.cos(yaw)*x-Math.sin(yaw)*z,Math.cos(pitch)*y-Math.sin(pitch)*(Math.sin(yaw)*x+Math.cos(yaw)*z)]};
    for(const x of [Math.min(floor.left,visual.left),Math.max(floor.right,visual.right)])for(const y of [0,visual.height+.85])for(const z of [0,4])points.push(project(x,y,z));
  }
  const halfX=Math.max(...points.map(p=>Math.abs(p[0]))),halfY=Math.max(...points.map(p=>Math.abs(p[1]))),top=24,bottom=82,margin=20;
  const unit=Math.max(1,Math.min(80,(width-margin*2)/(halfX*2),(height-top-bottom)/(halfY*2)));
  const yaw=cameraYaw(),up=vec3(-Math.sin(yaw)*Math.sin(viewPitch),Math.cos(viewPitch),-Math.cos(yaw)*Math.sin(viewPitch));
  return{height:height/unit,target:vec3(cx,cy,cz).add(up.scale((top-bottom)/(2*unit))),minX:-halfX,maxX:halfX,minY:-halfY,maxY:halfY,top,bottom,margin};
}
function syncStudyFloor(){
  const object=backgroundObjects.at(-1);if(!object)return;
  // Keep the transparent guide layer registered when hidden. Removing its mesh
  // changes the engine's transparent pass and can hide the character overlay.
  const mesh=new Mesh(),bounds=puzzleFloorBounds(mural,GRID_DEPTH),line=.018,tint=new Color(.28,.32,.25,cameraLab.state.guides ? .5 : 0);
  const strip=(x0,z0,x1,z1)=>mesh.addQuad(worldPoint(x0,.008,z0),worldPoint(x1,.008,z0),worldPoint(x1,.008,z1),worldPoint(x0,.008,z1),tint);
  for(let x=bounds.left;x<=bounds.right;x++)strip(x-line/2,bounds.back,x+line/2,bounds.front);
  for(let z=bounds.back;z<=bounds.front;z++)strip(bounds.left,z-line/2,bounds.right,z+line/2);
  mesh.doubleSided=true;object.mesh=mesh;object.pos3D=vec3();object.rotation3D=vec3();object.scale3D=vec3(1);object.tileInfo=undefined;object.color=new Color(1);object.transparent=true;
}
function sceneFrame(width,height,side=viewSide){
  if(cameraLab)return studyFrame(width,height);
  const c=Math.cos(viewPitch),s=Math.sin(viewPitch),points=[];
  const floor=puzzleFloorBounds(mural,GRID_DEPTH),visual=puzzleVisualBounds();
  // Reserve one fixed frame for all six angles, so rotating never recenters or zooms the wall.
  for(const pitch of CAMERA_PITCHES)for(const slant of [-1,1]){
    const sn=Math.sin(pitch),cs=Math.cos(pitch);
    for(const x of [floor.left,floor.right])for(const z of [floor.back,floor.front])points.push([x+slant*DEPTH_SKEW*z,-sn*z]);
    for(const x of [visual.left,visual.right])for(const y of [0,visual.height+.85])for(const z of [0,3])points.push([x+slant*DEPTH_SKEW*z,cs*y-sn*z]);
  }
  const centerX=(visual.left+visual.right)/2,halfWidth=Math.max(...points.map(p=>Math.abs(p[0]-centerX))),minX=centerX-halfWidth,maxX=centerX+halfWidth,minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
  const action=document.querySelector('.canvas-actions'),actionHeight=action.getBoundingClientRect().height,buttonBottom=parseFloat(getComputedStyle(action).bottom)||12;
  const top=Math.min(64,height*.16),bottom=Math.min(actionHeight+buttonBottom+22,height*.34),margin=width<600?14:24;
  const unit=Math.max(1,Math.min(80,(width-2*margin)/(maxX-minX),(height-top-bottom)/(maxY-minY)));
  const targetY=(minY+maxY)/2+(top-bottom)/(2*unit);
  return {height:height/unit,target:vec3((minX+maxX)/2,(targetY+s)/c,1),minX,maxX,minY,maxY,top,bottom,margin};
}
function fitCamera(width,height){return sceneFrame(width,height).height}
function configureStudyCamera(span,target,yaw,pitch){
  cameraFrameHeight=span;cameraFocus=target.copy();
  const camera=render3D.camera,perspective=studyPerspective();
  camera.orthographic=perspective?0:span;
  if(perspective)camera.fov=cameraLab.state.fov*Math.PI/180;
  const distance=perspective?Math.max(2,span/(2*Math.tan(camera.fov/2))):15;
  camera.orbit(target,distance,yaw,pitch);
}
function positionCameraForView(side,targetOverride){
  let target=targetOverride||sceneFrame(wrap.clientWidth,wrap.clientHeight,side).target;
  if(cameraLab?.state.motion==='track'&&studyStraight())target=target.add(vec3(cameraLab.state.truck*W/100,0,0));
  const span=viewUnit>0?wrap.clientHeight/viewUnit:(baseCameraHeight||render3D.camera.orthographic);
  configureStudyCamera(span,target,cameraYaw(),viewPitch);
}
function resetStudyFollow({paused=true}={}){
  if(!cameraLab||!playerObject||!viewTarget)return;
  followAnchor={paused};followTime=timeReal;wrap.dataset.cameraFollowPaused=String(paused);
}
function resumeStudyFollow(){
  if(!studyStraight()||(!cameraLab.state.followX&&!cameraLab.state.followY))return;
  // A gameplay move ends inspection. Do not retain a pan or tracking offset as
  // Pom's new screen position; ease the enabled axes back to the canvas center.
  if(cameraLab.state.motion==='track'&&cameraLab.state.truck)viewTarget=cameraFocus.copy();
  cameraLab.state.truck=0;resetStudyFollow({paused:false});
}
function updateStudyFollow(){
  if(!cameraLab||!studyStraight()||(!cameraLab.state.followX&&!cameraLab.state.followY)||!viewReady||!gameReady||won||celebration||!document.querySelector('#menuScreen').hidden)return;
  if(!followAnchor){resetStudyFollow();return}
  if(followAnchor.paused)return;
  const dt=Math.min(.1,Math.max(0,timeReal-followTime));followTime=timeReal;if(!dt)return;
  const camera=render3D.camera,position=busy?playerObject.pos3D.add(camera.getForward().scale(.045)):worldPosition(player),offset=position.subtract(cameraFocus),right=camera.getRight(),up=camera.getUp();
  // Follow in the camera plane so depth and downward pitch cannot introduce a
  // screen-space offset. Translation leaves camera direction and zoom intact.
  const desired=viewTarget.add(right.scale(cameraLab.state.followX?offset.dot(right):0)).add(up.scale(cameraLab.state.followY?offset.dot(up):0));
  const next=viewTarget.lerp(desired,1-Math.exp(-dt/.18));
  if(next.subtract(viewTarget).length()<.0001)return;
  viewTarget=next;applyBoardView(false);
}
const mobileBoard=()=>wrap.clientWidth<=780||(matchMedia('(pointer:coarse)').matches&&wrap.clientWidth<=1024);
const tappingUnit=()=>32/Math.max(.18,Math.sin(viewPitch));
function stopIntro(){introFrame++;introPlaying=false;introTick=null;document.querySelector('.stage').classList.remove('is-introducing');wrap.dataset.introPhase='ready'}
function finishIntro(){introPlaying=false;introTick=null;document.querySelector('.stage').classList.remove('is-introducing');wrap.dataset.introPhase='ready';autoSelectNearbyPiece();updateUI();if(document.querySelector('#menuScreen').hidden)showOpeningHelp()}
function enterPlayFromIntro(){
  if(!introPlaying)return;
  stopIntro();viewTouched=true;keepInterruptedView=true;finishIntro();
}
function clampBoardView(){
  const width=wrap.clientWidth,height=wrap.clientHeight,f=sceneFrame(width,height),fitUnit=height/f.height;
  viewUnit=Math.max(fitUnit,Math.min(Math.max(tappingUnit(),fitUnit),viewUnit));
  // An interrupted intro can be between the normal framing bounds. Keep that
  // exact view and allow the player's gesture to continue without a camera snap.
  if(keepInterruptedView||cameraLab)return;
  if(viewUnit<=fitUnit*1.001){viewTarget=f.target;return}
  const halfX=(width/2-f.margin)/viewUnit,loX=f.minX+halfX,hiX=f.maxX-halfX;
  viewTarget.x=loX<=hiX?Math.max(loX,Math.min(hiX,viewTarget.x)):(f.minX+f.maxX)/2;
  const loY=f.minY+(height/2-f.bottom)/viewUnit,hiY=f.maxY-(height/2-f.top)/viewUnit,c=Math.cos(viewPitch),sn=Math.sin(viewPitch),projected=viewTarget.y*c-viewTarget.z*sn;
  const y=loY<=hiY?Math.max(loY,Math.min(hiY,projected)):(f.target.y*c-f.target.z*sn);
  viewTarget.y=(y+viewTarget.z*sn)/c;
}
function applyBoardView(clamp=true){
  if(!viewReady||celebration)return;if(clamp)clampBoardView();
  positionCameraForView(viewSide,viewTarget);render3D.updateMatrices(wrap.clientWidth/wrap.clientHeight);
  syncCellGeometry();syncBackground();syncFloorGrid();syncHoverSpot();if(playerObject&&!busy)syncPlayer();
  // Readable, projected dimensions also make responsive checks independent of device pixels.
  wrap.dataset.cameraHorizontal=String(viewSide);wrap.dataset.cameraVertical=String(viewHeightStep);wrap.dataset.cameraPitch=viewPitch.toFixed(2);wrap.dataset.squareWidth=viewUnit.toFixed(2);wrap.dataset.squareDepth=(viewUnit*Math.sin(viewPitch)).toFixed(2);wrap.dataset.view=viewUnit<=wrap.clientHeight/fitCamera(wrap.clientWidth,wrap.clientHeight)*1.001?'full':'zoomed';
  if(cameraLab){wrap.dataset.projection=cameraLab.state.projection;wrap.dataset.cameraMotion=cameraLab.state.motion;wrap.dataset.cameraTruck=String(cameraLab.state.truck);wrap.dataset.cameraFollowing=String(cameraLab.state.followX||cameraLab.state.followY);wrap.dataset.cameraFollowPaused=String(followAnchor?.paused??true);wrap.dataset.cameraTargetX=cameraFocus.x.toFixed(4);wrap.dataset.cameraTargetY=cameraFocus.y.toFixed(4);wrap.dataset.cameraFov=studyPerspective()?String(cameraLab.state.fov):'';wrap.dataset.cameraDistance=render3D.camera.pos.subtract(cameraFocus).length().toFixed(4);wrap.dataset.cameraLens=String(render3D.camera.orthographic);const pom=render3D.worldToScreen(busy?playerObject.pos3D:worldPosition(player),vec2(wrap.clientWidth,wrap.clientHeight));if(pom){wrap.dataset.pomScreenX=(pom.x/wrap.clientWidth*100).toFixed(3);wrap.dataset.pomScreenY=(pom.y/wrap.clientHeight*100).toFixed(3)}}
}
function startBoardView(animate=true){
  stopIntro();keepInterruptedView=false;viewWidth=wrap.clientWidth;viewHeight=wrap.clientHeight;viewMobile=mobileBoard();viewTouched=false;viewReady=true;
  const f=sceneFrame(viewWidth,viewHeight);
  if(activeLevel.studioExample){const a=worldPosition(activeLevel.start),b=worldPosition(activeLevel.previewMove);f.height=Math.max(5.8,4.5*viewHeight/viewWidth,Math.abs(a.y-b.y)+3.2);f.target=a.lerp(b,.5).add(vec3(0,.6,0))}
  const fitUnit=viewHeight/f.height;viewUnit=fitUnit;viewTarget=f.target.copy();baseCameraHeight=f.height;applyBoardView(!activeLevel.studioExample);
  if(isPreviewLevel(activeLevel)||activeLevel.studioExample||!document.querySelector('#menuScreen').hidden){finishIntro();return}
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const token=introFrame,from=viewTarget.copy(),unit=viewMobile?Math.max(fitUnit,tappingUnit()):fitUnit,pom=worldPosition(player),rise=Math.min(1.2,Math.max(0,(viewHeight/2-f.bottom)/unit)/Math.cos(viewPitch));
  const needsZoom=unit>fitUnit*1.01;
  if(cameraLab){viewUnit=fitUnit;viewTarget=f.target;applyBoardView(false);resetStudyFollow();finishIntro();return}
  viewUnit=unit;viewTarget=needsZoom?pom.add(vec3(Math.min(.8,viewWidth/unit*.2),rise,0)):from.copy();clampBoardView();
  const target=viewTarget.copy(),endUnit=viewUnit;
  viewUnit=fitUnit;viewTarget=from;applyBoardView(false);
  if(!animate||reduced){viewUnit=endUnit;viewTarget=target;applyBoardView(false);finishIntro();return}
  introPlaying=true;selected=null;document.querySelector('.stage').classList.add('is-introducing');wrap.dataset.introPhase='overview';updateUI();
  let start,lastFrame;
  introTick=now=>{
    if(token!==introFrame||celebration)return;
    // The engine may do several simulation ticks before one render. Move the
    // camera once per rendered frame, before its matrices and scene are drawn.
    if(now===lastFrame)return;lastFrame=now;start??=now;
    const pose=sampleCameraIntro(now-start,fitUnit,endUnit);
    wrap.dataset.introPhase=pose.phase;
    if(pose.phase!=='overview'){
      viewUnit=pose.unit;viewTarget=from.lerp(target,pose.pan);applyBoardView(false);
    }
    if(pose.done)finishIntro();
  };
}

function panBoard(dx,dy){if(cameraLab){viewTarget=viewTarget.add(render3D.camera.getRight().scale(-dx/viewUnit)).add(render3D.camera.getUp().scale(dy/viewUnit));return}viewTarget=viewTarget.add(vec3(-dx/viewUnit,dy/(viewUnit*Math.cos(viewPitch)),0))}
function zoomBoard(unit,x,y){
  const old=viewUnit,f=sceneFrame(wrap.clientWidth,wrap.clientHeight),min=wrap.clientHeight/f.height;viewUnit=Math.max(min,Math.min(Math.max(tappingUnit(),min),unit));
  const scale=1/old-1/viewUnit;if(cameraLab){viewTarget=viewTarget.add(render3D.camera.getRight().scale((x-wrap.clientWidth/2)*scale)).add(render3D.camera.getUp().scale((wrap.clientHeight/2-y)*scale));return}viewTarget=viewTarget.add(vec3((x-wrap.clientWidth/2)*scale,(wrap.clientHeight/2-y)*scale/Math.cos(viewPitch),0));
}
function clearBoardHover(){hovered=null;movementMarkers?.setHovered(null);if(hoverObject)hoverObject.color=new Color(1,1,1,0)}
function boardPoint(e){const r=wrap.getBoundingClientRect();return {x:e.clientX-r.left-wrap.clientLeft,y:e.clientY-r.top-wrap.clientTop}}
function boardDown(e){
  if(won||!viewReady||e.button>0)return;enterPlayFromIntro();stopIntro();const p=boardPoint(e);boardPointers.set(e.pointerId,p);wrap.setPointerCapture(e.pointerId);
  if(boardPointers.size===1)boardGesture={id:e.pointerId,x:p.x,y:p.y,moved:false,multi:false};else{boardGesture.multi=true;clearBoardHover()}
}
function boardMove(e){
  if(!boardPointers.has(e.pointerId)){if(e.pointerType!=='touch')updateHover(e);return}
  const before=[...boardPointers.values()],old=boardPointers.get(e.pointerId),p=boardPoint(e);boardPointers.set(e.pointerId,p);
  if(boardPointers.size>=2){
    boardGesture.multi=true;boardGesture.moved=true;const after=[...boardPointers.values()],a=before[0],b=before[1],c=after[0],d=after[1],oldDistance=Math.hypot(a.x-b.x,a.y-b.y),distance=Math.hypot(c.x-d.x,c.y-d.y),cx=(c.x+d.x)/2,cy=(c.y+d.y)/2;
    panBoard(cx-(a.x+b.x)/2,cy-(a.y+b.y)/2);if(oldDistance>1)zoomBoard(viewUnit*distance/oldDistance,cx,cy);
  }else{
    if(Math.hypot(p.x-boardGesture.x,p.y-boardGesture.y)>6)boardGesture.moved=true;
    if(!boardGesture.moved)return;panBoard(p.x-old.x,p.y-old.y);
  }
  viewTouched=true;clearBoardHover();applyBoardView();resetStudyFollow();e.preventDefault();
}
function boardUp(e,cancel=false){
  if(!boardPointers.has(e.pointerId))return;boardPointers.delete(e.pointerId);
  const tap=!cancel&&boardPointers.size===0&&boardGesture&&!boardGesture.moved&&!boardGesture.multi;
  if(wrap.hasPointerCapture(e.pointerId))wrap.releasePointerCapture(e.pointerId);
  if(boardPointers.size===0)boardGesture=null;
  if(tap){viewTouched=true;clickBoard(e)}
}
function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
function syncVictoryShowcase(now,sequence){
  if(celebration!==sequence)return;
  const elapsed=now-sequence.start,width=wrap.clientWidth,height=wrap.clientHeight;
  const turn=sequence.reducedMotion?1:ease(elapsed/1200);
  // Looking along the extrusion shear makes the complete mural read as a flat image.
  const yaw=sequence.yaw*(1-turn)+Math.atan(depthSkew())*turn,pitch=sequence.pitch*(1-turn);
  const top=Math.min(victoryEffects.messageHeight+32,height*.42),bottom=24;
  const visual=puzzleVisualBounds(),unit=Math.max(1,Math.min((width-32)/(visual.right-visual.left+.8),(height-top-bottom)/(visual.height+1.15)));
  // This is the camera endpoint at zero pitch, where yStretch is exactly 1.
  const finalHeight=height/unit,target=vec3((visual.left+visual.right)/2+extrusion(1.5).x,(visual.height+.85)/2+(top-bottom)/(2*unit),1.5);
  configureStudyCamera(sequence.baseHeight+(finalHeight-sequence.baseHeight)*turn,sequence.baseTarget.lerp(target,turn),yaw,pitch);
  // Four hops, then settle beside the flag before the circle closes.
  sequence.jump=!sequence.reducedMotion&&elapsed<2320?.32*Math.sin(Math.PI*(elapsed%580)/580):0;
  render3D.updateMatrices(width/height);syncCellGeometry();syncBackground();syncFloorGrid();syncPlayer();
  victoryEffects.update(elapsed,wrap.getBoundingClientRect().top+16);
  const fade=ease((elapsed-250)/2000),strength=currentDesign().shadows.strength*(1-fade);
  render3D.sunColor=new Color(strength,strength,strength);
  wrap.dataset.view='completed';wrap.dataset.cameraPitch=pitch.toFixed(2);
  if(elapsed>=3200){
    if(isMakerPlaytest){showPlaytestResult();return}
    victoryEffects.transitionTo(pomScreenPoint(),()=>showMenu('levels',sequence.levelId,{preserveVictoryTransition:true,deferCheck:true})).then(card=>{
      if(card?.isConnected){card.classList.add('is-just-completed');card.focus({preventScroll:true})}
    });
    return;
  }
  requestAnimationFrame(now=>syncVictoryShowcase(now,sequence));
}
function startCelebration(pomOffset){
  hideHelp();stopIntro();selected=null;clearBoardHover();
  const sequence=celebration={pomOffset,start:performance.now(),levelId:activeLevel.id,pitch:viewPitch,yaw:cameraYaw(),baseHeight:viewSpan(),baseTarget:(cameraFocus??viewTarget).copy(),reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches};
  setUmbrellaVisible(false);victoryEffects.start(activeLevel.name,pomScreenPoint(),wrap.getBoundingClientRect().top+16);requestAnimationFrame(now=>syncVictoryShowcase(now,sequence));
}
function pomScreenPoint(){
  const rect=wrap.getBoundingClientRect(),point=render3D.worldToScreen(playerObject.pos3D,vec2(rect.width,rect.height));
  return{x:rect.left+point.x,y:rect.top+point.y};
}

function gameInit(){
  const bounds=wrap.getBoundingClientRect();setCanvasFixedSize(vec2(Math.max(1,bounds.width),Math.max(1,bounds.height)));
  if(cameraLab)setCanvasClearColor(new Color(1,250/255,240/255));
  setDebugWatermark(false);new Render3DPlugin();
  movementMarkers=createMovementMarkers();
  render3D.onRenderTransparent=drawMapOutlines;
  render3D.sunDirection=vec3(-.45,.8,.5);render3D.sunColor=new Color(1,.91,.75);render3D.ambientColor=new Color(.52,.51,.4);render3D.ambientGroundColor=new Color(.35,.4,.3);
  baseCameraHeight=fitCamera(bounds.width,bounds.height);render3D.camera.orthographic=baseCameraHeight;positionCameraForView(viewSide);
  // Keep the horizon on the wall's base line; pulled pieces then extend down
  // toward Pom in the camera projection without moving the scenery.
  render3D.updateMatrices(bounds.width/bounds.height);
  const makeBackdrop=(texture,color)=>{const o=new EngineObject3D(vec3(),box,texture,color);o.rotation3D=render3D.camera.rotation.copy();o.lighting=false;o.receiveShadow=false;o.castShadow=false;o.emissive=1;o.transparent=texture===textureInfos[1];backgroundObjects.push(o);return o};
  makeBackdrop(textureInfos[0],new Color(1));makeBackdrop(textureInfos[1],new Color(1));
  const overlays=makeBackdrop(undefined,new Color(1));overlays.transparent=true;overlays.mesh=undefined;
  makeBackdrop(undefined,new Color(1));syncFloorGrid();
  environmentLoader=createEnvironmentLoader([textureInfos[0],textureInfos[1]]);activeEnvironmentTextures=[textureInfos[0],textureInfos[1]];
  syncBackground();
  makeGroups();rebuildBlockMeshes();
  hoverObject=makeSurface(vec3(0,-100,0),standingSpotMesh(),new Color(1,1,1,0));hoverObject.transparent=true;hoverObject.render3D=()=>{};
  studioTargetObject=makeSurface(vec3(0,-100,0),standingSpotMesh(),new Color(1,1,1,0));studioTargetObject.transparent=true;studioTargetObject.render3D=()=>{};
  playerObject=new EngineObject3D(vec3(.5,.2,.14),pomBlob,undefined,inkColor);playerObject.scale3D=vec3(.72,.56,.018);playerObject.rotation3D=render3D.camera.rotation.copy();playerObject.lighting=false;playerObject.softShadow=0;pomParts=[playerObject];
  pomBody=new EngineObject3D(vec3(0,0,1),pomBlob,undefined,new Color(.97,.22,.16));pomBody.scale3D=vec3(.88,.88,1);pomBody.lighting=false;playerObject.addChild(pomBody);pomParts.push(pomBody);
  for(const x of [-.17,.17]){const white=new EngineObject3D(vec3(x,.19,2),pomEye,undefined,new Color(1,.95,.83)),black=new EngineObject3D(vec3(x,.19,2.2),pomEye,undefined,new Color(.12,.1,.09));white.scale3D=vec3(.2,.26,1);black.scale3D=vec3(.085,.13,1);white.lighting=false;black.lighting=false;playerObject.addChild(white);playerObject.addChild(black);pomEyes.push({white,black});pomParts.push(white,black)}
  const sweatContour=[...quadraticSegment([0,.6],[-.65,-.05],[-.35,-.3],10),...quadraticSegment([-.35,-.3],[0,-.7],[.35,-.3],10).slice(1),...quadraticSegment([.35,-.3],[.65,-.05],[0,.6],10).slice(1)],sweatMesh=makeFanMesh(sweatContour);
  for(let i=0;i<2;i++){const outline=new EngineObject3D(vec3(.48+i*.17,.65-i*.2,2.8),sweatMesh,undefined,new Color(.157,.145,.122,0)),fill=new EngineObject3D(vec3(0,0,.2),sweatMesh,undefined,new Color(.64,.83,.97,0));outline.scale3D=vec3(.17,.19,1);fill.scale3D=vec3(.70,.72,1);outline.lighting=fill.lighting=false;outline.transparent=fill.transparent=true;outline.addChild(fill);playerObject.addChild(outline);sweatDrops.push({outline,fill})}
  const umbrellaRim=[...Array.from({length:25},(_,i)=>{const a=-Math.PI/2+i*Math.PI/24;return[.52*Math.sin(a),.54*Math.cos(a)]}),[.39,-.04],[.26,0],[.13,-.04],[0,0],[-.13,-.04],[-.26,0],[-.39,-.04]],umbrellaCenter=[0,0];
  umbrellaCanopy=new EngineObject3D(vec3(0,.84,3),makeFanMesh(umbrellaRim),undefined,new Color(.15,.2,.27,0));umbrellaCanopy.scale3D=vec3(.78,.58,1);umbrellaCanopy.lighting=false;umbrellaCanopy.transparent=true;playerObject.addChild(umbrellaCanopy);
  for(let panel=0;panel<4;panel++){const start=-Math.PI/2+panel*Math.PI/4,end=start+Math.PI/4,arc=Array.from({length:9},(_,i)=>{const a=start+(end-start)*i/8;return[.5*Math.sin(a),.52*Math.cos(a)]}),piece=new EngineObject3D(vec3(0,.84,3.035),makeSectorMesh(umbrellaCenter,arc),undefined,new Color(1));piece.scale3D=vec3(.76,.56,1);piece.lighting=false;piece.transparent=true;playerObject.addChild(piece);umbrellaPanels.push(piece)}
  umbrellaHandle=new EngineObject3D(vec3(0,.84,2.96),makeFanMesh([[-.035,-.02],[.035,-.02],[.035,-.6],[-.035,-.6]]),undefined,new Color(.15,.2,.27,0));umbrellaHandle.lighting=false;umbrellaHandle.transparent=true;playerObject.addChild(umbrellaHandle);setUmbrellaVisible(false);
  const print=new Mesh();
  const badge=(half,radius,color,z)=>{
    const corners=[[half-radius,half-radius,0],[-half+radius,half-radius,Math.PI/2],[-half+radius,-half+radius,Math.PI],[half-radius,-half+radius,Math.PI*1.5]];
    const perimeter=corners.flatMap(([x,y,angle])=>Array.from({length:7},(_,i)=>vec3(x+radius*Math.cos(angle+i*Math.PI/12),y+radius*Math.sin(angle+i*Math.PI/12),z)));
    const vertices=[vec3(0,0,z),...perimeter],indices=[];
    for(let i=1;i<vertices.length;i++)indices.push(0,i,i===vertices.length-1?1:i+1);
    print.addTriangles(vertices,indices,vec3(0,0,1),undefined,color);
  };
  // Tiny depth offsets keep the frame, cream fill and glyph free of z-fighting.
  badge(.26,.075,inkColor,0);badge(.245,.065,new Color(1,250/255,240/255),.001);
  print.addQuad(vec3(-.12,-.14,.002),vec3(-.08,-.14,.002),vec3(-.08,.14,.002),vec3(-.12,.14,.002),inkColor);
  print.addStrip([vec3(-.08,.14,.002),vec3(-.08,.01,.002),vec3(.125,.075,.002)],vec3(0,0,1),undefined,new Color(1,.443,.22));print.doubleSided=true;
  const vase=buildLathe([[.075,0],[.09,.015],[.115,.12],[.135,.13],[.135,.17],[.105,.17],[.095,.14],[0,.14]],20,true,true);
  vase.colors=vase.normals.map(n=>{const shade=n.y>.4?1:n.y<-.4?.64:.82+.1*(n.x*.6+n.z*.8);return new Color(shade,shade,shade)});vase.dirty=true;
  flagMeshes={print,pole:buildCapsule(.045,.68,12,4,true),vase,cap:buildSphere(.085,12,6,true)};
  flagPrint=new EngineObject3D(vec3(),print,undefined,new Color(1));flagPrint.lighting=false;flagPrint.castShadow=false;
  flagPole=new EngineObject3D(vec3(),flagMeshes.pole,undefined,inkColor);
  flagCloth=new EngineObject3D(vec3(),flagMesh,undefined,new Color(1,.443,.22));flagCloth.lighting=false;
  flagVase=new EngineObject3D(vec3(),vase,undefined,new Color(.56,.33,.20));
  flagCap=new EngineObject3D(vec3(),flagMeshes.cap,undefined,new Color(.72,.51,.28));
  autoSelectNearbyPiece();updateUI();startBoardView();gameReady=true;document.querySelector('.stage').classList.add('is-ready');document.querySelector('#openLevels').disabled=false;document.querySelector('#openLevels').textContent='Start playing';myPuzzles.openPending();if(cameraLab)startLevel(levels.find(level=>level.compatibility.playable&&level.kind==='puzzle').id);
}
function gameUpdate(){
  introTick?.(timeReal*1000);
  syncCellGeometry();syncPomMatrix();updateStudyFollow();
  designPlayground.updateCellMeasurement(cellMeasurement());
  movementMarkers?.update(performance.now());
  if(selected&&!won){const color=selectedSurfaceColor(selected);for(const object of selected.objects)object.color=color}else pulsePiece=null;
}
function moveTo(p,pressMarker=false){
  if(won||busy||introPlaying||nodeKey(p)===nodeKey(player))return;const path=findPath(p);if(!path||path.length<2){showHelp('That spot is out of reach. Push or pull the blocks to make a path.','unreachable');return}
  const plans=path.slice(1).map((to,i)=>routeFor(path[i],to)),profiles=movementProfiles(plans);
  const winningArrival=!isPreviewLevel(activeLevel)&&nodeKey(path.at(-1))===nodeKey(goalNode());
  const landingOffset=winningArrival?victoryLandingOffset(path.at(-2),path.at(-1),W):0;
  hideHelp();save();resumeStudyFollow();busy=true;setUmbrellaVisible(false);falling=false;updateUI();let index=0,start;
  const readyAt=performance.now()+(pressMarker?(movementMarkers?.press(p)??0):0);
  function tick(now){
    if(now<readyAt){requestAnimationFrame(tick);return}
    start??=now;
    // Carry elapsed time across cell boundaries instead of inserting a fresh
    // animation frame and a full stop at the beginning of every next step.
    while(index<plans.length&&now-start>=plans[index].duration){start+=plans[index].duration;player={...path[++index]};resetPomShape()}
    if(index===plans.length){
      falling=false;setUmbrellaVisible(false);busy=false;
      if(!isPreviewLevel(activeLevel)&&nodeKey(player)===nodeKey(goalNode())){won=true;recordCompletedLevel();document.querySelector('.stage').classList.add('is-won');startCelebration(landingOffset)}else autoSelectNearbyPiece();updateUI();return;
    }
    const plan=plans[index],from=path[index],to=path[index+1],t=(now-start)/plan.duration,profile=profiles[index];
    const motion={pose:plan.stretch?shapePomReach(from,to,t,profile):jumpPose(from,to,t,profile),umbrella:plan.isFall&&t>.08&&t<.96,flight:t};
    if(falling!==motion.umbrella){falling=motion.umbrella;setUmbrellaVisible(falling)}
    if(winningArrival&&index===plans.length-1){const offset=victoryArrival(t,landingOffset,reducedSelectionMotion.matches);motion.pose=motion.pose.add(vec3(offset.x,stretchY(offset.y),0))}
    playerObject.pos3D=motion.pose.add(render3D.camera.getForward().scale(-.045));if(falling)positionUmbrella(motion.flight);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function pointOnFloor(ray){if(Math.abs(ray.direction.y)<1e-6)return null;const t=(0-ray.origin.y)/ray.direction.y;if(t<0)return null;return ray.getPosition(t)}
function standableAt(ray){ray=boardRay(ray);let best=null,bestD=Infinity;if(Math.abs(ray.direction.y)>1e-6)for(const p of standableReachable().filter(p=>p.y<H)){const h=H-p.y,z=p.z+.5,x=p.x+.5+depthSkew()*(p.z+.5),t=(h-ray.origin.y)/ray.direction.y;if(t<0)continue;const q=ray.getPosition(t),d=Math.hypot(q.x-x,q.z-z);if(d<bestD&&d<.72){best=p;bestD=d}}if(best)return best;const floor=pointOnFloor(ray);if(floor){const p=standableReachable().filter(n=>n.y===H).sort((a,b)=>{const pa=worldPosition(a,.5),pb=worldPosition(b,.5);return Math.hypot(pa.x-floor.x,pa.z-floor.z)-Math.hypot(pb.x-floor.x,pb.z-floor.z)})[0];if(p){const q=worldPosition(p,.5);if(Math.hypot(q.x-floor.x,q.z-floor.z)<.9)return p}}return null}
function updateHover(e){if(!hoverObject)return;if(introPlaying){clearBoardHover();return}const point=boardPoint(e),ray=render3D.screenToRay(vec2(point.x,point.y),vec2(wrap.clientWidth,wrap.clientHeight)),p=standableAt(ray);hovered=p;movementMarkers?.setHovered(!busy&&!won?pickMovementMarker(ray):null);if(!p||(movementMarkersEnabled()&&p.y<H)){hoverObject.color=new Color(1,1,1,0);return}hoverObject.pos3D=standingSpotCenter(p);hoverObject.color=new Color(1,1,1,.33)}
function clickBoard(e){if(busy||won)return;enterPlayFromIntro();const point=boardPoint(e),ray=render3D.screenToRay(vec2(point.x,point.y),vec2(wrap.clientWidth,wrap.clientHeight));
  const stud=pickMovementMarker(ray);if(stud){moveTo(stud,true);return}
  // Resolve visible, walkable cube tops before wall faces. The wall can be
  // nearer along the ray even when the pointer is visually on a platform top.
  const logicalRay=boardRay(ray);let best=null,bestD=Infinity;for(const p of standableReachable().filter(p=>p.y<H)){const h=H-p.y,z=p.z+.5,x=p.x+.5+depthSkew()*(p.z+.5);if(Math.abs(logicalRay.direction.y)<1e-6)continue;const t=(h-logicalRay.origin.y)/logicalRay.direction.y;if(t<0)continue;const q=logicalRay.getPosition(t),d=Math.hypot(q.x-x,q.z-z);if(d<bestD&&d<.72){best=p;bestD=d}}if(best){moveTo(best);return}
  const hits=engineObjectsRaycast3D(ray),hit=hits.find(o=>blockObjects.includes(o)||topObjectInfo.has(o)||sideObjectInfo.has(o));if(hit){const top=topObjectInfo.get(hit);if(top){moveTo(walkabilityFacesEnabled()?top:reachableTop(top));return}const g=sideObjectInfo.get(hit)||groups.find(g=>g.objects.includes(hit));if(g){if(canInteract(g)){hideHelp();selected=g;updateUI()}else showHelp('Pom cannot push or pull this piece from here. Move him beside an exposed edge.','wall');return}}
  // Match a visible point on the floor plane to the nearest reachable step.
  const floor=pointOnFloor(ray);if(floor){selected=null;updateUI();const candidates=standableReachable().filter(p=>p.y===H);const p=candidates.sort((a,b)=>{const pa=worldPosition(a,.5),pb=worldPosition(b,.5);return Math.hypot(pa.x-floor.x,pa.z-floor.z)-Math.hypot(pb.x-floor.x,pb.z-floor.z)})[0];if(p){const q=worldPosition(p,.5);if(Math.hypot(q.x-floor.x,q.z-floor.z)<1.15){moveTo(p);return}}
    const x=floor.x-depthSkew()*floor.z;
    if(x>=-1&&x<W&&floor.z>=0&&floor.z<GRID_DEPTH&&Math.hypot(worldPosition(player).x-floor.x,worldPosition(player).z-floor.z)>.72)showHelp('That spot is out of reach. Push or pull the blocks to make a path.','unreachable');
  }
}
function manipulate(dir){const g=selected;if(busy||introPlaying||!g||!canReach(g)||won)return;const next=g.depth+dir;if(next<0||next>3)return;const dest={...player,z:player.z+dir};if(!safeManipulation(g,next,dir))return;hideHelp();save();resumeStudyFollow();g.depth=next;player=dest;autoSelectNearbyPiece();animateEffort();updateUI()}
function restore(s){hideHelp();celebration=null;resumeStudyFollow();groups.forEach((g,i)=>g.depth=s.depths[i]);player={...s.player};selected=groups.find(g=>g.id===s.selected)||null;won=s.won;autoSelectNearbyPiece();applyBoardView();updateUI()}
function changeView(horizontal,vertical=viewHeightStep){
  if(busy||won||!viewReady)return;enterPlayFromIntro();
  if(cameraLab){if(horizontal!==viewSide)cameraLab.orbitBy(-5*(horizontal-viewSide));return}
  const next=cameraPosition(horizontal,vertical);if(next.horizontal===viewSide&&next.vertical===viewHeightStep)return;
  stopIntro();clearBoardHover();
  // Keep the wall plane in the same screen position, rather than following Pom's sheared depth.
  const projectedTarget=viewTarget.y*Math.cos(viewPitch)-viewTarget.z*Math.sin(viewPitch);
  viewSide=next.horizontal;viewHeightStep=next.vertical;viewPitch=cameraPitch();
  viewTarget.y=(projectedTarget+viewTarget.z*Math.sin(viewPitch))/Math.cos(viewPitch);
  if(!activeLevel.studioExample)baseCameraHeight=fitCamera(wrap.clientWidth,wrap.clientHeight);
  applyBoardView(!activeLevel.studioExample);updateUI();
}

wrap.addEventListener('pointerdown',boardDown);wrap.addEventListener('pointermove',boardMove);wrap.addEventListener('pointerup',e=>boardUp(e));wrap.addEventListener('pointercancel',e=>boardUp(e,true));wrap.addEventListener('lostpointercapture',e=>boardUp(e,true));wrap.addEventListener('pointerleave',()=>{if(!boardPointers.size)clearBoardHover()});
wrap.addEventListener('wheel',e=>{if(won||!viewReady)return;e.preventDefault();enterPlayFromIntro();stopIntro();viewTouched=true;const p=boardPoint(e);zoomBoard(viewUnit*Math.exp(-e.deltaY*(e.ctrlKey?.01:.002)),p.x,p.y);clearBoardHover();applyBoardView();resetStudyFollow()},{passive:false});
// Overlay controls must never select or move a ground spot underneath them.
const canvasActions=document.querySelector('.canvas-actions');for(const event of ['pointerdown','pointermove'])canvasActions.addEventListener(event,e=>e.stopPropagation());canvasActions.addEventListener('pointerenter',clearBoardHover);
const studioControls=document.querySelector('#studioControls'),movementCase=document.querySelector('#movementCase');for(const example of movementExamples){const option=document.createElement('option');option.value=example.id;option.textContent=example.label;movementCase.append(option)}movementCase.onchange=()=>{if(!busy)resetLevelState(studioLevel(levels,movementExamples.find(example=>example.id===movementCase.value)))};
const previewClimb=document.querySelector('#previewClimb');for(const event of ['pointerdown','pointerup','pointermove'])studioControls.addEventListener(event,e=>e.stopPropagation());previewClimb.onclick=()=>{if(busy||!activeLevel.previewMove)return;const side=viewSide,height=viewHeightStep;resetLevelState(activeLevel);changeView(side,height);moveTo(activeLevel.previewMove)};
document.querySelector('#pull').onclick=()=>manipulate(1);document.querySelector('#push').onclick=()=>manipulate(-1);
document.querySelector('#undo').onclick=()=>{if(!busy&&history.length)restore(history.pop())};document.querySelector('#reset').onclick=()=>{if(busy)return;hideHelp();celebration=null;groups.forEach((g,i)=>g.depth=activeLevel.initialDepths?.[i]??0);clearMovementRoutes();player={x:activeLevel.start.x,y:activeLevel.start.y??H,z:activeLevel.start.z};selected=null;history=[];won=false;autoSelectNearbyPiece();positionCameraForView(viewSide);render3D.camera.orthographic=baseCameraHeight;render3D.updateMatrices(wrap.clientWidth/wrap.clientHeight);syncBackground();updateUI();startBoardView()};
window.addEventListener('keydown',e=>{
  if(!menuScreen.hidden&&menuScreen.classList.contains('is-levels')){
    const step=Math.max(120,levelList.clientHeight*.72);
    if(e.key==='ArrowDown'||e.key==='PageDown'){levelList.scrollBy({top:e.key==='PageDown'?step:48});e.preventDefault()}
    else if(e.key==='ArrowUp'||e.key==='PageUp'){levelList.scrollBy({top:e.key==='PageUp'?-step:-48});e.preventDefault()}
    else if(e.key==='Home'){levelList.scrollTop=0;e.preventDefault()}
    else if(e.key==='End'){levelList.scrollTop=levelList.scrollHeight;e.preventDefault()}
    return;
  }
  if(document.querySelector('.stage').inert||busy||won||e.target.closest('#viewController')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','z','Z','r','R'].includes(e.key))enterPlayFromIntro();
  if(e.key.toLowerCase()==='z'){if(history.length)restore(history.pop())}if(e.key.toLowerCase()==='r')document.querySelector('#reset').click();const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];if(delta){e.preventDefault();changeView(viewSide+delta[0],viewHeightStep+delta[1])}
});
setCanvasPixelRatio(Math.min(window.devicePixelRatio||1,2));
glSetAntialias(true);
setLoadingScreen(undefined);
await engineInit(gameInit,gameUpdate,undefined,undefined,undefined,[skyBackground,meadowForeground],wrap);
new ResizeObserver(()=>{
  const r={width:wrap.clientWidth,height:wrap.clientHeight};setCanvasFixedSize(vec2(Math.max(1,r.width),Math.max(1,r.height)));if(!backgroundObjects.length)return;
  if(r.width===viewWidth&&r.height===viewHeight)return;
  const mobile=mobileBoard(),changedMode=mobile!==viewMobile;viewWidth=r.width;viewHeight=r.height;baseCameraHeight=fitCamera(r.width,r.height);
  if(celebration){render3D.updateMatrices(r.width/r.height);return}
  if(changedMode||introPlaying){startBoardView();return}
  stopIntro();if(!mobile&&!viewTouched){viewUnit=r.height/baseCameraHeight;viewTarget=sceneFrame(r.width,r.height).target}applyBoardView();
}).observe(wrap);
