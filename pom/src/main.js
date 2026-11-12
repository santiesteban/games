import approvedEnvironment from './data/daisy-meadow-ivan-v2.json';
import {gameplayEnvironmentConfiguration} from './environment-policy.js';
import {limitStagePan} from './stage-geometry.js';
import {pickScenery,scenePlanePoint} from './scenery-picking.js';
import {
  timeReal, buildMatrix, engineInit, Render3DPlugin, EngineObject3D, Light3D, Mesh, buildBox, buildCapsule, buildLathe, buildSphere, vec2, vec3,
  Color, render3D, glContext, setCanvasFixedSize, setCanvasPixelRatio, setCanvasClearColor, glSetAntialias, setDebugWatermark, setLoadingScreen, engineObjectsRaycast3D,
  setInputPreventDefault, inputClear,
} from 'littlejsengine';
import catalog from '#level-catalog';
import {menuStartup} from './menu-startup.js';
import { createPieceDrag, pickPieceFront, pieceInteractionAnchor } from './piece-drag.js';
import { createLevelProgress } from './level-progress.js';
import { createUnfinishedPuzzles } from './unfinished-puzzles.js';
import { createLevelPreferences } from './level-preferences.js';
import { CONTROL_FEATURES, createControlFeatures } from './control-features.js';
import { createMovementMarkers } from './movement-markers.js';
import { puzzleFloorBounds } from './floor-grid.js';
import { outsidePolygonSegments } from './surface-patterns.js';
import { createLevelLoadGate } from './level-loading.js';
import { sampleCameraIntro, initialCameraUnit, openingFrameFits } from './camera-intro.js';
import { boundedCameraAxis } from './camera-follow.js';
import { installViewportSafety } from './viewport-safety.js';
import { installSafariZoom } from './safari-zoom.js';
import { cellYStretch, stretchBoardY, unStretchBoardY } from './cell-squareness.js';
import { createDesignPlayground } from './design-playground.js';
import { createBackgroundStudio } from './background-studio.js';
import { createCameraLab } from './camera-lab.js';
import { puzzleBackgroundDistance, puzzleArtworkWidth } from './scenery-distance.js';
import { selectionColor } from './selection-color.js';
import { CARDBOARD_THICKNESS, cardboardMesh } from './cardboard.js';
import { chooseVisibilityPitch, visibilityCameraPose, visibilityAtPitch } from './camera-visibility.js';
import { createGoalBadge } from './goal-badge.js';
import { createWarpPipeAssets } from './warp-pipe-assets.js';
import { WARP_PIPE_COLORS } from '../shared/warp-pipes.js';
import { createCameraScenery } from './camera-scenery.js';
import { ENVIRONMENTS, DEFAULT_ENVIRONMENT, environmentById, environmentFrame, environmentCacheKey, selectEnvironmentComposition, createEnvironmentLoader } from './environments.js';
import {createPuzzleGPUProjection} from './puzzle-projection-gpu.js';
import {puzzleProjection,projectPuzzlePoint,unprojectPuzzlePoint,createPuzzleMeshProjection} from './puzzle-projection.js';
import { createVictoryEffects, victoryArrival, victoryBoardClip, victoryCenter, victoryExpandedFov, victoryFrameUnit } from './victory-effects.js';
import {setLoadingPalette} from './loading-palette.js';
import { pieceShadowShader, solidPieceShadowShader, highlightedPieceShadowShader, solidPieceGlowShader, groundShadowShader, SHADOW_BLUR_RADIUS } from './shadow-materials.js';
import { createCatalogScreens } from './catalog-screens.js';
import { createMyPuzzles } from './my-puzzles.js';
import {createPieceDock,pieceDockState} from './piece-dock.js';
import { canReachPiece, safePieceChange, warpDestination } from '../shared/rules.js';
import { decodePuzzle, puzzleLevel } from '../shared/puzzle.js';
import { deploymentUrls } from '../shared/deployment.js';
import { reachTiming, reachOutline, reachFaceDepth, triangulateContour } from './reach-motion.js';
import { createMovementBoard, planMovement, sampleMovement, sampleMovementProgress, movementSegmentClear, isSingleMove, movementNeighbors, findMovementPath, movementProfiles } from './movement-routes.js';
import { movementExamples, studioLevel } from './movement-studio.js';
import { cameraPosition, cameraSlant, CAMERA_PITCHES, DEFAULT_VIEW } from './camera-view.js';
import { cameraControlCube } from './camera-control-cube.js';
import { nearestMovementTarget } from './movement-targets.js';

const buildLabel=document.querySelector('#buildNumber');
// The initial screen is Home; only a level may claim browser input defaults.
setInputPreventDefault(false);
if(buildLabel)buildLabel.textContent=`Build ${__BUILD_INFO__.number} · ${__BUILD_INFO__.revision}${__BUILD_INFO__.development?' (development)':''}`;

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
// LittleJS cancels document-level wheel/touch input while the window is focused.
// Menu gestures keep their native defaults and never reach gameplay input.
function keepNativeInputLocal(element){
  for(const type of ['wheel','touchstart','touchmove','touchend','touchcancel','pointerdown','pointermove','pointerup','mousedown','mousemove','mouseup']){
    element.addEventListener(type,event=>event.stopPropagation(),{passive:true});
  }
  element.addEventListener('keydown',event=>event.stopPropagation());
}
const menuScreen=document.querySelector('#menuScreen');
keepNativeInputLocal(menuScreen);
keepNativeInputLocal(document.querySelector('.level-header'));
keepNativeInputLocal(document.querySelector('#pieceDock'));
const wrap = document.querySelector('#canvasWrap');
const cameraControlsPanel=document.querySelector('#cameraControlsPanel');
const cameraModeToggle=document.querySelector('#cameraModeToggle'),cameraModeSliders=document.querySelector('#cameraModeSliders');
const cameraDirection=document.querySelector('#cameraDirection');
let cameraModeActive=false,cameraModePrevious=null,zoomFeedbackTimer;
const cameraTuning=document.querySelector('#cameraTuning'),tuningToggle=document.querySelector('#cameraTuningToggle'),tuningEnabled=document.querySelector('#cameraTuningEnabled');
const tuningPitch=document.querySelector('#cameraTuningPitch'),tuningDepth=document.querySelector('#cameraTuningDepth');
const trackingMode=document.querySelector('#cameraTrackingMode');
let experimentalPitch=null,extrusionScale=1;
keepNativeInputLocal(cameraControlsPanel);
keepNativeInputLocal(cameraTuning);
const victoryEffects=createVictoryEffects(document.querySelector('.app'));
let cameraFrameHeight=0,cameraFocus,followAnchor,followTime=0;
let visibilityStudy={target:null,lastCheck:-1,lastTime:0,lastBlocked:-1,boxes:[],board:null,key:null};
let viewUnit=0,viewTarget,viewReady=false,viewMobile=false,viewTouched=false,introFrame=0,introPlaying=false,settingsReturnToLevel=false,viewWidth=0,viewHeight=0;
const boardPointers=new Map();let boardGesture=null,introTick=null,keepInterruptedView=false;
const pageUrl=new URL(location.href);if(pageUrl.searchParams.has('style')){pageUrl.searchParams.delete('style');window.history.replaceState(null,'',pageUrl)}
function syncScreenAppearance(screen){
  if(document.documentElement.dataset.screen!==screen)inputClear();
  setInputPreventDefault(screen==='game');
  document.documentElement.dataset.screen=screen;
  document.querySelector('meta[name="theme-color"]').content='#f5f5f5';
}
window.addEventListener('pageshow',()=>syncScreenAppearance(document.documentElement.dataset.screen));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncScreenAppearance(document.documentElement.dataset.screen)});
const svgNS='http://www.w3.org/2000/svg';
const FLOOR_DEPTH=4,GRID_DEPTH=4,DEPTH_SKEW=.16, ink='#28251f';
let viewPitch=cameraPosition(DEFAULT_VIEW.horizontal,DEFAULT_VIEW.vertical).pitch,viewHeightStep=0;
const movementRouteCache=new Map;let movementBoardCache,movementBoardKey,reachableKey,reachableValue;
const {levels,groups:levelGroups}=catalog;
const warpPipePreview=new URLSearchParams(location.search).has('warp-pipe-preview');
const interactionLab=!isMakerPlaytest&&new URLSearchParams(location.search).has('interaction-lab');
const cameraLab=!isMakerPlaytest&&new URLSearchParams(location.search).has('camera-lab')?createCameraLab({levels,environments:ENVIRONMENTS,onChange:applyCameraStudy,onLevel:startLevel}):null;
const cameraState=cameraLab?.state??{projection:'perspective',motion:'orbit',truck:0,fov:35,followX:true,followY:true,yaw:0,pitch:20,autoTilt:true,setting:'landscape',backdrop:'turning',artworkSet:'kit',backgroundDistance:8,horizonLock:false,horizonGuide:false,environment:'meadow',background:true,foreground:true,props:true,guides:true,lightboxStrength:.65,lightboxGlow:true};
const cameraScenery=createCameraScenery({onChange(){if(gameReady&&viewReady){applyBoardView(false);syncDesignLighting()}},onStatus:message=>{wrap.dataset.sceneryStatus=message;cameraLab?.setArtworkStatus(message)}});
function worldPresentation(){return !!cameraLab||!isPreviewLevel(activeLevel)||(isBackgroundStudio()&&cameraState.environment==='daisy-meadow')}
function studyPerspective(){return worldPresentation()&&cameraState.projection==='perspective'}
function studyStraight(){return worldPresentation()&&cameraState.projection!=='oblique'}
function viewSpan(){return studyPerspective()?(cameraFrameHeight||baseCameraHeight||1):render3D.camera.orthographic}
function depthSkew(side=viewSide){return studyStraight()?0:cameraSlant(side)*DEPTH_SKEW}
function cameraYaw(){return studyStraight()&&cameraState.motion!=='track'?-cameraState.yaw*Math.PI/180:0}
function cameraPitch(){return studyStraight()?cameraState.pitch*Math.PI/180:cameraPosition(viewSide,viewHeightStep).pitch}
function isPreviewLevel(level){return ['design-playground','background-studio'].includes(level.kind)}
const levelProgress=menuStartup?.progress??(isMakerPlaytest||cameraLab||interactionLab?{key:null,count:0,has:()=>false,reload(){},complete:()=>false,clear:()=>false}:createLevelProgress(levels.filter(level=>!isPreviewLevel(level))));
const unfinished=menuStartup?.unfinished??createUnfinishedPuzzles();
const levelPreferences=menuStartup?.preferences??createLevelPreferences();
let toastTimer,helpKind=null,openingHelpShown=false,interactionHelpKey=null;
function syncHelpVisibility(){document.querySelector('#toast').hidden=levelPreferences.hideHelpText;if(levelPreferences.hideHelpText)hideHelp()}
syncHelpVisibility();
const controlFeatures=menuStartup?.features??createControlFeatures({persistent:!isMakerPlaytest&&!cameraLab&&!interactionLab});
if(interactionLab){controlFeatures.set('stackedPieceButtons',false);controlFeatures.set('pieceDragArrows',true)}
let movementMarkers;
let catalogScreens=menuStartup?.catalog;
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
let studioCameraFollow=false;
let environmentLoadPromise=Promise.resolve(false);
let shadowFloor,pomLight,pomGlowCovered=false,pomGlowOn=false,pomGlowStart=0,environmentLoader,activeEnvironment=environmentById(DEFAULT_ENVIRONMENT),activeEnvironmentTextures,environmentRequest=0,environmentRequestKey,failedEnvironmentKey,environmentSelection;
let pomShadowProbeKey='',pomShadowProbeValue=0;
const backgroundStudio=createBackgroundStudio(document.querySelector('#backgroundPanel'),()=>{
  if(!gameReady)return;
  requestLevelEnvironment(true);syncBackground();syncDesignLighting();syncFloorGrid();
},{levels,groups:levelGroups,onCenterPom(){studioCameraFollow=true;resumeStudyFollow()},onLevelChange(id){
  const source=id?levels.find(level=>level.id===id&&level.kind==='puzzle'&&level.compatibility.playable):levels.find(level=>level.kind==='background-studio');
  if(source)resetLevelState(id?{...source,kind:'background-studio',studioSourceId:source.id}:source);
}});
function isDesignPlayground(){return activeLevel.kind==='design-playground'}
function isBackgroundStudio(){return activeLevel.kind==='background-studio'}
function currentBackgroundConfiguration(){
  if(isBackgroundStudio())return backgroundStudio.values;
  if(cameraLab)return backgroundStudio.appliedValues;
  return gameplayEnvironmentConfiguration(activeLevel,levelGroups,approvedEnvironment.configuration,backgroundStudio.appliedValues,backgroundStudio.appliedRevision);
}
function requestLevelEnvironment(retry=false){
  if(!environmentLoader)return Promise.resolve(false);
  const preview=currentBackgroundConfiguration();
  const id=cameraLab?.state.environment??preview?.environment??activeLevel.environment??levelGroups.find(group=>group.id===activeLevel.group)?.environment??DEFAULT_ENVIRONMENT;
  if(!cameraLab)cameraState.environment=id;
  const source=environmentById(id),width=Math.max(1,wrap.clientWidth),height=Math.max(1,wrap.clientHeight);
  const selectionKey=`${source.id}:${activeLevel.id}:${width}:${height}:${viewSide}:${viewHeightStep}:${preview?.composition??'auto'}`;
  if(environmentSelection?.key!==selectionKey){
    // Use the full-board horizon to choose artwork, so panning/zooming does not
    // download a different composition. Resizes and camera angles still adapt.
    const frame=sceneFrame(width,height),groundFraction=.5+(frame.target.y*Math.cos(viewPitch)-frame.target.z*Math.sin(viewPitch))/frame.height;
    const previous=environmentSelection?.environment.id===source.id?environmentSelection.environment.variant:undefined;
    environmentSelection={key:selectionKey,environment:selectEnvironmentComposition(source,{width,height,groundFraction,previous,preferred:worldPresentation()?'landscape':preview?.composition})};
  }
  const environment={...environmentSelection.environment};
  if(preview){if(isBackgroundStudio())backgroundStudio.setComposition(environment);environment.groundAnchorY=backgroundStudio.anchorFor(environment,preview)}
  const key=`${environmentCacheKey(environment)}:${environment.groundAnchorY}`;
  if(key===environmentRequestKey&&!(retry&&failedEnvironmentKey===key))return environmentLoadPromise;
  environmentRequestKey=key;failedEnvironmentKey=undefined;
  const request=++environmentRequest;
  const apply=(textures,art=environment,fallback=false)=>{
    if(request!==environmentRequest)return false;
    activeEnvironment=art;activeEnvironmentTextures=textures;syncBackground();syncFloorGrid();
    if(isBackgroundStudio())backgroundStudio.setStatus(fallback?`${art.name}: showing the original artwork because the new composition could not load. Choose the environment again to retry.`:`${art.name}${art.variant?` (${art.variant})`:''} ready. Use Apply to non-Japan levels to save the current configuration.`);
    return true;
  };
  const cached=environmentLoader.cached(environment);if(cached){environmentLoadPromise=Promise.resolve(apply(cached));return environmentLoadPromise}
  if(isBackgroundStudio())backgroundStudio.setStatus(`Loading ${environment.name}…`);
  environmentLoadPromise=environmentLoader.load(environment).then(textures=>apply(textures)).catch(async()=>{
    if(request!==environmentRequest)return false;failedEnvironmentKey=key;
    if(environment.variant){try{const textures=await environmentLoader.load(source);return apply(textures,source,true)}catch{}}
    if(request===environmentRequest&&isBackgroundStudio())backgroundStudio.setStatus('The scenery could not be loaded. Choose the environment again to retry. The previous scenery is still displayed.');
    return false;
  });
  return environmentLoadPromise;
}
let levelLoading=false;
const levelLoadingPanel=document.querySelector('#levelLoading'),levelLoadingMessage=document.querySelector('#levelLoadingMessage'),levelLoadingRetry=document.querySelector('#retryLevelAssets');
const levelAssetGate=createLevelLoadGate((state,error,id)=>{
  const stage=document.querySelector('.stage');
  if(state==='ready'){
    levelLoading=false;startBoardView();syncDesignLighting();
    // Keep the cover for a composed frame: decoded textures must already be in
    // the scene before the old canvas pixels can become visible.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{if(levelAssetGate.isCurrent(id)){stage.classList.remove('is-level-loading');levelLoadingPanel.hidden=true;wrap.setAttribute('aria-busy','false');wrap.dataset.levelAssetState='ready'}}));
    return;
  }
  levelLoading=state!=='idle';stage.classList.toggle('is-level-loading',levelLoading);levelLoadingPanel.hidden=!levelLoading;
  levelLoadingMessage.textContent=state==='error'?"Couldn't load the puzzle artwork. Check your connection and try again.":'Loading puzzle…';
  levelLoadingRetry.hidden=state!=='error';wrap.setAttribute('aria-busy',String(state==='loading'));wrap.dataset.levelAssetState=state;
  if(gameReady)updateUI();
});
function loadLevelAssets(retry=false){
  return levelAssetGate.run(async()=>{
    const environment=requestLevelEnvironment(retry),configuration=currentBackgroundConfiguration(),state={...cameraState,...(configuration?{sceneryLayout:configuration.sceneryLayout,scenicAtmosphere:configuration.scenicAtmosphere===true,background:configuration.layers!=='foreground',foreground:configuration.layers!=='background'}:{})};
    if(!await environment)throw new Error('The scenery could not be loaded.');
    if(worldPresentation()){await cameraScenery.prepare(state,{retry});syncBackground()}
    await document.fonts.ready;
  });
}
levelLoadingRetry.onclick=()=>loadLevelAssets(true);
function currentDesign(){return isDesignPlayground()?designPlayground.values:designPlayground.appliedValues}
function floorMarkersEnabled(){return !isDesignPlayground()&&controlFeatures.enabled('floorMarkers')}
function movementMarkersEnabled(){return isDesignPlayground()?designPlayground.values.studs.enabled:controlFeatures.enabled('movementStuds')}
function topFaceStyle(){return isDesignPlayground()?designPlayground.values.topFaces:controlFeatures.topFaceStyle}
function depthColorsEnabled(){return topFaceStyle()==='pull-depth'}
function walkabilityFacesEnabled(){return topFaceStyle()==='walkability'}
function diamondShapesEnabled(){return topFaceStyle()==='diamond-shapes'}
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
  if(diamondShapesEnabled())return new Color(1);
  if(topFaceStyle()==='flat')return palette[group.color];
  const color=palette[group.color];
  // Near-black tiles need a lighter alternate square for the pattern to show.
  const lift=(.26-Math.max(color.r,color.g,color.b))*.75;
  if(lift>0)return (x+z)%2===1?tinted(color,lift):color;
  const shade=topFaceShade(x,z,color);
  return new Color(color.r*shade.r,color.g*shade.g,color.b*shade.b);
}
function reachableMarkerColor(group,contrast=.10,subtle=false){
  const face=palette[group.color];
  const luminance=.2126*face.r+.7152*face.g+.0722*face.b;
  if(luminance>=.5){const darken=(subtle?.05:.10)+contrast*.2;return new Color(face.r*(1-darken),face.g*(1-darken),face.b*(1-darken))}
  const lighten=contrast;
  return new Color(face.r+(1-face.r)*lighten,face.g+(1-face.g)*lighten,face.b+(1-face.b)*lighten);
}
function useLevelPalette(level){
  palette=Object.fromEntries(Object.entries(level.palette).map(([slot,[r,g,b]])=>[slot,new Color(r/255,g/255,b/255)]));
  topPalette=Object.fromEntries(Object.entries(palette).map(([slot,color])=>[slot,tinted(color,.035)]));
  sidePalette=Object.fromEntries(Object.entries(palette).map(([slot,color])=>[slot,shaded(color,.96)]));
}
useLevelPalette(activeLevel);
let groups=[],byCell=Array.from({length:H},()=>Array(W).fill(null)),player={x:activeLevel.start.x,y:activeLevel.start.y??H,z:activeLevel.start.z},selected=null,hovered=null,history=[],won=false,busy=false,falling=false,viewSide=DEFAULT_VIEW.horizontal,blockObjects=[],extrusionObjects=[],extrusionOutlines=[],topPickObjects=[],topObjectInfo=new Map,sideObjectInfo=new Map,playerObject,pomBody,warpSmile,pomReaching=false,pomParts=[],hoverObject,studioTargetObject,flagPole,flagCloth,flagPrint,flagVase,flagCap,flagMeshes,umbrellaCanopy,umbrellaHandle,umbrellaPanels=[],pomEyes=[],sweatDrops=[],effortFrame=0,backgroundObjects=[],celebration=null,baseCameraHeight=0,gameReady=false;
const box=buildBox(),flagMesh=new Mesh().addStrip([vec3(-.5,.5,0),vec3(-.5,-.5,0),vec3(.5,0,0)],vec3(0,0,1));
const inkColor=new Color(.157,.145,.122);
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
function rayHitsTriangle(origin,direction,a,b,c){
  const e1=b.subtract(a),e2=c.subtract(a),h=direction.cross(e2),det=e1.dot(h);
  if(Math.abs(det)<1e-8)return false;
  const inv=1/det,s=origin.subtract(a),u=inv*s.dot(h);
  if(u<0||u>1)return false;
  const q=s.cross(e1),v=inv*direction.dot(q);
  if(v<0||u+v>1)return false;
  return inv*e2.dot(q)>.025;
}
function pomShadowCoverage(){
  if(!render3D.shadows||!playerObject)return 0;
  const sun=render3D.sunDirection.copy().normalize(),projection=puzzleProjectionState(),right=render3D.camera.getRight(),up=render3D.camera.getUp(),pose=playerObject.pos3D,key=[activeLevel.id,player.x,player.y,player.z,pose.x,pose.y,pose.z,pieceDragPreview?.offset??0,groups.map(g=>g.depth).join(','),depthSkew(),yStretch,JSON.stringify(viewSide),sun.x,sun.y,sun.z,right.x,right.y,right.z,up.x,up.y,up.z,...Object.values(projection)].join(':');
  if(key===pomShadowProbeKey)return pomShadowProbeValue;
  pomShadowProbeKey=key;
  const triangles=[],gpuProjected=!!puzzleGPU?.active;
  for(const object of [...extrusionObjects,...extrusionOutlines])if(object.castShadow&&object.mesh){
    const matrix=object.getMatrix(),source=object.mesh,points=source.points.map(point=>{const p=matrix.transformPoint(point);if(!gpuProjected)return p;const projected=projectPuzzlePoint(projection,p);return vec3(projected.x,projected.y,projected.z)});
    if(source.indices){for(let i=0;i<source.indices.length;i+=3)triangles.push([points[source.indices[i]],points[source.indices[i+1]],points[source.indices[i+2]]])}
    else for(let i=2;i<points.length;i++)triangles.push([points[i-2],points[i-1],points[i]]);
  }
  const center=puzzlePoint(playerObject.pos3D);
  const samples=[];
  for(const [x,y]of [[-.36,.04],[.36,.04]]){
    const p=center.add(right.scale(x)).add(up.scale(y));
    samples.push(triangles.some(([a,b,c])=>rayHitsTriangle(p,sun,a,b,c)));
  }
  pomShadowProbeValue=samples.filter(Boolean).length/samples.length;
  return pomShadowProbeValue;
}
function updatePomGlow(now){
  if(!pomLight)return;
  // Require both side samples to hit actual casting geometry so a shadow on
  // only one side of Pom cannot activate the light.
  const covered=!warpPreviewWarping&&pomShadowCoverage()>=1;
  if(covered&&!pomGlowCovered)pomGlowStart=now;
  pomGlowCovered=covered;
  // Fade the light in smoothly when Pom enters shadow.
  const t=Math.max(0,Math.min(1,(now-pomGlowStart)/415));
  const level=covered?t*t*(3-2*t):0;
  const glowWasOn=pomGlowOn;
  pomGlowOn=covered;
  pomLight.intensity=level;
  if(playerObject){
    playerObject.castShadow=render3D.shadows&&!pomGlowOn;
    if(glowWasOn!==pomGlowOn)for(const part of pomParts){part.shader=render3D.shadows&&!pomGlowOn?pieceShadowShader:undefined;part.receiveShadow=render3D.shadows&&!pomGlowOn}
  }
}
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
function keepPomEyesRound(){
  if(!playerObject||!pomEyes.length||busy||pomReaching)return;
  const matrix=playerObject.getMatrix(),size=vec2(wrap.clientWidth,wrap.clientHeight);
  const screen=(x,y)=>render3D.worldToScreen(puzzlePoint(matrix.transformPoint(vec3(x,y,2))),size);
  const origin=screen(0,.12),horizontal=screen(1,.12),vertical=screen(0,1.12);
  if(!origin||!horizontal||!vertical)return;
  const width=Math.hypot(horizontal.x-origin.x,horizontal.y-origin.y),height=Math.hypot(vertical.x-origin.x,vertical.y-origin.y);
  if(!Number.isFinite(width)||!Number.isFinite(height)||height<.001)return;
  const ratio=Math.max(.2,Math.min(5,width/height));
  for(const {white,black} of pomEyes){white.scale3D=vec3(.22,.22*ratio,1);black.scale3D=vec3(.12,.12*ratio,1)}
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
function findPath(target){return findMovementPath(movementBoard(),player,target,routeFor)}
function standableReachable(){
  const board=movementBoard(),key=`${nodeKey(player)}:${movementBoardKey}`;if(key===reachableKey)return reachableValue;
  const q=[player],seen=new Set([nodeKey(player)]),shown=new Set(seen),out=[];
  const walkPlan=(from,to)=>isSingleMove(from,to)?routeFor(from,to):null;
  while(q.length){
    const p=q.shift();
    // Only a jump directly from Pom can appear as a movement target.
    const getPlan=p===player?routeFor:walkPlan;
    for(const n of movementNeighbors(board,p,getPlan)){
      const k=nodeKey(n);
      if(!shown.has(k)){shown.add(k);out.push(n)}
      if(isSingleMove(p,n)&&!seen.has(k)){seen.add(k);q.push(n)}
    }
  }
  reachableKey=key;reachableValue=out.filter(p=>board.validNode(p));return reachableValue;
}
function reachableTop(target){return target}
function canReach(g){return canReachPiece(movementBoard(),movementBoard().groups[g?.id],player)}
function goalNode(){const g=byCell[goalCell.y]?.[goalCell.x];return{x:goalCell.x,y:goalCell.y,z:Math.max(0,(g?.depth||0)-1)}}
function save(){history.push({player:{...player},depths:groups.map(g=>g.depth),selected:selected?.id??null,won});if(history.length>80)history.shift()}
function canSaveUnfinished(){return !warpPipePreview&&!isMakerPlaytest&&!cameraLab&&!interactionLab&&activeLevel.kind==='puzzle'&&!activeLevel.temporaryPlaytest}
function saveUnfinished(){
  if(!canSaveUnfinished())return;
  const start=activeLevel.start,initial=groups.every((g,i)=>g.depth===(activeLevel.initialDepths?.[i]??0));
  if(!history.length&&initial&&player.x===start.x&&player.y===(start.y??H)&&player.z===start.z){unfinished.remove(activeLevel.id);return}
  unfinished.save(activeLevel,{player:{...player},depths:groups.map(g=>g.depth),selected:selected?.id??null,history:structuredClone(history)});
}
function validSavedPosition(state){
  if(!state||!Array.isArray(state.depths)||state.depths.length!==groups.length||state.depths.some(n=>!Number.isInteger(n)||n<0||n>3))return false;
  const p=state.player;if(!p||![p.x,p.y,p.z].every(Number.isInteger))return false;
  return createMovementBoard(mural,state.depths).validNode(p);
}
function resumeUnfinished(){
  if(!canSaveUnfinished())return;
  const state=unfinished.get(activeLevel);if(!validSavedPosition(state))return;
  groups.forEach((g,i)=>g.depth=state.depths[i]);player={...state.player};
  history=Array.isArray(state.history)?state.history.slice(-80).filter(validSavedPosition).map(item=>({...item,won:false})):[];
  selected=groups.find(g=>g.id===state.selected)??null;clearMovementRoutes();saveUnfinished();
}
function safeManipulation(g,next,dir){return safePieceChange(movementBoard(),movementBoard().groups[g.id],player,next,dir)}
function canInteract(g){return g&&canReach(g)&&((g.depth<3&&safeManipulation(g,g.depth+1,1))||(g.depth>0&&safeManipulation(g,g.depth-1,-1)))}
function autoSelectNearbyPiece(){
  if(!controlFeatures.enabled('autoSelectPieces')||busy||won||canInteract(selected))return;
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
function checkerDarkShade(pigment){
  const contrast=pigment.g>pigment.r*1.15?(pigment.g>pigment.b*1.15?.69:.80):.90;
  return pigment.r>.9&&pigment.g>.75&&pigment.b<.4?new Color(1,.88,.65):new Color(contrast,contrast,contrast);
}
function diamondBasePigment(pigment){
  const subtle=new Color(.94),previous=checkerDarkShade(pigment),midpoint=new Color(
    (subtle.r+previous.r)/2,
    (subtle.g+previous.g)/2,
    (subtle.b+previous.b)/2,
  );
  return new Color(pigment.r*midpoint.r,pigment.g*midpoint.g,pigment.b*midpoint.b);
}
function topFaceShade(x,z,pigment){
  if((x+z)%2!==1)return new Color(1);
  return checkerDarkShade(pigment);
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
function diamondTopFace(mesh,map,bounds,pigment){
  const [u0,u1,v0,v1]=bounds;
  squareFace(mesh,(x,z)=>map(x,.5,z),bounds,diamondBasePigment(pigment),vec3(0,1,0));
  for(let level=Math.floor(v0);level<Math.ceil(v1);level++){
    const lo=Math.max(v0,level),hi=Math.min(v1,level+1),cx=(u0+u1)/2,cz=(lo+hi)/2;
    // The motif grows with each pull row, while staying clear of the tile edge.
    const radius=Math.min(.42,.16+level*.1,(u1-u0)*.45,(hi-lo)*.45);
    const y=.5+.004;
    const corners=[[cx-radius,cz],[cx,cz+radius],[cx+radius,cz],[cx,cz-radius]];
    const edgeLength=Math.SQRT2*radius,cut=Math.min(.025,edgeLength*.12),trim=cut/edgeLength,outline=[];
    for(let i=0;i<corners.length;i++){
      const corner=corners[i],previous=corners[(i+corners.length-1)%corners.length],next=corners[(i+1)%corners.length];
      const start=[corner[0]+(previous[0]-corner[0])*trim,corner[1]+(previous[1]-corner[1])*trim];
      const end=[corner[0]+(next[0]-corner[0])*trim,corner[1]+(next[1]-corner[1])*trim];
      for(let step=0;step<=4;step++){
        const t=step/4,s=1-t;
        outline.push([s*s*start[0]+2*s*t*corner[0]+t*t*end[0],s*s*start[1]+2*s*t*corner[1]+t*t*end[1]]);
      }
    }
    const points=[map(cx,y,cz),...outline.map(([x,z])=>map(x,y,z))],indices=[];
    for(let i=1;i<=outline.length;i++)indices.push(0,i,i===outline.length?1:i+1);
    // Full palette pigment reproduces the light checkerboard tone, while the
    // surrounding face uses the darker tone of that same piece color. Keep the
    // vertices counter-clockwise from above so the face normal points up; the
    // solid-piece shadow shader otherwise mistakes the motif for an underside.
    mesh.addTriangles(points,indices,vec3(0,1,0),undefined,pigment);
  }
}
function prismMesh(cx,cy,depth,side,color,top=false,start=0,pulledDepth=depth,walkable=true,exposed={left:true,right:true,bottom:true}){
  side=cameraSlant(side);
  const pigment=palette[color],m=new Mesh(),s=depthSkew(),lo=-.5,hi=.5,defaultFace=top?new Color(1):shaded(pigment,.72);
  const P=(x,y,z)=>vec3(x+s*z,stretchY(y),z);
  const quad=(a,b,c,d,face=defaultFace)=>m.addQuad(P(...a),P(...b),P(...c),P(...d),face);
  if(top){
    if(walkabilityFacesEnabled())walkabilityFace(m,(x,z)=>P(x,.5,z),[lo,hi,start,start+depth],walkable);
    else if(depthColorsEnabled())gradientBandFace(m,(x,z)=>P(x,.5,z),[lo,hi,start,start+depth],depthRowColor(pulledDepth,start),vec3(0,1,0));
    else {
      if(diamondShapesEnabled())diamondTopFace(m,(x,y,z)=>P(x,y,z),[lo,hi,start,start+depth],pigment);
      else squareFace(m,(x,z)=>P(x,.5,z),[lo,hi,start,start+depth],new Color(1),vec3(0,1,0));
    }
  }
  else {
    squareFace(m,(x,y)=>P(x,y,depth),[lo,hi,lo,hi],defaultFace,vec3(0,0,1));
    quad([hi,lo,0],[lo,lo,0],[lo,hi,0],[hi,hi,0]);
    // Per-cell top meshes provide the upper surface. This quad closes the bottom.
    if(exposed.bottom)quad([lo,lo,0],[hi,lo,0],[hi,lo,depth],[lo,lo,depth]);
    const sx=side>0?lo:hi;
    const ox=side>0?hi:lo;
    const nearVisible=side>0?exposed.left:exposed.right,farVisible=side>0?exposed.right:exposed.left;
    if(depthColorsEnabled()){
      for(let z=0;z<depth;z++){
        const face=depthRowColor(Math.ceil(depth),z);
        if(nearVisible)gradientBandFace(m,(y,z)=>P(sx,y,z),[lo,hi,z,Math.min(depth,z+1)],face,vec3(Math.sign(sx),0,0),true);
        if(farVisible)gradientBandFace(m,(y,z)=>P(ox,y,z),[lo,hi,z,Math.min(depth,z+1)],face,vec3(Math.sign(ox),0,0),true);
      }
    }else{
      if(nearVisible)squareFace(m,(y,z)=>P(sx,y,z),[lo,hi,0,depth],sidePalette[color],vec3(Math.sign(sx),0,0));
      if(farVisible)squareFace(m,(y,z)=>P(ox,y,z),[lo,hi,0,depth],defaultFace,vec3(Math.sign(ox),0,0));
    }
  }
  m.doubleSided=true;return m;
}
function rebuildBlockMeshes(){for(const o of blockObjects)o.destroy();blockObjects=[];for(const g of groups){g.objects=[];for(const c of g.cells){const p=vec3(c.x+.5,H-c.y-.5,0),o=makeSurface(p,frontTileMesh(),palette[g.color]);g.objects.push(o);blockObjects.push(o)}}syncBlocks()}
let pieceDragPreview=null,pieceDragAnchor=null;
function visualDepth(g){return g.depth+(pieceDragPreview?.piece===g?pieceDragPreview.offset:0)}
function syncExtrusions(){for(const g of groups)g.lightboxSurfaces=[];for(const o of [...extrusionObjects,...extrusionOutlines,...topPickObjects])o.destroy();extrusionObjects=[];extrusionOutlines=[];topPickObjects=[];topObjectInfo.clear();sideObjectInfo.clear();
  const reachable=walkabilityFacesEnabled()?reachableSurfaceKeys():null;
  for(const g of groups)if(!visualDepth(g)){
    const points=[worldPoint(-.5,.5,0),worldPoint(-.5,-.5,0),worldPoint(.5,-.5,0),worldPoint(.5,.5,0)];
    const mesh=cardboardMesh(points,palette[g.color],vec3(-depthSkew()*CARDBOARD_THICKNESS,0,-CARDBOARD_THICKNESS));
    for(const c of g.cells){
      const card=makeSurface(worldPoint(c.x+.5,H-c.y-.5,0),mesh,new Color(1));
      extrusionOutlines.push(card);sideObjectInfo.set(card,g);g.lightboxSurfaces.push(card);
    }
  }
  for(const g of groups)if(visualDepth(g)){
    const combinedTop=new Mesh();
    for(const c of g.cells){
      const base=vec3(c.x+.5,stretchY(H-c.y-.5),0),exposed={left:byCell[c.y]?.[c.x-1]!==g,right:byCell[c.y]?.[c.x+1]!==g,bottom:byCell[c.y+1]?.[c.x]!==g},dark=makeSurface(base,prismMesh(c.x,c.y,visualDepth(g),viewSide,g.color,false,0,visualDepth(g),true,exposed),new Color(1));
      extrusionOutlines.push(dark);sideObjectInfo.set(dark,g);g.lightboxSurfaces.push(dark);
      for(let z=0;z<visualDepth(g);z++){
        const walkable=reachable?.has(nodeKey({x:c.x,y:c.y,z}))??true;
        const tile=prismMesh(c.x,c.y,Math.min(1,visualDepth(g)-z),viewSide,g.color,true,z,Math.ceil(visualDepth(g)),walkable);
        const color=depthColorsEnabled()?new Color(1):platformTopColor(g,c.x,z);
        combinedTop.combine(tile,base,color);
        const pick=makeSurface(base,tile,color);pick.render3D=()=>{};topPickObjects.push(pick);topObjectInfo.set(pick,{x:c.x,y:c.y,z});
      }
    }
    combinedTop.doubleSided=true;
    const top=makeSurface(vec3(),combinedTop,new Color(1));
    extrusionObjects.push(top);g.lightboxSurfaces.push(top);
  }
}
let sceneryWallZ=null,wallJoinMesh,wallJoinKey,wallJoinStyle;
function drawWallGroundJoin(){
  if(sceneryWallZ===null||cameraLab||(isPreviewLevel(activeLevel)&&!isBackgroundStudio()))return;
  const camera=render3D.camera,width=wrap.clientWidth,height=wrap.clientHeight,size=vec2(width,height),z=sceneryWallZ+.02;
  if(!wallJoinStyle||wallJoinStyle.width!==width||wallJoinStyle.height!==height){const style=getComputedStyle(wrap);wallJoinStyle={width,height,pixels:parseFloat(style.borderTopWidth)||2,color:style.borderTopColor}}
  const {pixels,color}=wallJoinStyle;
  const key=[width,height,z,pixels,color,camera.pos.x,camera.pos.y,camera.pos.z,camera.rotation.x,camera.rotation.y,camera.rotation.z,camera.fov,camera.orthographic].join(':');
  if(key!==wallJoinKey){
    const a=render3D.worldToScreen(vec3(W/2-1,0,z),size),b=render3D.worldToScreen(vec3(W/2+1,0,z),size);
    if(!a||!b||Math.abs(b.x-a.x)<.001)return;
    const slope=(b.y-a.y)/(b.x-a.x),line=x=>vec2(x,a.y+(x-a.x)*slope),normal=vec2(slope,-1).normalize(pixels);
    // Put the stroke on the wall side of the join so the ground cannot hide
    // half of it. Screen-space construction keeps the CSS-pixel width fixed.
    const left=line(-pixels),right=line(width+pixels),screen=[left.add(normal),right.add(normal),right,left];
    const points=screen.map(point=>{const ray=render3D.screenToRay(point,size);return ray.getPosition((z-ray.origin.z)/ray.direction.z)});
    if(points.some(point=>!Number.isFinite(point.x)||!Number.isFinite(point.y)))return;
    wallJoinMesh?.dispose();wallJoinMesh=new Mesh().addQuad(...points);wallJoinMesh.doubleSided=true;wallJoinKey=key;
  }
  const channels=color.match(/[\d.]+/g)?.map(Number)??[17,17,17];
  render3D.drawMesh(wallJoinMesh,buildMatrix(vec3(),vec3(),vec3(1)),undefined,new Color(channels[0]/255,channels[1]/255,channels[2]/255));
}
function drawMapOutlines(){
  const material={shader:render3D.shader,receiveShadow:render3D.receiveShadow,lighting:render3D.lighting,emissive:render3D.emissive};render3D.shader=undefined;render3D.receiveShadow=false;render3D.lighting=false;render3D.emissive=1;
  drawWallGroundJoin();
  const height=wrap.clientHeight,size=vec2(wrap.clientWidth,height),center=worldPoint(W/2,H/2,0),screenCenter=render3D.worldToScreen(center,size),screenX=render3D.worldToScreen(worldPoint(W/2+1,H/2,0),size),screenY=render3D.worldToScreen(worldPoint(W/2,H/2+1,0),size);
  const cellPixels=screenCenter&&screenX&&screenY?Math.sqrt(Math.abs((screenX.x-screenCenter.x)*(screenY.y-screenCenter.y)-(screenX.y-screenCenter.y)*(screenY.x-screenCenter.x))):64;
  const strokePixels=Math.max(2,Math.min(2.4,2.4*cellPixels/64)),stroke=strokePixels*viewSpan()/height,bias=render3D.camera.getForward().scale(-.026),seen=new Set,joins=new Map;
  const pointKey=p=>{const q=render3D.worldToScreen(p,size);return q?`${q.x.toFixed(1)},${q.y.toFixed(1)}`:null};
  const edge=(a,b)=>{a=puzzlePoint(a);b=puzzlePoint(b);const ka=pointKey(a),kb=pointKey(b),key=ka<kb?`${ka}|${kb}`:`${kb}|${ka}`,aa=a.add(bias),bb=b.add(bias);if(!ka||!kb||seen.has(key))return;seen.add(key);joins.set(ka,aa);joins.set(kb,bb);render3D.drawLine(aa,bb,stroke,inkColor)};
  const sameBlock=(g,x,y)=>byCell[y]?.[x]===g;
  for(const g of groups){for(const c of g.cells){
    const x0=c.x,x1=c.x+1,y1=H-c.y,y0=y1-1,d=visualDepth(g);
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
  drawSelectedOutline();drawReferenceSquares();drawHoverSpot();
  render3D.flush();Object.assign(render3D,material);
}
// Boundary edges keep the selected material on their screen-right side, including holes.
function roundedInsetLoop(points,offset,radius){if(points.length<3)return[];const sign=-1,verts=points.map((v,i)=>{const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length],normal=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return{x:-dy/l*sign,y:dx/l*sign}},n0=normal(prev,v),n1=normal(v,next),sx=n0.x+n1.x,sy=n0.y+n1.y,l=Math.hypot(sx,sy)||1,n={x:sx/l,y:sy/l},k=offset/(n.x*n1.x+n.y*n1.y||1);return{x:v.x+n.x*k,y:v.y+n.y*k}}),result=[];for(let i=0;i<verts.length;i++){const v=verts[i],prev=verts[(i+verts.length-1)%verts.length],next=verts[(i+1)%verts.length],unit=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return{x:dx/l,y:dy/l}},u0=unit(v,prev),u1=unit(v,next),r=Math.min(radius,Math.hypot(v.x-prev.x,v.y-prev.y)/2,Math.hypot(v.x-next.x,v.y-next.y)/2),a={x:v.x+u0.x*r,y:v.y+u0.y*r},b={x:v.x+u1.x*r,y:v.y+u1.y*r};for(let step=0;step<=5;step++){const t=step/5,s=1-t;result.push({x:s*s*a.x+2*s*t*v.x+t*t*b.x,y:s*s*a.y+2*s*t*v.y+t*t*b.y})}}return result}
function drawSelectedOutline(){
  const g=selected,selection=currentDesign().selection;
  if(!g||won||!selection.enabled||lightboxEnabled())return;
  const color=designColor(selection.color),solid=selection.style==='solid';
  const width=wrap.clientWidth,height=wrap.clientHeight,size=vec2(width,height),z=visualDepth(g)+.028,offset=5.5,radius=6,dash=6,gap=4,stroke=2.2*viewSpan()/height;
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
      const screen=loop.map(([x,y])=>render3D.worldToScreen(puzzlePoint(worldPoint(x,y,z)),size));
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
function syncFloorGrid(){
  if(worldPresentation()){syncStudyFloor();return}
  const showFloor=currentBackgroundConfiguration()?.showGuides??true,custom=customFloorGridEnabled(),floor=currentDesign().floorGrid;
  wrap.dataset.floorStyle=custom?'walkability-custom-grid':'walkability-grid';
  const o=backgroundObjects[backgroundObjects.length-1];if(!o)return;
  if(!showFloor){o.mesh=undefined;return}
  const m=new Mesh(),width=wrap.clientWidth,height=wrap.clientHeight,ortho=render3D.camera.orthographic,aspect=width/height,worldWidth=ortho*aspect,line=(custom?floor.gridWidth:1.5)*ortho/height,gridColor=custom?designColor(floor.gridColor):new Color(1,1,1,.55),floorWash=custom?designColor(floor.color):new Color(1,1,1,0),size=vec2(width,height);
  if(custom){gridColor.a=floor.gridOpacity;floorWash.a=floor.opacity}
  render3D.updateMatrices(aspect);
  const toPlane=p=>{const q=render3D.worldToScreen(p,size);return vec2((q.x/width-.5)*worldWidth,(.5-q.y/height)*ortho)};
  const horizon=render3D.worldToScreen(vec3(4,0,0),size),hy=(.5-horizon.y/height)*ortho;
  const addPlaneLine=(p,q)=>{if(floorMarkersEnabled()||line<=0||gridColor.a<=0)return;const dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy)||1,nx=-dy/length*line/2,ny=dx/length*line/2,limit=hy-line/2;let poly=[vec2(p.x+nx,p.y+ny),vec2(q.x+nx,q.y+ny),vec2(q.x-nx,q.y-ny),vec2(p.x-nx,p.y-ny)],clipped=[];for(let i=0;i<poly.length;i++){const cur=poly[i],prev=poly[(i+poly.length-1)%poly.length],ci=cur.y<=limit,pi=prev.y<=limit;if(ci!==pi){const t=(limit-prev.y)/(cur.y-prev.y);clipped.push(vec2(prev.x+(cur.x-prev.x)*t,limit))}if(ci)clipped.push(cur)}if(clipped.length<3)return;const center=vec2(clipped.reduce((sum,v)=>sum+v.x,0)/clipped.length,clipped.reduce((sum,v)=>sum+v.y,0)/clipped.length),vertices=[vec3(center.x,center.y,0),...clipped.map(v=>vec3(v.x,v.y,0))],indices=[];for(let i=1;i<=clipped.length;i++)indices.push(0,i,i===clipped.length?1:i+1);m.addTriangles(vertices,indices,vec3(0,0,1),undefined,gridColor)};
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
  for(const object of [...blockObjects,...extrusionObjects,...extrusionOutlines]){object.emissive=1;object.shader=enabled?solidPieceShadowShader:solidPieceGlowShader;object.castShadow=false;object.receiveShadow=enabled}
  // Prism sides and each piece's combined top form one closed casting surface. The
  // offset painted front only receives shadows; there is no duplicate top layer.
  for(const object of [...extrusionOutlines,...extrusionObjects])object.castShadow=enabled;
  // Resting pieces now have solid cardboard backs, which cast their shadows.
  // Their painted front overlays must not cast a second offset shadow.
  movementMarkers?.setShadowShader(enabled?pieceShadowShader:undefined);
  for(const part of pomParts){part.emissive=1;part.shader=enabled&&!pomGlowOn?pieceShadowShader:undefined;part.castShadow=enabled&&part===playerObject&&!pomGlowOn;part.receiveShadow=enabled&&!pomGlowOn}
  for(const part of [flagPole,flagCloth,flagVase,flagCap,flagPrint].filter(Boolean)){part.emissive=1;part.shader=enabled?pieceShadowShader:undefined;part.castShadow=enabled&&!!part.mesh&&part!==flagPrint;part.receiveShadow=enabled}
  if(!enabled){
    shadowFloor?.destroy();shadowFloor=undefined;render3D.sunDirection=vec3(-.45,.8,.5);render3D.sunColor=new Color(1,.91,.75);render3D.ambientColor=new Color(.52,.51,.4);render3D.ambientGroundColor=new Color(.35,.4,.3);return;
  }
  const shadows=currentDesign().shadows,azimuth=shadows.direction*Math.PI/180,elevation=shadows.elevation*Math.PI/180,strength=shadows.strength;
  render3D.sunDirection=vec3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation));
  render3D.sunColor=new Color(strength,strength,strength);render3D.ambientColor=new Color(1-strength,1-strength,1-strength);render3D.ambientGroundColor=render3D.ambientColor;
  render3D.shadowBias=.0008;render3D.shadowMapSize=2048;const visual=puzzleVisualBounds();render3D.shadowRange=Math.max(visual.right-visual.left,visual.height)+6;render3D.shadowCenter=worldPoint((visual.left+visual.right)/2,visual.height/2,1.5);
  if(worldPresentation()&&cameraScenery.bounds){const b=cameraScenery.bounds;render3D.shadowRange=Math.max(b.right-b.left,b.front-b.back,visual.height)+6;render3D.shadowCenter=vec3((b.left+b.right)/2,visual.height/3,(b.back+b.front)/2)}
  render3D.shadowSoftness=SHADOW_BLUR_RADIUS*render3D.shadowMapSize/render3D.shadowRange;
  if(!shadowFloor){
    const mesh=new Mesh();mesh.addQuad(vec3(-1,0,-1),vec3(1,0,-1),vec3(1,0,1),vec3(-1,0,1));mesh.doubleSided=true;
    shadowFloor=makeSurface(vec3(),mesh,new Color(1));shadowFloor.scale3D=vec3((W+8)/2,1,5);shadowFloor.shader=groundShadowShader;shadowFloor.transparent=true;shadowFloor.castShadow=false;shadowFloor.receiveShadow=true;
  }
  // The receiver begins in front of the wall (z > 0), below the horizon plane.
  // Its projection therefore cannot paint the sky, even after panning or zooming.
  shadowFloor.scale3D=vec3((visual.right-visual.left+8)/2,1,4);shadowFloor.pos3D=worldPoint((visual.left+visual.right)/2,-.008,4.025);
}
let pulsePiece=null,pulseStart=0;
function lightboxEnabled(){return worldPresentation()&&(cameraLab?cameraState.selectionEffect==='lightbox':controlFeatures.enabled('selectionLightbox'))}
const reducedSelectionMotion=matchMedia('(prefers-reduced-motion:reduce)');
function selectionPhase(now=performance.now()){
  if(pulsePiece!==selected){pulsePiece=selected;pulseStart=now}
  return reducedSelectionMotion.matches?.6:(1-Math.cos((now-pulseStart)*Math.PI*2/1400))/2;
}
function selectedSurfaceColor(g,now=performance.now()){
  const color=palette[g.color];if(g!==selected||won)return color;
  const phase=selectionPhase(now);
  if(lightboxEnabled()){
    const shifted=selectionColor(color,phase,Math.min(1,cameraState.lightboxStrength*1.25));
    return new Color(shifted.r,shifted.g,shifted.b);
  }
  return tinted(color,reducedSelectionMotion.matches?.12:.26*phase);
}
function updateSelectionLightbox(){
  const pulse=selectionPhase();
  for(const g of groups)for(const object of g.objects)object.shader=render3D.shadows?(g===selected&&!won&&lightboxEnabled()?highlightedPieceShadowShader:solidPieceShadowShader):solidPieceGlowShader;
  wrap.dataset.selectionGlow='none';wrap.dataset.selectionSpill='false';wrap.dataset.selectionEffect=lightboxEnabled()?'lightbox':'original';wrap.dataset.selectionLightActive='false';wrap.dataset.selectionPulse=pulse.toFixed(3);wrap.dataset.cardboardThickness=String(CARDBOARD_THICKNESS);
}
function syncBlocks(){for(const g of groups)for(let i=0;i<g.cells.length;i++){const c=g.cells[i],o=g.objects[i],pose=blockPose(c,visualDepth(g)),face=selectedSurfaceColor(g);o.pos3D=vec3(pose.pos.x,pose.pos.y,pose.pos.z+.025);o.scale3D=vec3(1,stretchY(1),1);o.color=face}syncExtrusions();syncFloorGrid();syncDesignLighting();updateSelectionLightbox()}
function worldPosition(n,offset=.5){const top=n.y===H?0:H-n.y;return worldPoint(n.x+.5,top+.22,n.z+offset)}
function syncBackground(){
  if(!worldPresentation())cameraScenery.destroy();
  if(worldPresentation()){
    for(const object of backgroundObjects.slice(0,3)){object.mesh=undefined;object.tileInfo=undefined}
    if(gameReady)requestLevelEnvironment();
    if(activeEnvironmentTextures){
      const reference=cameraScenery.update({state:{...cameraState,puzzleMounted:!cameraLab&&(!isPreviewLevel(activeLevel)||isBackgroundStudio()),backgroundDistance:currentBackgroundConfiguration()?.backgroundDistance??cameraState.backgroundDistance,...(currentBackgroundConfiguration()?{background:currentBackgroundConfiguration().layers!=='foreground',foreground:currentBackgroundConfiguration().layers!=='background'}:{}),environmentShadowStrength:currentBackgroundConfiguration()?.environmentShadowStrength??1,groundShadowBlur:SHADOW_BLUR_RADIUS,sceneryShadows:controlFeatures.enabled('pieceShadows'),cutoutStyle:currentBackgroundConfiguration()?.cutoutStyle,sceneryLayout:currentBackgroundConfiguration()?.sceneryLayout,scenicAtmosphere:currentBackgroundConfiguration()?.scenicAtmosphere===true},environment:activeEnvironment,textures:activeEnvironmentTextures,width:W,height:H,artworkBounds:puzzleVisualBounds(),yaw:cameraYaw(),target:cameraFocus??viewTarget??sceneFrame(wrap.clientWidth,wrap.clientHeight).target});
      sceneryWallZ=reference.wallZ??null;
      wrap.dataset.sceneryMountOffset=String(reference.mountOffset??0);wrap.dataset.sceneryWallZ=String(reference.wallZ??'');wrap.dataset.environmentShadowStrength=String(reference.environmentShadowStrength??1);wrap.dataset.groundShadowBlur=String(reference.groundShadowBlur??0);wrap.dataset.shadowReceivers=String(reference.shadowReceivers??0);wrap.dataset.backgroundDistance=reference.distance?.toFixed(2)??'';wrap.dataset.scenerySource=reference.source??'previous-artwork';wrap.dataset.sceneryContacts=JSON.stringify(cameraScenery.contacts);
      const size=vec2(wrap.clientWidth,wrap.clientHeight),points=reference.points.map(point=>render3D.worldToScreen(point,size)),[left,center,right]=points;
      const valid=points.every(point=>point&&Number.isFinite(point.x)&&Number.isFinite(point.y));
      const slope=valid?(right.y-left.y)/(right.x-left.x||1):0,y=valid?(reference.curved?center.y:center.y+slope*(size.x/2-center.x)):NaN;
      cameraLab?.measure({percent:y/size.y*100,tilt:Math.atan(slope)*180/Math.PI,curved:reference.curved,unit:viewUnit||size.y/viewSpan(),cameraHeight:render3D.camera.pos.y});
    }
    wrap.dataset.environment=activeEnvironment.id;wrap.dataset.scenerySetting=cameraState.setting;return;
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
function warpPomPosition(scaleY=1,lift=0){
  // The pipe and Pom use the same cell center. Place Pom's lowest point on
  // the lowered rim, accounting for the billboard's camera-facing tilt.
  const endpoint=warpEndpoints().findIndex(({cell})=>cell.x===player.x&&cell.y===player.y);
  const up=render3D.camera.getUp();
  const rimTop=(.15+.22*(warpPipeMotion[endpoint]?.value??0))*.72;
  const bottom=.379*.56*scaleY*Math.max(0,up.y);
  return worldPoint(player.x+.5,H-player.y+rimTop+bottom+lift,player.z+.5);
}
function syncPlayer(){
  resetPomShape();const onPipe=warpPlayerOnPipe();playerObject.setMesh(pomBlob);pomBody.setMesh(pomBlob);
  const jump=celebration?.jump??0,p=onPipe?warpPomPosition():worldPosition({...player,z:player.z+(pieceDragPreview?.offset??0)});
  playerObject.pos3D=p.add(vec3(0,stretchY(jump),0)).add(render3D.camera.getForward().scale(onPipe?0:-.045));
  playerObject.rotation3D=render3D.camera.rotation.copy();playerObject.scale3D=vec3(.72*(1-jump*.2),.56*(1+jump*.2),.018);syncPomMatrix();
}
function syncFlag(){
  const g=byCell[goalCell.y]?.[goalCell.x];if(!flagPole||!g)return;
  if(warpPipePreview){for(const part of [flagPrint,flagPole,flagCloth,flagVase,flagCap])part.mesh=undefined;syncWarpPipePreview();return}
  const raised=visualDepth(g)>0,visible=raised&&!won,cx=goalCell.x+.5,cy=H-goalCell.y-.5;
  // The front-face badge disappears together with its flag when the piece rises.
  flagPrint.mesh=raised||won?undefined:flagMeshes.print;flagPrint.tileInfo=raised||won?undefined:flagMeshes.printTile;flagPrint.pos3D=vec3(cx,stretchY(cy),.045);flagPrint.scale3D=vec3(1,stretchY(1),1);
  for(const [part,mesh]of [[flagPole,flagMeshes.pole],[flagCloth,flagMesh],[flagVase,flagMeshes.vase],[flagCap,flagMeshes.cap]]){
    part.mesh=visible?mesh:undefined;part.rotation3D=vec3();part.scale3D=vec3(1,stretchY(1),1);part.castShadow=visible&&render3D.shadows;
  }
  syncWarpPipePreview();
  if(!raised)return;
  // Center the flag in the landing square; Pom takes its place on completion.
  const base=worldPoint(cx,H-goalCell.y,visualDepth(g)-.5);
  flagVase.pos3D=base.add(vec3(0,stretchY(.005),0));
  flagPole.pos3D=base.add(vec3(0,stretchY(.43),0));flagPole.scale3D=vec3(1,stretchY(1),1);
  flagCloth.pos3D=base.add(vec3(.19,stretchY(.65),.006));flagCloth.scale3D=vec3(.38,stretchY(.24),1);
  flagCap.pos3D=base.add(vec3(0,stretchY(.78),0));
}
let warpPreviewAssets,warpPreviewEnds=[],warpPreviewPlayerKey='',warpPreviewAnimation=0,warpPreviewMouth=1,warpPreviewWarping=false,warpPreviewOpeningVisible=false;
const warpPipeMotion=[],warpOpeningMotion=[];let warpPipesMoving=false,warpAction;
function warpEndpoints(){
  if(warpPipePreview)return groups.slice(0,2).map(group=>({group,cell:group.cells.reduce((best,cell)=>cell.y<best.y?cell:best)}));
  return (activeLevel.warpPairs??[]).flatMap(pair=>pair.map(cell=>({group:byCell[cell.y]?.[cell.x],cell}))).filter(end=>end.group);
}
function setupWarpEnds(){
  for(const parts of warpPreviewEnds)for(const object of Object.values(parts))object.destroy();
  warpPreviewEnds=[];warpPipeMotion.length=warpOpeningMotion.length=0;warpPreviewPlayerKey='';warpPipesMoving=false;
  const count=warpPipePreview?2:(activeLevel.warpPairs?.length??0)*2;
  if(!count)return;
  warpPreviewAssets??=createWarpPipeAssets();
  warpPreviewEnds=Array.from({length:count},(_,i)=>warpPreviewAssets.createEnd(Math.floor(i/2),count>2));
  for(const parts of warpPreviewEnds)for(const object of Object.values(parts))object.warpTile=object.tileInfo;
}
function warpPlayerOnPipe(){
  if(!warpPreviewEnds.length)return false;
  return warpEndpoints().some(({group,cell})=>{const depth=visualDepth(group),above=byCell[cell.y-1]?.[cell.x];return depth>0&&(!above||visualDepth(above)<depth)&&player.x===cell.x&&player.y===cell.y&&player.z===depth-1});
}
function syncWarpPipePreview(){
  if(!warpPreviewEnds.length)return;
  const endpoints=warpEndpoints();
  const exposed=endpoints.map(({group,cell})=>{
    const depth=visualDepth(group),above=byCell[cell.y-1]?.[cell.x];
    return depth>0&&(!above||visualDepth(above)<depth);
  });
  const now=performance.now();warpPipesMoving=false;
  warpPreviewPlayerKey=`${player.x},${player.y},${player.z}`;
  endpoints.forEach(({group,cell},index)=>{
    const parts=warpPreviewEnds[index],depth=visualDepth(group),raised=exposed[index],active=!!(exposed[index-index%2]&&exposed[index-index%2+1]);
    const x=cell.x+.5,y=H-cell.y;
    const base=worldPoint(x,y,Math.max(0,depth-.5));
    const occupied=player.x===cell.x&&player.y===cell.y&&player.z===depth-1;
    const lowered=!active||occupied,target=lowered?0:1;
    let motion=warpPipeMotion[index];
    if(!motion||motion.group!==group){motion=warpPipeMotion[index]={group,value:target,from:target,target,start:now}}
    if(!raised){motion.value=motion.from=motion.target=target;motion.start=now}
    if(motion.target!==target){motion.from=motion.value;motion.target=target;motion.start=now}
    const progress=Math.min(1,Math.max(0,(now-motion.start)/350)),ease=progress*progress*(3-2*progress);
    motion.value=motion.from+(motion.target-motion.from)*ease;if(progress<1)warpPipesMoving=true;
    const openingTarget=active&&(!occupied||warpPreviewOpeningVisible)?1:0;
    let opening=warpOpeningMotion[index];
    if(!opening||opening.group!==group){opening=warpOpeningMotion[index]={group,value:openingTarget,from:openingTarget,target:openingTarget,start:now}}
    if(!raised){opening.value=opening.from=opening.target=openingTarget;opening.start=now}
    if(opening.target!==openingTarget){opening.from=opening.value;opening.target=openingTarget;opening.start=now}
    const openingProgress=Math.min(1,Math.max(0,(now-opening.start)/300)),openingEase=openingProgress*openingProgress*(3-2*openingProgress);
    opening.value=opening.from+(opening.target-opening.from)*openingEase;
    if(openingProgress<1)warpPipesMoving=true;
    for(const object of Object.values(parts)){object.mesh=undefined;object.tileInfo=undefined;object.castShadow=false}
    parts.badge.mesh=warpPreviewAssets.meshes.badge;parts.badge.tileInfo=parts.badge.warpTile;
    parts.badge.pos3D=worldPoint(x,H-cell.y-.5,depth).add(vec3(0,0,.05));
    parts.badge.scale3D=vec3(1,stretchY(1),1);
    if(!raised)return;
    const height=.72,offset=-.22*height*(1-motion.value);
    for(const name of [motion.value>.001?'body':null,'rim',active?(opening.value>.001?'opening':null):'cap'].filter(Boolean)){
      const object=parts[name];
      object.mesh=warpPreviewAssets.meshes[name];object.tileInfo=object.warpTile;
      object.pos3D=base.add(vec3(0,stretchY(offset),0));
      const mouth=occupied?warpPreviewMouth:1;
      const openingScale=name==='opening'?opening.value:1;
      object.scale3D=vec3(mouth*openingScale,stretchY(height),mouth*openingScale);
      object.castShadow=!!render3D.shadows&&(name==='body'||name==='rim');
    }
  });
}
const warpSphereMeshes=new Map();
function warpSphereMesh(amount){
  const step=Math.max(0,Math.min(16,Math.round(amount*16)));
  if(!warpSphereMeshes.has(step)){
    const t=step/16,shape=pomContour.map(([x,y])=>{const a=Math.atan2(y-.06,x);return [x*(1-t)+Math.cos(a)*.5*t,y*(1-t)+Math.sin(a)*.5*t]});
    warpSphereMeshes.set(step,makeFanMesh(shape));
  }
  return warpSphereMeshes.get(step);
}
const warpSmileFrames=new Map();
function warpSmileFrame(step){
  if(warpSmileFrames.has(step))return warpSmileFrames.get(step);
  const mesh=new Mesh(),radius=.018,start=step/24;
  const point=t=>{const x=-.21+.42*t;return [x,.07*(x/.21)**2]};
  const disk=([x,y])=>{
    const points=[vec3(x,y,0),...Array.from({length:12},(_,i)=>vec3(x+radius*Math.cos(i*Math.PI/6),y+radius*Math.sin(i*Math.PI/6),0))],indices=[];
    for(let i=1;i<=12;i++)indices.push(0,i,i===12?1:i+1);
    mesh.addTriangles(points,indices,vec3(0,0,1));
  };
  const segments=24-step;
  for(let i=0;i<segments;i++){
    const a=point(start+(1-start)*i/segments),b=point(start+(1-start)*(i+1)/segments);
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length*radius,ny=dx/length*radius;
    mesh.addQuad(vec3(a[0]+nx,a[1]+ny,0),vec3(a[0]-nx,a[1]-ny,0),vec3(b[0]-nx,b[1]-ny,0),vec3(b[0]+nx,b[1]+ny,0));
  }
  disk(point(start));if(segments)disk(point(1));mesh.doubleSided=true;
  warpSmileFrames.set(step,mesh);return mesh;
}
function resetWarpEyes(){
  if(warpSmile)warpSmile.mesh=undefined;
  pomBody.scale3D=vec3(.88,.88,1);
  for(let i=0;i<pomEyes.length;i++){
    const {white,black}=pomEyes[i],x=i? .14:-.14;
    white.pos3D=vec3(x,.12,2);black.pos3D=vec3(x,.12,2.2);
    white.rotation3D=vec3();black.rotation3D=vec3();
    white.color=new Color(1,1,1);black.color=new Color(.12,.1,.09);
    white.scale3D=vec3(.22,.28,1);black.scale3D=vec3(.12,.154,1);
  }
}
function animateWarpPreview(source=0,destination=1){
  if(warpPreviewEnds.length<2)return;
  if(!warpPipePreview&&(busy||won||levelLoading||introPlaying||!viewReady||!warpDestination(movementBoard(),player,activeLevel.warpPairs)))return;
  const token=++warpPreviewAnimation;
  warpPreviewMouth=1;warpPreviewWarping=true;warpPreviewOpeningVisible=false;if(pomLight)pomLight.intensity=0;resetWarpEyes();stopIntro();hideHelp();busy=false;
  if(warpPipePreview)groups[0].depth=groups[1].depth=1;else save();
  const endpoints=warpEndpoints(),cells=[endpoints[source].cell,endpoints[destination].cell];
  const place=index=>{const group=byCell[cells[index].y][cells[index].x];player={x:cells[index].x,y:cells[index].y,z:group.depth-1};syncBlocks();syncFlag();syncPlayer()};
  place(0);selected=null;clearMovementRoutes();updateUI();
  if(warpPipePreview&&!viewTouched){
    const left=cells[0],right=cells[1],span=Math.abs(right.x-left.x)+2.4;
    viewUnit=Math.min(wrap.clientWidth/span,wrap.clientHeight/4.5);
    viewTarget=worldPoint((left.x+right.x+1)/2,H-Math.min(left.y,right.y)+.15,.5);
    applyBoardView(false);
  }
  resetStudyFollow({paused:true});
  busy=true;updateUI();
  let start,atDestination=false;
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
  function tick(now){
    if(token!==warpPreviewAnimation)return;
    start??=now;const elapsed=now-start;
    if(elapsed>=1550&&!atDestination){atDestination=true;player={x:cells[1].x,y:cells[1].y,z:byCell[cells[1].y][cells[1].x].depth-1};syncBlocks();syncFlag()}
    // Shrink Pom into a small floating ball, then let it descend into the
    // opening. The arrival plays the same motion in reverse.
    let size,visibility,mouth,lift,squint;
    if(elapsed<200){size=1;visibility=1;mouth=1;lift=0;squint=0}
    else if(elapsed<450){size=1;visibility=1;mouth=1;lift=0;squint=smooth((elapsed-200)/250)}
    else if(elapsed<1000){const t=smooth((elapsed-450)/550);size=1-.52*t;visibility=1;mouth=1+.12*t;lift=.20*t;squint=1}
    else if(elapsed<1400){const t=smooth((elapsed-1000)/400);size=.48;visibility=t<.96?1:0;mouth=1.12;lift=.20-.52*t;squint=1}
    else if(elapsed<1700){size=.48;visibility=0;mouth=1.12;lift=-.32;squint=1}
    else if(elapsed<2100){const t=smooth((elapsed-1700)/400);size=.48;visibility=t>.04?1:0;mouth=1.12;lift=-.32+.52*t;squint=1}
    else if(elapsed<2650){const t=smooth((elapsed-2100)/550);size=.48+.52*t;visibility=1;mouth=1.12-.12*t;lift=.20*(1-t);squint=1}
    else {size=1;visibility=1;mouth=1;lift=0;squint=1-smooth((elapsed-2650)/250)}
    const showOpening=lift>.02||size<.98;
    if(showOpening!==warpPreviewOpeningVisible||Math.abs(mouth-warpPreviewMouth)>.01){warpPreviewOpeningVisible=showOpening;warpPreviewMouth=mouth;syncWarpPipePreview()}
    const morph=smooth((1-size)/.52);
    const sphere=warpSphereMesh(morph);playerObject.mesh=sphere;pomBody.mesh=sphere;
    // Keep the outline close to its full-size width as the outer shape shrinks.
    const fillScale=Math.max(.48,1-.12/Math.max(.24,size));
    pomBody.scale3D=vec3(fillScale,fillScale,1);
    for(let i=0;i<pomEyes.length;i++){
      const {white,black}=pomEyes[i],side=i?1:-1;
      if(squint>.5){
        // Two dark strokes meet toward the middle, like the reference's
        // tightly shut eyes; both strokes remain part of Pom's face.
        white.pos3D=vec3(side*.13,.035,2);black.pos3D=vec3(side*.13,-.015,2.2);
        white.rotation3D=vec3(0,0,side*.48);black.rotation3D=vec3();
        white.color=inkColor;black.color=inkColor;
        white.scale3D=vec3(.16,.045,1);black.scale3D=vec3(.16,.045,1);
      }else{
        white.pos3D=vec3(side*.14,.12,2);black.pos3D=vec3(side*.14,.12,2.2);
        white.rotation3D=black.rotation3D=vec3();white.color=new Color(1,1,1);black.color=new Color(.12,.1,.09);
        white.scale3D=vec3(.22,.28,1);black.scale3D=vec3(.12,.154,1);
      }
    }
    const visibleSize=Math.max(.001,size*visibility);
    // A little extra height makes the small pose nearly circular.
    const sy=visibleSize*(1+.25*(1-size));
    playerObject.pos3D=warpPomPosition(sy,lift);
    playerObject.scale3D=vec3(.72*visibleSize,.56*sy,.018);
    const smileStep=Math.min(24,Math.floor(24*smooth((elapsed-3500)/140)));
    warpSmile.mesh=elapsed>=1700&&elapsed<3680?warpSmileFrame(smileStep):undefined;
    syncPomMatrix();
    if(elapsed<3680)requestAnimationFrame(tick);
    else {busy=false;warpPreviewWarping=false;warpPreviewOpeningVisible=false;warpPreviewMouth=1;resetWarpEyes();syncPlayer();syncFlag();autoSelectNearbyPiece();saveUnfinished();updateUI()}
  }
  requestAnimationFrame(tick);
}
let pieceDragRangeKey='',pieceDragRanges={};
function pieceDragRange(g,dir){
  const key=`${activeLevel.id}:${groups.map(piece=>piece.depth).join(',')}:${g.id}:${player.x},${player.y},${player.z}`;
  if(key!==pieceDragRangeKey){pieceDragRangeKey=key;pieceDragRanges={}}
  if(pieceDragRanges[dir]!==undefined)return pieceDragRanges[dir];
  const depths=groups.map(piece=>piece.depth),index=groups.indexOf(g);let pose={...player},steps=0;
  while(steps<3){
    const board=createMovementBoard(mural,depths),next=depths[index]+dir;
    if(next<0||next>3||!canReachPiece(board,board.groups[g.id],pose)||!safePieceChange(board,board.groups[g.id],pose,next,dir))break;
    depths[index]=next;pose={...pose,z:pose.z+dir};steps++;
  }
  pieceDragRanges[dir]=steps;return steps;
}
function commitPieceDrag(dir,steps=1){
  if(!selected||busy||won||introPlaying||levelLoading||pieceDragRange(selected,dir)<steps)return;
  hideHelp();save();resetStudyFollow();selected.depth+=dir*steps;player={...player,z:player.z+dir*steps};autoSelectNearbyPiece();animateEffort();saveUnfinished();updateUI();
}
function pieceDragState(atGrab=false,piece=selected){
  if(!controlFeatures.enabled('pieceDragArrows')||controlFeatures.enabled('stackedPieceButtons')||!gameReady||busy||won||introPlaying||levelLoading||!viewReady||document.querySelector('.stage').inert||!document.querySelector('#menuScreen').hidden||!piece||!canReach(piece))return null;
  const g=piece,allowed=[-1,1].filter(dir=>g.depth+dir>=0&&g.depth+dir<=3&&safeManipulation(g,g.depth+dir,dir));
  if(!allowed.length)return null;
  // Keep handles at Pom's local interaction edge, independent of the shape's
  // centroid and of which parts happen to be visible from the current angle.
  const contact=pieceInteractionAnchor(g.cells,player);
  const size=vec2(wrap.clientWidth,wrap.clientHeight),x=atGrab&&pieceDragAnchor?.piece===g?pieceDragAnchor.x:Math.floor(contact.x)+.5,y=atGrab&&pieceDragAnchor?.piece===g?pieceDragAnchor.y:H-player.y+1.08;
  const project=(dx,z)=>render3D.worldToScreen(puzzlePoint(worldPoint(x+dx,y,z)),size);
  const depth=visualDepth(g),anchor=project(0,depth+.025);
  if(!anchor)return null;
  const pigment=palette[g.color],arrowColor=`rgb(${Math.round(pigment.r*255)} ${Math.round(pigment.g*255)} ${Math.round(pigment.b*255)})`;
  const directions={};
  for(const dir of allowed){
    // A vector arrow lies in the X/Z plane: perspective foreshortens its head
    // and shaft exactly as it does the piece's top surfaces.
    const end=project(0,depth+.025+dir),length=end&&Math.hypot(end.x-anchor.x,end.y-anchor.y);
    if(!end||length<4)continue;
    const axis={x:(end.x-anchor.x)/length,y:(end.y-anchor.y)/length};
    // Build the tail in board units so each square tracks the cube's top face
    // at every zoom level, including its perspective and incline.
    const maxDepth=pieceDragRange(g,dir);
    const tailCount=maxDepth, square=.8;
    const pullSteps=allowed.includes(1)?pieceDragRange(g,1):0;
    const pushSteps=allowed.includes(-1)?pieceDragRange(g,-1):0;
    const arrowPoint=(dx,z)=>project(dx,z);
    const tails=Array.from({length:tailCount},(_,i)=>{
      const center=dir<0?depth-pullSteps-pushSteps+i+.5:depth-pullSteps+i+.5;
      return [[-square/2,center-square/2],[square/2,center-square/2],[square/2,center+square/2],[-square/2,center+square/2]].map(([dx,z])=>arrowPoint(dx,z));
    });
    const headStart=dir<0?depth-pullSteps-pushSteps:depth;
    const polygon=[[-.22,headStart],[.22,headStart],[.55,headStart],[0,headStart+dir*.7],[-.55,headStart]].map(([dx,z])=>arrowPoint(dx,z));
    if(!polygon.every(Boolean))continue;
    directions[dir]={polygon,tails,axis,length,maxDepth,projectDistance(fraction){
      const p=project(0,depth+.025+dir*fraction);
      return p?(p.x-anchor.x)*axis.x+(p.y-anchor.y)*axis.y:length*fraction;
    }};
  }
  const displayAnchor=anchor;
  return {piece:g,color:arrowColor,previewDepth:depth,anchor:displayAnchor,directions,allowed};
}
function previewPieceDrag(piece,offset){
  pieceDragPreview=piece&&groups.includes(piece)?{piece,offset}:null;
  wrap.dataset.dragPreviewOffset=String(pieceDragPreview?.offset??0);
  if(!gameReady)return;
  syncBlocks();syncPlayer();syncFlag();syncPuzzleProjection();
}
const pieceDragControllers=new Map();
const pieceDrag={
  get active(){return [...pieceDragControllers.values()].some(controller=>controller.active)},
  beginFace(e){return pieceDragControllers.get(selected)?.beginFace(e)??false},
  pointerMove(e){return [...pieceDragControllers.values()].some(controller=>controller.pointerMove(e))},
  pointerUp(e,cancel){return [...pieceDragControllers.values()].some(controller=>controller.pointerUp(e,cancel))},
  sync(){
    for(const [g,controller]of pieceDragControllers)if(!groups.includes(g)){controller.dispose();pieceDragControllers.delete(g)}
    for(const g of groups){
      if(!pieceDragControllers.has(g)&&canInteract(g)){
        const controller=createPieceDrag({wrap,
          readState:atGrab=>(controlFeatures.enabled('allPieceDragArrows')||selected===g)?pieceDragState(atGrab,g):null,
          onBegin(){selected=g;},onTap:clickBoard,move:(dir,steps)=>{selected=g;commitPieceDrag(dir,steps)},preview:previewPieceDrag,
          onRelease(){pieceDragAnchor=null;},pan(dx,dy){panBoard(dx,dy);viewTouched=true;clearBoardHover();applyBoardView();resetStudyFollow()},clearHover(){hideHelp();clearBoardHover();resetStudyFollow()}
        });pieceDragControllers.set(g,controller);
      }
    }
    const moving=[...pieceDragControllers.values()].find(controller=>controller.moving);
    for(const controller of pieceDragControllers.values()){controller.setSuppressed(!!moving&&controller!==moving);controller.sync()}
  }
};

const pieceDock=createPieceDock(document.querySelector('#pieceDock'),id=>{
  enterPlayFromIntro();selected=groups[id];hideHelp();updateUI();
});
function syncPieceDock(){
  const dock=document.querySelector('#pieceDock');
  const tabs=controlFeatures.enabled('stackedPieceButtons');
  dock.hidden=controlFeatures.enabled('pieceDragArrows')&&!tabs;
  document.querySelector('.stage').classList.toggle('uses-drag-controls',dock.hidden);
  const paused=!gameReady||!viewReady||busy||won||levelLoading||document.querySelector('.stage').inert;
  pieceDock.sync(pieceDockState(movementBoard(),player,selected?.id,{paused,tabs}),activeLevel.palette);
}
function updateUI(){
  cameraLab?.setBusy(busy||won||introPlaying||levelLoading);
  const cameraAvailable=activeLevel.kind==='puzzle'&&!cameraLab;
  cameraModeToggle.hidden=!cameraAvailable;
  cameraModeToggle.disabled=busy||won||levelLoading;
  if(!cameraAvailable&&cameraModeActive)setCameraMode(false);
  cameraControlsPanel.hidden=!cameraAvailable;
  cameraControlsPanel.inert=busy||won||levelLoading;
  tuningToggle.hidden=!cameraAvailable;
  tuningToggle.disabled=busy||won||levelLoading;
  cameraTuning.hidden=!cameraAvailable||won||tuningToggle.getAttribute('aria-expanded')!=='true';
  cameraTuning.inert=busy||levelLoading;
  if(viewReady)syncCameraSliders();
  wrap.classList.toggle('no-piece-selected',!selected);
  document.querySelector('#levelSettings').disabled=busy||won||introPlaying||levelLoading;
  document.querySelector('#gameActions').inert=won;
  const title=document.querySelector('#level-title');
  title.textContent=isBackgroundStudio()?'Environment Studio':activeLevel.kind==='puzzle'?`“${activeLevel.name}”`:activeLevel.name;
  title.title=activeLevel.name;
  title.setAttribute('aria-label',activeLevel.name);
  document.querySelector('#undo').disabled=busy||!history.length;
  document.querySelector('#reset').disabled=busy||(!history.length&&!won&&!groups.some(g=>g.depth));
  document.querySelector('#studioControls').hidden=!activeLevel.previewMove;document.querySelector('#previewClimb').disabled=busy;document.querySelector('#movementCase').disabled=busy;
  if(activeLevel.studioExample)document.querySelector('#movementCase').value=activeLevel.studioExample.id;
  if(studioTargetObject){studioTargetObject.color=new Color(1,.95,.73,activeLevel.previewMove ? .85 : 0);if(activeLevel.previewMove)studioTargetObject.pos3D=standingSpotCenter(activeLevel.previewMove)}
  wrap.classList.toggle('uses-piece-drag',controlFeatures.enabled('pieceDragArrows'));
  pieceDrag.sync();
  if(warpAction){
    warpAction.hidden=warpPipePreview||!warpPreviewEnds.length||!warpDestination(movementBoard(),player,activeLevel.warpPairs);
    warpAction.disabled=busy||won||levelLoading||introPlaying||!viewReady;
    if(!warpAction.hidden){const index=warpEndpoints().findIndex(({cell,group})=>player.x===cell.x&&player.y===cell.y&&player.z===group.depth-1);if(index>=0)warpAction.style.setProperty('--warp-color',WARP_PIPE_COLORS[Math.floor(index/2)%WARP_PIPE_COLORS.length].rim)}
  }
  syncPieceDock();
  syncInteractionHelp();
  const color=selected?palette[selected.color]:null;wrap.style.setProperty('--block-color',color?`rgb(${Math.round(color.r*255)} ${Math.round(color.g*255)} ${Math.round(color.b*255)})`:'#eee8fa');
  wrap.style.setProperty('--block-ink',color?blockActionText(color):'#292537');
  syncBlocks();syncPlayer();syncFlag();syncMovementMarkers();syncPuzzleProjection();
}
function syncMovementMarkers(){
  if(!movementMarkers)return;
  const platforms=movementMarkersEnabled()&&!introPlaying,floor=floorMarkersEnabled();
  if((!platforms&&!floor)||won){movementMarkers.dispose();return}
  const targets=(movementMarkerRouteTargets??standableReachable()).filter(p=>p.y===H?floor:platforms);
  const highlighted=new Set((movementMarkerRoute?.slice(movementMarkerRouteIndex)??[]).map(nodeKey));
  const subtle=controlFeatures.movementMarkerShape==='circle';
  const markerColor=(p,highlight=false)=>p.y===H
    ?new Color(.12,.25,.10,highlight?.38:.18)
    :reachableMarkerColor(byCell[p.y][p.x],highlight?.30:subtle?.05:.10,!highlight&&subtle);
  movementMarkers.sync(targets,standingSpotCenter,p=>markerColor(p),stretchY,highlighted,p=>markerColor(p,true),controlFeatures.movementMarkerShape);
}
function pickMovementMarker(ray){if((!movementMarkersEnabled()&&!floorMarkersEnabled())||!movementMarkers)return null;const occluders=[...blockObjects,...topPickObjects,...extrusionOutlines];return puzzlePick([...movementMarkers.renderObjects,...occluders],()=>movementMarkers.pick(ray,occluders))}
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
  if(introPlaying||levelLoading)return;
  if(!openingHelpShown&&!isPreviewLevel(activeLevel)&&showHelp(controlFeatures.enabled('pieceDragArrows')?'Drag an arrow to slide the piece in or out. Release to settle it, then guide Pom to the flag.':'Pull the blocks out to make steps, then guide Pom to the flag.','intro',6500))openingHelpShown=true;
  else syncInteractionHelp();
}
function showMenu(panel='title',completedLevelId,{preserveVictoryTransition=false,deferCheck=false}={}){
  if(isMakerPlaytest)return Promise.resolve(null);
  if(levelLoading)levelAssetGate.cancel();
  if(!preserveVictoryTransition)victoryEffects.reset();
  let cardReady=Promise.resolve(null);
  syncScreenAppearance(panel==='title'?'home':panel);
  hideHelp();interactionHelpKey=null;stopIntro();celebration=null;
  const menu=document.querySelector('#menuScreen');menu.hidden=false;menu.classList.toggle('is-levels',panel==='levels');menu.classList.toggle('is-settings',panel==='settings');
  for(const name of ['title','levels','settings'])document.querySelector(`#${name}Panel`).hidden=panel!==name;
  document.querySelector('#clearProgressConfirm').hidden=true;document.querySelector('#clearProgress').hidden=false;document.querySelector('#progressMessage').textContent='';
  if(panel==='levels'){
    renderLevelList(completedLevelId);
    if(completedLevelId)cardReady=new Promise(resolve=>requestAnimationFrame(()=>{
      if(menu.hidden||!menu.classList.contains('is-levels')){resolve(null);return}
      const card=[...menu.querySelectorAll('.level-card')].find(card=>card.dataset.levelId===completedLevelId);
      if(!card){resolve(null);return}
      const rect=card.getBoundingClientRect(),menuRect=menu.getBoundingClientRect();
      menu.scrollTop+=rect.top-menuRect.top-(menu.clientHeight-rect.height)/2;
      if(!deferCheck){card.focus({preventScroll:true});card.classList.add('is-just-completed')}
      resolve(card);
    }));
  }
  if(panel==='title'){catalogScreens?.renderHome();menu.scrollTop=0}
  if(panel==='settings'){document.querySelector('#settingsHome').setAttribute('aria-label',settingsReturnToLevel?'Back to level':'Back to home');updateProgressSettings();menu.scrollTop=0}
  document.querySelector('.stage').classList.remove('is-won');document.querySelector('.stage').inert=true;
  if(panel==='settings')document.querySelector('#settingsHome').focus();
  else if(!completedLevelId)document.querySelector(panel==='levels'?'#backTitle':'#titlePanel .brand').focus({preventScroll:true});
  return cardReady;
}
function levelIsAvailable(level){return level.compatibility.playable&&(!levelPreferences.hideKnownIssues||!level.knownIssues)}
function renderLevelList(revealLevelId){
  if(isMakerPlaytest)return;
  catalogScreens?.render(revealLevelId);
}
function updateProgressSettings(){
  document.querySelector('#progressCount').textContent=`${levelProgress.count} of ${levels.filter(level=>!isPreviewLevel(level)).length} levels completed`;
  document.querySelector('#clearProgress').disabled=levelProgress.count===0;
  if(!progressSaved)document.querySelector('#progressMessage').textContent='Your browser could not save progress. Check that site storage is allowed.';
}
function recordCompletedLevel(){if(warpPipePreview||cameraLab||interactionLab)return;unfinished.remove(activeLevel.id);if(activeLevel.userPuzzle){myPuzzles.complete(activeLevel);return}progressSaved=levelProgress.complete(activeLevel.id);const menu=document.querySelector('#menuScreen');if(!menu.hidden&&menu.classList.contains('is-levels'))renderLevelList();updateProgressSettings()}
function resetLevelState(level){
  warpPreviewAnimation++;warpPreviewWarping=false;warpPreviewOpeningVisible=false;warpPreviewMouth=1;if(pomEyes.length)resetWarpEyes();
  setLoadingPalette(levelLoadingPanel,level);
  movementMarkerRoute=null;movementMarkerRouteTargets=null;movementMarkerRouteIndex=0;
  pomGlowCovered=false;pomGlowOn=false;pomGlowStart=0;if(pomLight){pomLight.intensity=1;pomLight.glow=0}
  cameraModeActive=false;cameraModePrevious=null;syncCameraMode();
  levelAssetGate.cancel();levelLoading=true;viewReady=false;stopIntro();document.querySelector('.stage').classList.add('is-level-loading');levelLoadingPanel.hidden=false;levelLoadingRetry.hidden=true;levelLoadingMessage.textContent='Loading puzzle…';
  victoryEffects.reset();
  pieceDragAnchor=null;activeLevel=level;if(isBackgroundStudio())backgroundStudio.setPreviewLevel(level.studioSourceId);if(interactionLevel){interactionLevel.value=level.id;interactionCase.hidden=level.legacyId!==1}document.querySelector('.stage').classList.toggle('is-design',isDesignPlayground());document.querySelector('.stage').classList.toggle('has-studio-panel',!cameraLab&&isPreviewLevel(level));document.querySelector('#designPanel').hidden=!isDesignPlayground();document.querySelector('#backgroundPanel').hidden=!isBackgroundStudio();document.querySelector('#backgroundPanel').setAttribute('aria-label','Environment Studio controls');useLevelPalette(level);W=level.width;H=level.height;if(!cameraLab){cameraState.yaw=0;cameraState.pitch=(tuningEnabled.checked?experimentalPitch:null)??20;cameraState.truck=0;cameraState.backgroundDistance=puzzleBackgroundDistance(puzzleArtworkWidth(level))}mural=level.grid.map(row=>[...row]);goalCell={...level.goal};
  clearMovementRoutes();followAnchor=undefined;visibilityStudy.target=null;visibilityStudy.lastCheck=-1;visibilityStudy.lastBlocked=-1;
  groups=[];byCell=Array.from({length:H},()=>Array(W).fill(null));makeGroups();setupWarpEnds();player={x:level.start.x,y:level.start.y??H,z:level.start.z};selected=null;hovered=null;history=[];won=false;busy=false;falling=false;viewSide=worldPresentation()?0:DEFAULT_VIEW.horizontal;viewHeightStep=0;viewPitch=cameraPitch();cameraLab?.setLevel(level.id);celebration=null;resumeUnfinished();
  hideHelp();interactionHelpKey=null;setUmbrellaVisible(false);rebuildBlockMeshes();autoSelectNearbyPiece();updateUI();loadLevelAssets();
}
async function playUserPuzzle(level){if(!gameReady){if(!await startGameEngine()||!document.querySelector('#menuScreen').hidden)return;}catalogScreens?.selectForLevel(level);syncScreenAppearance('game');document.querySelector('.stage').classList.remove('is-won');document.querySelector('#menuScreen').hidden=true;document.querySelector('.stage').inert=false;resetLevelState(level)}
async function startLevel(id){if(isMakerPlaytest)return;if(!gameReady){if(!await startGameEngine()||!document.querySelector('#menuScreen').hidden)return;}let level=levels.find(item=>item.id===id);if(!level||!level.compatibility.playable)return;catalogScreens?.selectForLevel(level);if(level.kind==='movement-studio')level=studioLevel(levels,movementExamples[0]);syncScreenAppearance('game');document.querySelector('.stage').classList.remove('is-won');document.querySelector('#menuScreen').hidden=true;document.querySelector('.stage').inert=false;resetLevelState(level);if(!warpPipePreview)showOpeningHelp()}
document.querySelector('#openSettings').addEventListener('click',event=>{event.preventDefault();settingsReturnToLevel=false;showMenu('settings')});
document.querySelector('#levelSettings').addEventListener('click',()=>{if(busy||won||introPlaying)return;settingsReturnToLevel=true;showMenu('settings')});
function syncControlFeatureInputs(){
  for(const feature of CONTROL_FEATURES){const input=document.querySelector(`#${feature.id}`);if(input)input.checked=controlFeatures.enabled(feature.id)}
  const highlight=document.querySelector('#pieceHighlight');if(highlight)highlight.value=controlFeatures.enabled('selectionLightbox')?'lightbox':'original';
  const appearance=document.querySelector('#topFaceAppearance');if(appearance)appearance.value=controlFeatures.topFaceStyle;
  const markerShape=document.querySelector('#movementMarkerShape');if(markerShape)markerShape.value=controlFeatures.movementMarkerShape;
}
// Bind the prototype's static Settings markup to the existing preference model.
const pieceHighlight=document.querySelector('#pieceHighlight');
pieceHighlight.addEventListener('change',()=>{
  const saved=controlFeatures.set('selectionLightbox',pieceHighlight.value==='lightbox');
  refreshControlFeatures();
  document.querySelector('#pieceHighlightMessage').textContent=saved?'':'This setting applies now, but could not be saved on this device.';
});
const topFaceAppearance=document.querySelector('#topFaceAppearance');
topFaceAppearance.addEventListener('change',()=>{
  const saved=controlFeatures.setTopFaceStyle(topFaceAppearance.value);
  refreshControlFeatures();
  document.querySelector('#controlFeatureMessage').textContent=saved?'':'This setting applies now, but could not be saved in this browser.';
});
const movementMarkerShape=document.querySelector('#movementMarkerShape');
movementMarkerShape.addEventListener('change',()=>{
  const saved=controlFeatures.setMovementMarkerShape(movementMarkerShape.value);
  refreshControlFeatures();
  document.querySelector('#controlFeatureMessage').textContent=saved?'':'This control applies now, but could not be saved in this browser.';
});
for(const feature of CONTROL_FEATURES){
  const toggle=document.querySelector(`#${feature.id}`);
  if(!toggle)continue;
  toggle.addEventListener('change',()=>{
    const saved=controlFeatures.set(feature.id,toggle.checked);
    if(feature.id==='movementArrow'&&!toggle.checked)clearRoutePreview();
    if(toggle.checked&&['stackedPieceButtons','pieceDragArrows'].includes(feature.id)){
      for(const id of ['stackedPieceButtons','pieceDragArrows'])if(id!==feature.id)controlFeatures.set(id,false);
    }
    syncControlFeatureInputs();
    refreshControlFeatures(feature.id==='autoSelectPieces'&&toggle.checked);
    document.querySelector('#controlFeatureMessage').textContent=saved?'':'This control applies now, but could not be saved in this browser.';
  });
}
syncControlFeatureInputs();
function refreshControlFeatures(selectNearby=false){
  clearBoardHover();if(!gameReady)return;
  if(selectNearby&&!busy){autoSelectNearbyPiece();updateUI()}
  else updateUI()
}
window.addEventListener('storage',event=>{if(event.key===controlFeatures.key||event.key===null){const wasAutomatic=controlFeatures.enabled('autoSelectPieces');controlFeatures.reload();syncControlFeatureInputs();refreshControlFeatures(!wasAutomatic&&controlFeatures.enabled('autoSelectPieces'))}});
for(const name of ['hideKnownIssues','hideHelpText']){
  const toggle=document.querySelector(`#${name}`);toggle.checked=levelPreferences[name];
  toggle.addEventListener('change',()=>{const saved=levelPreferences.set(name,toggle.checked);document.querySelector('#preferenceMessage').textContent=saved?'':'This setting applies now, but could not be saved in this browser.';syncHelpVisibility();if(name==='hideKnownIssues')renderLevelList()});
}
window.addEventListener('storage',event=>{if(event.key===levelPreferences.key||event.key===null){levelPreferences.reload();for(const name of ['hideKnownIssues','hideHelpText'])document.querySelector(`#${name}`).checked=levelPreferences[name];syncHelpVisibility();renderLevelList()}});
document.querySelector('#settingsHome').addEventListener('click',event=>{
  event.preventDefault();
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
window.addEventListener('storage',event=>{if(event.key===unfinished.key)catalogScreens?.renderHome();if(event.key===levelProgress.key||event.key===null){levelProgress.reload();renderLevelList();updateProgressSettings();if(levelProgress.count===0){document.querySelector('#clearProgressConfirm').hidden=true;document.querySelector('#clearProgress').hidden=false}}});
document.querySelector('#backTitle').addEventListener('click',event=>{event.preventDefault();showMenu('title')});
document.querySelector('[data-home]').addEventListener('click',event=>{event.preventDefault();showMenu('title')});
document.querySelector('#exitLevel').addEventListener('click',event=>{event.preventDefault();isMakerPlaytest?returnToMaker():showMenu('levels',won?activeLevel.id:undefined)});
const creatorUrl=deploymentUrls().creator;
const myPuzzles=menuStartup?.puzzles??(isMakerPlaytest?{renderCollection(){},complete(){},openPending(){
  try{const level={...puzzleLevel(decodePuzzle(makerPlaytestToken)),temporaryPlaytest:true};playUserPuzzle(level);playtestLoading.remove()}
  catch{playtestLoading.replaceChildren(document.createTextNode('This playtest could not be opened. '));const back=document.createElement('button');back.className='btn';back.textContent='Back to editor';back.onclick=returnToMaker;playtestLoading.append(back)}
}}:createMyPuzzles({play:playUserPuzzle,onChange:()=>{if(document.querySelector('#levelsPanel').hidden===false)renderLevelList();else catalogScreens?.renderHome()},creatorUrl}));
if(!isMakerPlaytest&&!catalogScreens)catalogScreens=createCatalogScreens({
  levels,groups:levelGroups,progress:levelProgress,unfinished,isAvailable:levelIsAvailable,myPuzzles,
  thumbnailLevel:level=>level.kind==='movement-studio'?studioLevel(levels,movementExamples[0]):level,
  open:()=>showMenu('levels'),play:level=>level.userPuzzle?playUserPuzzle(level):startLevel(level.id),
});
if(menuStartup){menuStartup.open=()=>showMenu('levels');menuStartup.play=level=>level.userPuzzle?playUserPuzzle(level):startLevel(level.id);menuStartup.change=()=>{if(!document.querySelector('#levelsPanel').hidden)renderLevelList();else catalogScreens?.renderHome()}}
renderLevelList();
export async function openMenuLevel(level){if(level.userPuzzle)return playUserPuzzle(level);return startLevel(level.id)}
function puzzleVisualBounds(){
  if(!activeLevel.userPuzzle)return{left:0,right:W,height:H};
  const floor=puzzleFloorBounds(mural,GRID_DEPTH),cells=groups.flatMap(g=>g.cells);
  return{left:Math.min(floor.left,activeLevel.start.x-.5),right:Math.max(floor.right,activeLevel.start.x+1.5),height:Math.max(1,...cells.map(c=>H-c.y),H-activeLevel.start.y)};
}
function applyCameraStudy({refit=false,orbit=false,centerPom=false,selectionOnly=false,visibilityOnly=false}={}){
  if(!gameReady||busy||won)return;
  if(selectionOnly){syncBlocks();return}
  if(visibilityOnly){visibilityStudy.lastCheck=-1;visibilityStudy.target=null;if(cameraState.autoTilt)resetStudyFollow({paused:false});return}
  stopIntro();viewPitch=cameraPitch();viewTouched=true;keepInterruptedView=false;
  // Orbiting or tracking moves the camera; straight board geometry stays put.
  if(!orbit){refreshCellSquareness();syncBlocks();syncFlag();syncHoverSpot();syncPlayer();syncMovementMarkers()}
  if(refit){const frame=sceneFrame(wrap.clientWidth,wrap.clientHeight);viewUnit=wrap.clientHeight/frame.height;viewTarget=frame.target;baseCameraHeight=frame.height;viewTouched=false}
  if(centerPom){viewTarget=worldPosition(player);cameraState.truck=0}
  requestLevelEnvironment();applyBoardView(false);resetStudyFollow({paused:!centerPom});if(!orbit)updateUI();
  wrap.dataset.projection=cameraState.projection;wrap.dataset.cameraYaw=String(cameraYaw());
}
function studyFrame(width,height){
  const visual=puzzleVisualBounds(),floor=puzzleFloorBounds(mural,GRID_DEPTH),cx=(visual.left+visual.right)/2,cy=(visual.height+.85)/2,cz=1.5,points=[];
  // One conservative scale across presets allows a fair camera comparison.
  for(const yaw of [-40,0,40].map(degrees=>degrees*Math.PI/180))for(const pitch of [0,.38,Math.PI/4])for(const skew of [-DEPTH_SKEW,0,DEPTH_SKEW]){
    const project=(x,y,z)=>{x=x+skew*z-cx;y-=cy;z-=cz;return [Math.cos(yaw)*x-Math.sin(yaw)*z,Math.cos(pitch)*y-Math.sin(pitch)*(Math.sin(yaw)*x+Math.cos(yaw)*z)]};
    for(const x of [Math.min(floor.left,visual.left),Math.max(floor.right,visual.right)])for(const y of [0,visual.height+.85])for(const z of [0,4])points.push(project(x,y,z));
  }
  const halfX=Math.max(...points.map(p=>Math.abs(p[0]))),halfY=Math.max(...points.map(p=>Math.abs(p[1]))),top=64,bottom=82,margin=20;
  const unit=Math.max(1,Math.min(80,(width-margin*2)/(halfX*2),(height-top-bottom)/(halfY*2)));
  const yaw=cameraYaw(),up=vec3(-Math.sin(yaw)*Math.sin(viewPitch),Math.cos(viewPitch),-Math.cos(yaw)*Math.sin(viewPitch));
  return{height:height/unit,target:vec3(cx,cy,cz).add(up.scale((top-bottom)/(2*unit))),minX:-halfX,maxX:halfX,minY:-halfY,maxY:halfY,top,bottom,margin};
}
let floorGuideMesh,floorGuideKey;
function syncStudyFloor(){
  const object=backgroundObjects.at(-1);if(!object)return;
  const camera=render3D.camera,width=wrap.clientWidth,height=wrap.clientHeight,size=vec2(width,height),bounds=puzzleFloorBounds(mural,GRID_DEPTH),ground=stretchY(.008);
  const visible=(cameraLab?cameraState.guides:(currentBackgroundConfiguration()?.showGuides??cameraState.guides))&&!floorMarkersEnabled();
  const key=[width,height,bounds.left,bounds.right,bounds.back,bounds.front,ground,depthSkew(),extrusionScale,visible,camera.pos.x,camera.pos.y,camera.pos.z,camera.rotation.x,camera.rotation.y,camera.rotation.z,camera.fov,camera.orthographic].join(':');
  if(key===floorGuideKey&&object.mesh===floorGuideMesh)return;
  // Keep an empty transparent guide layer when hidden; removing its mesh can
  // alter the engine's transparent pass and hide the character overlay.
  const mesh=new Mesh(),tint=new Color(.28,.32,.25,visible?.5:0);
  const strip=(x0,z0,x1,z1)=>{
    const a=render3D.worldToScreen(worldPoint(x0,.008,z0*extrusionScale),size),b=render3D.worldToScreen(worldPoint(x1,.008,z1*extrusionScale),size);
    if(!a||!b)return;
    const delta=b.subtract(a);if(delta.length()<.001)return;
    const normal=vec2(-delta.y,delta.x).normalize(1),screen=[a.add(normal),b.add(normal),b.subtract(normal),a.subtract(normal)];
    const points=screen.map(point=>{const ray=render3D.screenToRay(point,size),t=(ground-ray.origin.y)/ray.direction.y;return Number.isFinite(t)&&t>0?ray.getPosition(t):null});
    if(points.some(point=>!point))return;
    mesh.addQuad(...points,tint);
  };
  for(let x=bounds.left;x<=bounds.right;x++)strip(x,bounds.back,x,bounds.front);
  for(let z=bounds.back;z<=bounds.front;z++)strip(bounds.left,z,bounds.right,z);
  mesh.doubleSided=true;object.mesh=mesh;object.pos3D=vec3();object.rotation3D=vec3();object.scale3D=vec3(1);object.tileInfo=undefined;object.color=new Color(1);object.transparent=true;
  floorGuideMesh?.dispose();floorGuideMesh=mesh;floorGuideKey=key;
}
function sceneFrame(width,height,side=viewSide){
  if(worldPresentation())return studyFrame(width,height);
  const c=Math.cos(viewPitch),s=Math.sin(viewPitch),points=[];
  const floor=puzzleFloorBounds(mural,GRID_DEPTH),visual=puzzleVisualBounds();
  // Reserve one fixed frame for all six angles, so rotating never recenters or zooms the wall.
  for(const pitch of CAMERA_PITCHES)for(const slant of [-1,1]){
    const sn=Math.sin(pitch),cs=Math.cos(pitch);
    for(const x of [floor.left,floor.right])for(const z of [floor.back,floor.front])points.push([x+slant*DEPTH_SKEW*z,-sn*z]);
    for(const x of [visual.left,visual.right])for(const y of [0,visual.height+.85])for(const z of [0,3])points.push([x+slant*DEPTH_SKEW*z,cs*y-sn*z]);
  }
  const centerX=(visual.left+visual.right)/2,halfWidth=Math.max(...points.map(p=>Math.abs(p[0]-centerX))),minX=centerX-halfWidth,maxX=centerX+halfWidth,minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
  // The dock is outside the canvas, so it no longer needs an overlay inset.
  const top=Math.min(64,height*.16),bottom=Math.min(22,height*.34),margin=width<600?14:24;
  const unit=Math.max(1,Math.min(80,(width-2*margin)/(maxX-minX),(height-top-bottom)/(maxY-minY)));
  const targetY=(minY+maxY)/2+(top-bottom)/(2*unit);
  return {height:height/unit,target:vec3((minX+maxX)/2,(targetY+s)/c,1),minX,maxX,minY,maxY,top,bottom,margin};
}
function fitCamera(width,height){return sceneFrame(width,height).height}
function configureStudyCamera(span,target,yaw,pitch,fov=cameraState.fov){
  cameraFrameHeight=span;cameraFocus=target.copy();
  const camera=render3D.camera,perspective=studyPerspective();
  camera.orthographic=perspective?0:span;
  if(perspective)camera.fov=fov*Math.PI/180;
  const distance=perspective?Math.max(2,span/(2*Math.tan(camera.fov/2))):15;
  camera.orbit(target,distance,yaw,pitch);
}
function positionCameraForView(side,targetOverride){
  let target=targetOverride||sceneFrame(wrap.clientWidth,wrap.clientHeight,side).target;
  if(worldPresentation()&&cameraState.motion==='track'&&studyStraight())target=target.add(vec3(cameraState.truck*W/100,0,0));
  const span=viewUnit>0?wrap.clientHeight/viewUnit:(baseCameraHeight||render3D.camera.orthographic);
  configureStudyCamera(span,target,cameraYaw(),viewPitch);
}
function resetStudyFollow({paused=true}={}){
  if(paused)studioCameraFollow=false;
  if(!worldPresentation()||!playerObject||!viewTarget)return;
  followAnchor={paused};followTime=timeReal;wrap.dataset.cameraFollowPaused=String(paused);
  if(paused){visibilityStudy.target=null;visibilityStudy.lastCheck=-1;visibilityStudy.lastBlocked=-1}
}
function resumeStudyFollow(){
  if(!studyStraight()||(!cameraState.followX&&!cameraState.followY&&!cameraState.autoTilt))return;
  // A gameplay move ends inspection. Do not retain a pan or tracking offset as
  // Pom's new screen position; resume following within the puzzle bounds.
  if(cameraState.motion==='track'&&cameraState.truck)viewTarget=cameraFocus.copy();
  cameraState.truck=0;resetStudyFollow({paused:false});
}
function boundedStudyTarget(desired,position,span=viewSpan()){
  const camera=render3D.camera,right=camera.getRight(),up=camera.getUp(),forward=camera.getForward(),width=wrap.clientWidth,height=wrap.clientHeight;
  if(!width||!height)return desired;
  const unit=height/span,distance=studyPerspective()?Math.max(2,span/(2*Math.tan(camera.fov/2))):15;
  const visual=puzzleVisualBounds(),depth=Math.max(0,...groups.map(g=>g.depth)),points=[];
  // Use the puzzle's complete footprint, including the flag, rather than the
  // scenery or its floor guide. A small margin keeps outlines off the edges.
  for(const x of [visual.left-.25,visual.right+.25])for(const y of [-.15,visual.height+.7])for(const z of [0,depth])points.push(worldPoint(x,y,z*extrusionScale));
  const project=p=>{const offset=p.subtract(desired),scale=studyPerspective()?distance/Math.max(.1,distance+offset.dot(forward)):1;return{x:{position:offset.dot(right),scale},y:{position:offset.dot(up),scale}}};
  const projected=points.map(project),pom=project(position),top=64,bottom=Math.min(132,height*.28),margin=Math.min(24,width*.06);
  const dx=cameraState.followX?boundedCameraAxis({points:projected.map(p=>p.x),min:(margin-width/2)/unit,max:(width/2-margin)/unit,subject:pom.x,padding:.45}):0;
  const dy=cameraState.followY?boundedCameraAxis({points:projected.map(p=>p.y),min:(bottom-height/2)/unit,max:(height/2-top)/unit,subject:pom.y,padding:.4}):0;
  return desired.add(right.scale(dx)).add(up.scale(dy));
}
function updateStudyFollow(){
  if(isBackgroundStudio()&&!studioCameraFollow)return;
  if(!worldPresentation()||!studyStraight()||(!cameraState.followX&&!cameraState.followY)||!viewReady||!gameReady||won||celebration||!document.querySelector('#menuScreen').hidden)return;
  if(!followAnchor){resetStudyFollow();return}
  if(followAnchor.paused)return;
  // Keep the board still once Pom stops, until the next movement begins.
  if(trackingMode.value==='soft'&&!busy){followTime=timeReal;return}
  const dt=Math.min(.1,Math.max(0,timeReal-followTime));followTime=timeReal;if(!dt)return;
  const camera=render3D.camera,position=busy?playerObject.pos3D.add(render3D.camera.getForward().scale(.045)):worldPosition(player),offset=position.subtract(cameraFocus),right=camera.getRight(),up=camera.getUp();
  // Follow in the camera plane so depth and downward pitch cannot introduce a
  // screen-space offset. Translation leaves camera direction and zoom intact.
  const mode=trackingMode.value;
  let x=offset.dot(right),y=offset.dot(up);
  if(mode==='deadzone'){
    const horizontal=wrap.clientWidth/viewUnit*.16,vertical=wrap.clientHeight/viewUnit*.16;
    x=Math.sign(x)*Math.max(0,Math.abs(x)-horizontal);
    y=Math.sign(y)*Math.max(0,Math.abs(y)-vertical);
    if((!cameraState.followX||x===0)&&(!cameraState.followY||y===0))return;
  }
  const desired=viewTarget.add(right.scale(cameraState.followX?x:0)).add(up.scale(cameraState.followY?y:0));
  const framed=boundedStudyTarget(desired,position);
  const next=mode==='deadzone'?framed:viewTarget.lerp(framed,1-Math.exp(-dt/(mode==='soft'?.65:.18)));
  if(next.subtract(viewTarget).length()<.0001)return;
  viewTarget=next;applyBoardView(false);
}
function updateStudyVisibility(){
  if(pieceDrag.active)return;
  if(trackingMode.value==='soft'&&!busy)return;
  if(!studyStraight()||!gameReady||!viewReady||won||celebration||!cameraFocus||!playerObject||!document.querySelector('#menuScreen').hidden)return;
  const base=cameraPitch(),enabled=(!tuningEnabled.checked||experimentalPitch===null)&&cameraState.autoTilt&&base>=5*Math.PI/180;
  const dt=Math.min(.1,Math.max(0,timeReal-visibilityStudy.lastTime));visibilityStudy.lastTime=timeReal;
  // Panning/explicit camera controls pause automatic changes until gameplay
  // resumes. Disabling the option still restores the requested base angle.
  if(enabled&&(followAnchor?.paused||boardPointers.size))return;
  const position=busy?playerObject.pos3D.add(render3D.camera.getForward().scale(.045)):worldPosition(player);
  const options={position,focus:cameraFocus,distance:render3D.camera.pos.subtract(cameraFocus).length(),yaw:cameraYaw(),currentPitch:viewPitch,perspective:studyPerspective()};
  if(!enabled)visibilityStudy.target=base;
  else if(timeReal-visibilityStudy.lastCheck>=.12){
    visibilityStudy.lastCheck=timeReal;
    const key=groups.map(g=>g.depth).join(',');
    if(visibilityStudy.board!==activeLevel||visibilityStudy.key!==key){
      visibilityStudy.board=activeLevel;visibilityStudy.key=key;
      visibilityStudy.boxes=groups.flatMap(g=>g.cells.map(c=>({min:{x:c.x,y:H-c.y-1,z:g.depth?0:-CARDBOARD_THICKNESS},max:{x:c.x+1,y:H-c.y,z:g.depth+.025}})));
    }
    const result=chooseVisibilityPitch({...options,boxes:visibilityStudy.boxes,basePitch:base});
    if(Math.abs(result.pitch-base)>.01){visibilityStudy.target=result.pitch;visibilityStudy.lastBlocked=timeReal}
    else if(timeReal-visibilityStudy.lastBlocked>.8)visibilityStudy.target=base;
    wrap.dataset.pomBaseVisibility=result.baseVisibility.toFixed(3);wrap.dataset.pomBestVisibility=result.visibility.toFixed(3);
  }
  const target=visibilityStudy.target??base;
  const next=reducedSelectionMotion.matches||Math.abs(target-viewPitch)<.0002?target:viewPitch+(target-viewPitch)*(1-Math.exp(-dt/(Math.abs(target-base)>.01?.22:.65)));
  if(Math.abs(next-viewPitch)<1e-8)return;
  const pose=visibilityCameraPose({...options,pitch:next});
  viewTarget=vec3(pose.focus.x-(cameraState.motion==='track'?cameraState.truck*W/100:0),pose.focus.y,pose.focus.z);
  viewPitch=next;applyBoardView(false);
  if(busy){playerObject.pos3D=position.add(render3D.camera.getForward().scale(-.045));playerObject.rotation3D=render3D.camera.rotation.copy();syncPomMatrix()}
  wrap.dataset.autoTiltDegrees=(viewPitch*180/Math.PI).toFixed(2);cameraLab?.reportTilt(viewPitch*180/Math.PI);
}
const mobileBoard=()=>wrap.clientWidth<=780||(matchMedia('(pointer:coarse)').matches&&wrap.clientWidth<=1024);
const tappingUnit=()=>32/Math.max(.18,Math.sin(viewPitch));
function stopIntro(){if(introPlaying&&cameraControlsPanel.classList.contains('is-zoom-feedback'))showZoomFeedback();introFrame++;introPlaying=false;introTick=null;document.querySelector('.stage').classList.remove('is-introducing');wrap.dataset.introPhase='ready'}
function finishIntro({holdOpeningFrame=false}={}){if(introPlaying&&cameraControlsPanel.classList.contains('is-zoom-feedback'))showZoomFeedback();if(!cameraLab&&worldPresentation())resetStudyFollow({paused:holdOpeningFrame});introPlaying=false;introTick=null;document.querySelector('.stage').classList.remove('is-introducing');wrap.dataset.introPhase='ready';autoSelectNearbyPiece();updateUI();if(!warpPipePreview&&document.querySelector('#menuScreen').hidden)showOpeningHelp()}
function enterPlayFromIntro(){
  if(!introPlaying)return;
  stopIntro();viewTouched=true;keepInterruptedView=true;finishIntro();
}
function clampBoardView(){
  const width=wrap.clientWidth,height=wrap.clientHeight,f=sceneFrame(width,height),fitUnit=height/f.height,{min,max}=cameraZoomBounds(fitUnit);
  viewUnit=Math.max(min,Math.min(max,viewUnit));
  // An interrupted intro can be between the normal framing bounds. Keep that
  // exact view and allow the player's gesture to continue without a camera snap.
  if(keepInterruptedView||worldPresentation())return;
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
  syncCellGeometry();syncBackground();syncFloorGrid();syncHoverSpot();if(playerObject&&!busy)syncPlayer();syncPuzzleProjection();
  // Readable, projected dimensions also make responsive checks independent of device pixels.
  wrap.dataset.cameraHorizontal=String(viewSide);wrap.dataset.cameraVertical=String(viewHeightStep);wrap.dataset.cameraPitch=viewPitch.toFixed(2);wrap.dataset.squareWidth=viewUnit.toFixed(2);wrap.dataset.squareDepth=(viewUnit*Math.sin(viewPitch)).toFixed(2);wrap.dataset.view=viewUnit<=wrap.clientHeight/fitCamera(wrap.clientWidth,wrap.clientHeight)*1.001?'full':'zoomed';
  if(worldPresentation()){cameraLab?.reportTilt(viewPitch*180/Math.PI);wrap.dataset.autoTiltDegrees=(viewPitch*180/Math.PI).toFixed(2);wrap.dataset.projection=cameraState.projection;wrap.dataset.cameraMotion=cameraState.motion;wrap.dataset.cameraTruck=String(cameraState.truck);wrap.dataset.cameraFollowing=String(cameraState.followX||cameraState.followY);wrap.dataset.cameraFollowPaused=String(followAnchor?.paused??true);wrap.dataset.cameraTargetX=cameraFocus.x.toFixed(4);wrap.dataset.cameraTargetY=cameraFocus.y.toFixed(4);wrap.dataset.cameraFov=studyPerspective()?String(cameraState.fov):'';wrap.dataset.cameraDistance=render3D.camera.pos.subtract(cameraFocus).length().toFixed(4);wrap.dataset.cameraLens=String(render3D.camera.orthographic);const pom=render3D.worldToScreen(busy?playerObject.pos3D:worldPosition(player),vec2(wrap.clientWidth,wrap.clientHeight));if(pom){wrap.dataset.pomScreenX=(pom.x/wrap.clientWidth*100).toFixed(3);wrap.dataset.pomScreenY=(pom.y/wrap.clientHeight*100).toFixed(3)}}
  syncCameraSliders();
}
function openingCameraTarget(width,height,unit){
  const camera=render3D.camera,right=camera.getRight(),up=camera.getUp(),size=vec2(width,height);
  const cells=groups.flatMap(group=>group.cells);
  const left=Math.min(...cells.map(cell=>cell.x)),rightEdge=Math.max(...cells.map(cell=>cell.x+1));
  const bottom=Math.min(...cells.map(cell=>H-cell.y-1)),top=Math.max(...cells.map(cell=>H-cell.y));
  const depth=Math.max(0,...groups.map(group=>group.depth));
  const center=(left+rightEdge)/2,pom=worldPosition(player),onFloor=player.y===H;
  const framing=(anchor,x,y)=>anchor.add(right.scale((.5-x)*width/unit)).add(up.scale((y-.5)*height/unit));
  const centered=framing(worldPoint(center,onFloor?0:(bottom+top)/2,0),.5,onFloor?.73:.5);
  positionCameraForView(viewSide,centered);render3D.updateMatrices(width/height);
  const outline=[];
  for(const x of [left,rightEdge])for(const y of [bottom,top])for(const z of [0,depth])outline.push(worldPoint(x,y,z*extrusionScale));
  outline.push(pom,worldPoint(goalCell.x+.5,H-goalCell.y+.45,0));
  if(openingFrameFits(outline.map(point=>render3D.worldToScreen(point,size)),width,height))return centered;

  const toward=worldPoint(center,0,0).subtract(worldPoint(player.x+.5,0,0)).dot(right);
  const screenX=Math.abs(toward)<1?.5:toward>0?.38:.62;
  return framing(onFloor?worldPoint(player.x+.5,0,player.z+.5):pom,screenX,onFloor?.73:.65);
}
function startBoardView(animate=true){
  if(levelLoading)return;
  stopIntro();keepInterruptedView=false;viewWidth=wrap.clientWidth;viewHeight=wrap.clientHeight;viewMobile=mobileBoard();viewTouched=false;viewReady=true;
  const f=sceneFrame(viewWidth,viewHeight);
  if(activeLevel.studioExample){const a=worldPosition(activeLevel.start),b=worldPosition(activeLevel.previewMove);f.height=Math.max(5.8,4.5*viewHeight/viewWidth,Math.abs(a.y-b.y)+3.2);f.target=a.lerp(b,.5).add(vec3(0,.6,0))}
  const fitUnit=viewHeight/f.height;viewUnit=fitUnit;viewTarget=f.target.copy();baseCameraHeight=f.height;applyBoardView(!activeLevel.studioExample);
  if(isPreviewLevel(activeLevel)||activeLevel.studioExample||!document.querySelector('#menuScreen').hidden){finishIntro();return}
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const token=introFrame,from=viewTarget.copy();
  if(cameraLab){resetStudyFollow();finishIntro();return}
  resetStudyFollow();
  const endUnit=initialCameraUnit({width:viewWidth,height:viewHeight});
  const needsZoom=Math.abs(Math.log(endUnit/fitUnit))>.01;
  viewUnit=endUnit;
  const target=openingCameraTarget(viewWidth,viewHeight,endUnit);
  viewUnit=fitUnit;viewTarget=from;applyBoardView(false);
  if(!animate||reduced){viewUnit=endUnit;viewTarget=target;applyBoardView(false);finishIntro({holdOpeningFrame:true});return}
  autoSelectNearbyPiece();introPlaying=true;document.querySelector('.stage').classList.add('is-introducing');wrap.dataset.introPhase='overview';updateUI();
  let start,lastFrame,introZoomShown=false;
  introTick=now=>{
    if(token!==introFrame||celebration)return;
    // The engine may do several simulation ticks before one render. Move the
    // camera once per rendered frame, before its matrices and scene are drawn.
    if(now===lastFrame)return;lastFrame=now;start??=now;
    const pose=sampleCameraIntro(now-start,fitUnit,endUnit);
    wrap.dataset.introPhase=pose.phase;
    if(pose.phase!=='overview'){
      if(needsZoom&&!introZoomShown&&!cameraModeToggle.hidden){introZoomShown=true;showZoomFeedback(true)}
      viewUnit=pose.unit;viewTarget=from.lerp(target,pose.pan);applyBoardView(false);
    }
    if(pose.done)finishIntro({holdOpeningFrame:true});
  };
}

function limitManualPan(){const p=limitStagePan(viewTarget,render3D.camera.getRight(),render3D.camera.getUp(),puzzleVisualBounds(),isBackgroundStudio());viewTarget=vec3(p.x,p.y,p.z)}
function panBoard(dx,dy){if(worldPresentation()){viewTarget=viewTarget.add(render3D.camera.getRight().scale(-dx/viewUnit)).add(render3D.camera.getUp().scale(dy/viewUnit));limitManualPan();return}viewTarget=viewTarget.add(vec3(-dx/viewUnit,dy/(viewUnit*Math.cos(viewPitch)),0))}
function zoomBoard(unit,x,y){
  const old=viewUnit,{min,max}=cameraZoomBounds();viewUnit=Math.max(min,Math.min(max,unit));
  if(!cameraModeActive&&gameReady&&viewReady&&!cameraModeToggle.hidden&&Math.abs(viewUnit-old)>.0001)showZoomFeedback();
  const scale=1/old-1/viewUnit;if(worldPresentation()){viewTarget=viewTarget.add(render3D.camera.getRight().scale((x-wrap.clientWidth/2)*scale)).add(render3D.camera.getUp().scale((wrap.clientHeight/2-y)*scale));limitManualPan();return}viewTarget=viewTarget.add(vec3((x-wrap.clientWidth/2)*scale,(wrap.clientHeight/2-y)*scale/Math.cos(viewPitch),0));
}
function cameraZoomBounds(fitUnit=wrap.clientHeight/sceneFrame(wrap.clientWidth,wrap.clientHeight).height){
  const opening=activeLevel.kind==='puzzle'&&!cameraLab&&!activeLevel.studioExample?initialCameraUnit({width:wrap.clientWidth,height:wrap.clientHeight}):fitUnit;
  return {min:Math.min(fitUnit,opening),max:Math.max(tappingUnit(),fitUnit,opening)};
}
function syncCameraMode(){
  cameraModeSliders.hidden=false;
  cameraControlsPanel.hidden=cameraModeToggle.hidden;
  cameraControlsPanel.classList.toggle('is-active',cameraModeActive);
  cameraDirection.hidden=!cameraModeActive;
  clearTimeout(zoomFeedbackTimer);cameraControlsPanel.classList.remove('is-zoom-feedback');
  cameraModeToggle.setAttribute('aria-pressed',String(cameraModeActive));
  const label=cameraModeActive?'Close Camera':'Camera';
  cameraModeToggle.querySelector('.action__label').textContent=label;
  cameraModeToggle.title=label;
}
function showZoomFeedback(hold=false){
  cameraControlsPanel.hidden=false;cameraModeSliders.hidden=false;cameraDirection.hidden=true;
  cameraControlsPanel.classList.add('is-zoom-feedback');
  clearTimeout(zoomFeedbackTimer);
  if(!hold)zoomFeedbackTimer=setTimeout(()=>cameraControlsPanel.classList.remove('is-zoom-feedback'),1800);
}
function cameraModeViewForVisiblePom(previous){
  const position=worldPosition(player),focus=cameraFocus??viewTarget,basePitch=previous.pitch*Math.PI/180,distance=render3D.camera.pos.subtract(focus).length(),currentYaw=cameraYaw();
  const boxes=groups.flatMap(group=>group.cells.map(cell=>({min:{x:cell.x,y:H-cell.y-1,z:group.depth?0:-CARDBOARD_THICKNESS},max:{x:cell.x+1,y:H-cell.y,z:group.depth+.025}})));
  const offsets=[22.5,-22.5,...Array.from({length:7},(_,index)=>[25+index*2.5,-25-index*2.5]).flat()];
  const candidates=offsets.map(offset=>Math.max(-40,Math.min(40,previous.yaw+offset))).filter((yaw,index,all)=>all.findIndex(value=>Math.abs(value-yaw)<.001)===index);
  let best=null;
  for(const yaw of candidates){
    const angle=studyStraight()&&cameraState.motion!=='track'?-yaw*Math.PI/180:currentYaw;
    const options={position,focus,distance,yaw:angle,currentYaw,currentPitch:basePitch,perspective:studyPerspective(),boxes};
    const visibility=visibilityAtPitch({...options,pitch:basePitch});
    const candidate={yaw,pitch:basePitch,visibility,focus:visibilityCameraPose({...options,pitch:basePitch}).focus};
    if(!best||visibility>best.visibility)best=candidate;
    if(visibility>=8/9)return candidate;
  }
  best=null;
  for(const yaw of candidates){
    const angle=studyStraight()&&cameraState.motion!=='track'?-yaw*Math.PI/180:currentYaw;
    const options={position,focus,distance,yaw:angle,currentYaw,currentPitch:basePitch,perspective:studyPerspective(),boxes};
    const result=chooseVisibilityPitch({...options,basePitch}),candidate={yaw,pitch:result.pitch,visibility:result.visibility,focus:visibilityCameraPose({...options,pitch:result.pitch}).focus};
    if(!best||candidate.visibility>best.visibility)best=candidate;
    if(result.visibility>=8/9)return candidate;
  }
  return best;
}
function setCameraMode(active){
  if(active===cameraModeActive)return;
  if(active){
    enterPlayFromIntro();cameraModePrevious={yaw:cameraState.yaw,pitch:cameraState.pitch,unit:viewUnit,target:viewTarget.copy()};cameraModeActive=true;
    const visibleView=cameraModeViewForVisiblePom(cameraModePrevious);
    cameraState.yaw=visibleView.yaw;cameraState.pitch=visibleView.pitch*180/Math.PI;
    viewTarget=vec3(visibleView.focus.x-(cameraState.motion==='track'?cameraState.truck*W/100:0),visibleView.focus.y,visibleView.focus.z);
    viewTouched=true;clearBoardHover();syncCameraMode();applyCameraStudy({orbit:true});
  }else{
    cameraModeActive=false;
    if(cameraModePrevious){cameraState.yaw=cameraModePrevious.yaw;cameraState.pitch=cameraModePrevious.pitch;viewUnit=cameraModePrevious.unit;viewTarget=cameraModePrevious.target}
    cameraModePrevious=null;syncCameraMode();
    if(gameReady&&viewReady){applyCameraStudy({orbit:true});resumeStudyFollow()}
  }
}
cameraModeToggle.addEventListener('click',()=>{
  if(gameReady&&viewReady&&!levelLoading&&!busy&&!won)setCameraMode(!cameraModeActive);
});
function syncCameraSliders(){
  if(cameraControlsPanel.hidden||!viewUnit)return;
  const {min,max}=cameraZoomBounds(),zoom=cameraControlsPanel.querySelector('[data-camera-control="zoom"]');
  zoom.disabled=max<=min;zoom.value=max>min?String(Math.max(0,Math.min(100,Math.round(100*Math.log(viewUnit/min)/Math.log(max/min))))):'0';
  zoom.setAttribute('aria-valuetext',`${Math.round(viewUnit/min*100)}%`);
  cameraControlsPanel.querySelector('[data-zoom-step="1"]').disabled=viewUnit>=max-.0001;
  cameraControlsPanel.querySelector('[data-zoom-step="-1"]').disabled=viewUnit<=min+.0001;
  const cube=cameraControlCube(cameraState.yaw,cameraState.pitch);
  for(const name of ['front','top','side','edges'])cameraDirection.querySelector(`.camera-controls__cube-${name}`).setAttribute('d',cube[name]);
  for(const name of ['vertical','horizontal'])cameraDirection.querySelector(`.camera-controls__axis-${name}`).setAttribute('d',cube[name]);
  for(const name of ['vertical','horizontal'])cameraDirection.querySelector(`.camera-controls__axis-${name}-face`).setAttribute('d',cube[`${name}Face`]);
}
cameraControlsPanel.addEventListener('input',event=>{
  const input=event.target;if(!input.matches('input[data-camera-control]')||!gameReady||!viewReady||levelLoading||busy||won)return;
  enterPlayFromIntro();viewTouched=true;clearBoardHover();
  const control=input.dataset.cameraControl,value=Number(input.value);
  if(control==='zoom'){
    const {min,max}=cameraZoomBounds();zoomBoard(min*(max/min)**(value/100),wrap.clientWidth/2,wrap.clientHeight/2);
    applyBoardView();resetStudyFollow();return;
  }
});
cameraControlsPanel.addEventListener('click',event=>{
  const button=event.target.closest('[data-zoom-step]');
  if(!button||button.disabled||!gameReady||!viewReady||levelLoading||busy||won)return;
  enterPlayFromIntro();viewTouched=true;clearBoardHover();
  const {min,max}=cameraZoomBounds(),factor=(max/min)**.1;
  zoomBoard(viewUnit*(button.dataset.zoomStep==='1'?factor:1/factor),wrap.clientWidth/2,wrap.clientHeight/2);
  applyBoardView();resetStudyFollow();
});
function setCameraDirection(yaw,pitch){
  if(!cameraModeActive||!gameReady||!viewReady||levelLoading||busy||won)return;
  cameraState.yaw=Math.max(-40,Math.min(40,yaw));cameraState.pitch=Math.max(5,Math.min(45,pitch));
  viewTouched=true;clearBoardHover();applyCameraStudy({orbit:true});
}
trackingMode.addEventListener('change',()=>{wrap.dataset.cameraTrackingMode=trackingMode.value;followTime=timeReal});
tuningToggle.addEventListener('click',()=>{
  const open=cameraTuning.hidden;
  cameraTuning.hidden=!open;
  tuningToggle.setAttribute('aria-expanded',String(open));
});
function applyCameraTuning({updatePitch=false}={}){
  extrusionScale=tuningEnabled.checked?Number(tuningDepth.value)/100:1;
  if(updatePitch){
    cameraState.pitch=(tuningEnabled.checked?experimentalPitch:null)??20;
    if(cameraModePrevious)cameraModePrevious.pitch=cameraState.pitch;
  }
  tuningPitch.previousElementSibling.value=tuningPitch.value+'°';
  tuningDepth.previousElementSibling.value=tuningDepth.value+'%';
  enterPlayFromIntro();viewTouched=true;clearBoardHover();clearRoutePreview();
  applyCameraStudy({orbit:true});
}
tuningEnabled.addEventListener('change',()=>applyCameraTuning({updatePitch:true}));
tuningPitch.addEventListener('input',()=>{
  experimentalPitch=Number(tuningPitch.value);
  applyCameraTuning({updatePitch:tuningEnabled.checked});
});
tuningDepth.addEventListener('input',()=>applyCameraTuning());
document.querySelector('#resetCameraTuning').addEventListener('click',()=>{
  experimentalPitch=null;tuningPitch.value='20';tuningDepth.value='100';
  applyCameraTuning({updatePitch:true});
});
let cameraDirectionDrag=null;
cameraDirection.addEventListener('pointerdown',event=>{
  if(event.button!==0||!cameraModeActive)return;
  event.preventDefault();cameraDirection.focus({preventScroll:true});cameraDirection.setPointerCapture(event.pointerId);
  cameraDirectionDrag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:cameraState.yaw,pitch:cameraState.pitch};
});
cameraDirection.addEventListener('pointermove',event=>{
  if(cameraDirectionDrag?.id!==event.pointerId)return;
  setCameraDirection(cameraDirectionDrag.yaw+(event.clientX-cameraDirectionDrag.x)*.6,cameraDirectionDrag.pitch+(event.clientY-cameraDirectionDrag.y)*.6);
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])cameraDirection.addEventListener(type,event=>{if(cameraDirectionDrag?.id===event.pointerId)cameraDirectionDrag=null});
cameraDirection.addEventListener('keydown',event=>{
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
  if(!delta)return;event.preventDefault();setCameraDirection(cameraState.yaw+delta[0],cameraState.pitch+delta[1]);
});
function clearBoardHover(){hovered=null;if(hoverObject)hoverObject.color=new Color(1,1,1,0)}
function boardPoint(e){const r=wrap.getBoundingClientRect();return {x:e.clientX-r.left-wrap.clientLeft,y:e.clientY-r.top-wrap.clientTop}}
function draggableFrontPiece(e){
  if(!controlFeatures.enabled('pieceDragArrows')||controlFeatures.enabled('stackedPieceButtons')||busy||introPlaying||boardPointers.size||document.querySelector('.stage').inert)return null;
  const p=boardPoint(e),ray=render3D.screenToRay(vec2(p.x,p.y),vec2(wrap.clientWidth,wrap.clientHeight));
  if(puzzleProjectionState().enabled){
    const hit=puzzleRaycast(ray,[...blockObjects,...topPickObjects,...extrusionOutlines])[0];
    const piece=groups.find(g=>g.objects.includes(hit));if(!piece||!canInteract(piece))return null;
    const z=(visualDepth(piece)+.025)*extrusionScale,t=(z-ray.origin.z)/ray.direction.z;if(t<0||!Number.isFinite(t))return null;
    const point=logicalPuzzlePoint(ray.getPosition(t));return {piece,front:true,x:point.x,y:unStretchY(point.y),distance:t};
  }
  const logical=boardRay(ray),skew=depthSkew();
  const hit=pickPieceFront({origin:{x:logical.origin.x-skew*logical.origin.z,y:logical.origin.y,z:logical.origin.z},direction:{x:logical.direction.x-skew*logical.direction.z,y:logical.direction.y,z:logical.direction.z}},groups,H);
  if(!hit||!canInteract(hit.piece))return null;
  return hit;
}
let sceneryGesture=null;
let routePreview=null,routePreviewTimer,movementMarkerRoute=null,movementMarkerRouteTargets=null,movementMarkerRouteIndex=0;
let routeCanvas,routeContext,routeMask,routeMaskContext;
function routeDrawingContext(){
  if(!routeCanvas){
    routeCanvas=document.createElement('canvas');routeCanvas.setAttribute('aria-hidden','true');
    Object.assign(routeCanvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'2',pointerEvents:'none'});
    wrap.append(routeCanvas);routeContext=routeCanvas.getContext('2d');routeMask=document.createElement('canvas');routeMaskContext=routeMask.getContext('2d');
  }
  return routeContext;
}
function clearRoutePreview(){
  clearTimeout(routePreviewTimer);routePreview=null;
  if(routeCanvas&&routeContext)routeContext.clearRect(0,0,routeCanvas.width,routeCanvas.height);
}
function drawRoutePreview(){
  if(!routePreview)return;
  if(!controlFeatures.enabled('movementArrow')){clearRoutePreview();return}
  const arrowHeadLength=7;
  const size=vec2(wrap.clientWidth,wrap.clientHeight),points=[],camera=render3D.camera,right=camera.getRight();
  const canvas=routeCanvas?routeContext:routeDrawingContext(),ratio=window.devicePixelRatio||1,width=Math.round(size.x*ratio),height=Math.round(size.y*ratio);
  if(routeCanvas.width!==width||routeCanvas.height!==height){routeCanvas.width=width;routeCanvas.height=height;routeMask.width=width;routeMask.height=height;routePreview.geometryKey=''}
  const geometryKey=[size.x,size.y,camera.pos.x,camera.pos.y,camera.pos.z,camera.rotation.x,camera.rotation.y,camera.rotation.z,camera.fov,camera.orthographic,viewUnit,yStretch].join(':');
  if(routePreview.geometryKey===geometryKey&&!routePreview.fadeAt)return;
  routePreview.geometryKey=geometryKey;
  canvas.setTransform(ratio,0,0,ratio,0,0);canvas.clearRect(0,0,size.x,size.y);
  const drawing=routeMaskContext,alpha=.8*(routePreview.fadeAt?Math.max(0,1-(performance.now()-routePreview.fadeAt)/350):1);
  drawing.setTransform(ratio,0,0,ratio,0,0);drawing.clearRect(0,0,size.x,size.y);
  const screen=p=>render3D.worldToScreen(p,size);
  const pixelScale=p=>{
    const a=screen(p),b=screen(p.add(right.scale(.1)));
    return a&&b?.x!==undefined ? .1/Math.max(.001,Math.hypot(b.x-a.x,b.y-a.y)) : 0;
  };
  // Place the overlay just above the surface Pom walks on, rather than at his
  // raised movement anchor.
  function routePoint(p){
    const center=puzzlePoint(worldPoint(p.x,p.y,p.z));
    const base=screen(center),raised=screen(puzzlePoint(worldPoint(p.x,p.y+1,p.z)));
    const lift=base&&raised?2/Math.max(.001,Math.hypot(raised.x-base.x,raised.y-base.y)):pixelScale(center)*2;
    return puzzlePoint(worldPoint(p.x,p.y-.22+unStretchY(lift),p.z));
  }
  const visiblePlans=routePreview.plans;
  for(const plan of visiblePlans)for(const p of plan.points){
    const point=routePoint(p);
    if(!points.length||point.subtract(points.at(-1)).length()>.001)points.push(point);
  }
  let centers=[];
  if(points.length<2){
    if(routePreview.plans.length!==1)return;
    const plan=routePreview.plans[0],tip=screen(routePoint(plan.points.at(-1))),before=screen(routePoint(plan.points[Math.max(0,plan.points.length-2)]));
    if(!tip||!before)return;
    const dx=tip.x-before.x,dy=tip.y-before.y,length=Math.hypot(dx,dy)||1,tail=arrowHeadLength+2;centers=[{x:tip.x-dx/length*tail,y:tip.y-dy/length*tail},tip];
  }else{
    const separated=[points[0]];
    for(let i=1;i<points.length-1;i++){
      const a=points[i-1],b=points[i];
      let end=i;
      while(end+1<points.length-1&&Math.abs(points[end+1].y-b.y)<=.03&&points[end+1].subtract(b).length()<.24)end++;
      const c=points[end+1],from=screen(a),turn=screen(b),to=screen(c);
      if(a.y>b.y+.03&&c.y>points[end].y+.03&&from&&turn&&to){
        const ax=from.x-turn.x,ay=from.y-turn.y,bx=to.x-turn.x,by=to.y-turn.y;
        const al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
        if(al>1&&bl>1&&(ax*bx+ay*by)/(al*bl)>.85){
          // Give overlapping descent and ascent their own sides of the turn.
          const offset=right.scale(Math.min(.16,pixelScale(b)*7));
          const direction=from.x>to.x?-1:1;
          separated.push(b.subtract(offset.scale(direction)),...points.slice(i,end+1),points[end].add(offset.scale(direction)));
          i=end;
          continue;
        }
      }
      separated.push(b);
    }
    separated.push(points.at(-1));
    centers=separated.map(point=>screen(point)).filter(Boolean);
    for(let i=centers.length-1;i>0;i--)if(Math.hypot(centers[i].x-centers[i-1].x,centers[i].y-centers[i-1].y)<.1)centers.splice(i,1);
  }
  if(centers.length<2)return;
  const tip=centers.at(-1);let previous=centers.length-2;
  while(previous>0&&Math.hypot(tip.x-centers[previous].x,tip.y-centers[previous].y)<2)previous--;
  const before=centers[previous],dx=tip.x-before.x,dy=tip.y-before.y,len=Math.hypot(dx,dy)||1;
  const head=[{x:tip.x-dx/len*7+dy/len*4.5,y:tip.y-dy/len*7-dx/len*4.5},tip,{x:tip.x-dx/len*7-dy/len*4.5,y:tip.y-dy/len*7+dx/len*4.5}];
  function bodyPath(){
    drawing.beginPath();drawing.moveTo(centers[0].x,centers[0].y);
    for(let i=1;i<centers.length-1;i++){
      const a=centers[i-1],b=centers[i],c=centers[i+1],ax=a.x-b.x,ay=a.y-b.y,bx=c.x-b.x,by=c.y-b.y,al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
      if(al<.1||bl<.1)continue;
      const radius=Math.min(14,al/2,bl/2);
      drawing.lineTo(b.x+ax/al*radius,b.y+ay/al*radius);
      drawing.quadraticCurveTo(b.x,b.y,b.x+bx/bl*radius,b.y+by/bl*radius);
    }
    drawing.lineTo(centers.at(-1).x,centers.at(-1).y);
  }
  const headPath=()=>{drawing.beginPath();drawing.moveTo(head[0].x,head[0].y);drawing.lineTo(head[1].x,head[1].y);drawing.lineTo(head[2].x,head[2].y)};
  drawing.save();drawing.lineCap='round';drawing.lineJoin='round';drawing.strokeStyle='#ffd23f';drawing.lineWidth=8;
  bodyPath();drawing.stroke();headPath();drawing.stroke();drawing.restore();
  canvas.globalAlpha=alpha;canvas.drawImage(routeMask,0,0,width,height,0,0,size.x,size.y);canvas.globalAlpha=1;
  const pomMesh=playerObject?.mesh,meshPoints=pomMesh?.points;
  if(meshPoints?.length>2){
    const matrix=playerObject.getMatrix(),gpuProjection=puzzleGPU?.active;
    const contour=(pomReaching?meshPoints:meshPoints.slice(1)).map(point=>{
      const world=matrix.transformPoint(point);
      return screen(gpuProjection?puzzlePoint(world):world);
    }).filter(Boolean);
    if(contour.length>2){
      canvas.save();canvas.globalCompositeOperation='destination-out';canvas.beginPath();canvas.moveTo(contour[0].x,contour[0].y);
      for(const point of contour.slice(1))canvas.lineTo(point.x,point.y);
      canvas.closePath();canvas.fill();canvas.lineWidth=1;canvas.lineJoin='round';canvas.stroke();canvas.restore();
    }
  }
}
function previewRoute(e){
  clearRoutePreview();if(!controlFeatures.enabled('movementArrow')||busy||won||levelLoading)return;
  const point=boardPoint(e),ray=render3D.screenToRay(vec2(point.x,point.y),vec2(wrap.clientWidth,wrap.clientHeight));
  const stud=pickMovementMarker(ray);let target=stud??standableAt(ray,point);
  if(!target){
    const hits=puzzleRaycast(ray,[...blockObjects,...topPickObjects,...extrusionOutlines]);
    if(hits.some(o=>blockObjects.includes(o)||topObjectInfo.has(o)||sideObjectInfo.has(o)))return;
    const floor=pointOnFloor(ray);
    if(floor){target=standableReachable().filter(p=>p.y===H).sort((a,b)=>{const pa=worldPosition(a),pb=worldPosition(b);return Math.hypot(pa.x-floor.x,pa.z-floor.z)-Math.hypot(pb.x-floor.x,pb.z-floor.z)})[0];if(target){const p=worldPosition(target);if(Math.hypot(p.x-floor.x,p.z-floor.z)>=1.15)target=null}}
  }
  if(!target)return;
  const path=findPath(target);if(!path||path.length<2)return;
  routePreview={pointer:e.pointerId,target,path,plans:path.slice(1).map((to,i)=>routeFor(path[i],to)),board:movementBoard(),start:nodeKey(player),stud:!!stud};drawRoutePreview();
}
function sceneryRay(e){const p=boardPoint(e);return render3D.screenToRay(vec2(p.x,p.y),vec2(wrap.clientWidth,wrap.clientHeight))}
function warpTapTarget(point){
  if(warpPipePreview||busy||won||levelLoading||!viewReady||!warpPreviewEnds.length||!warpDestination(movementBoard(),player,activeLevel.warpPairs))return false;
  const size=vec2(wrap.clientWidth,wrap.clientHeight),project=point=>render3D.worldToScreen(puzzlePoint(point),size);
  const y=H-player.y,polygon=[[player.x,player.z],[player.x+1,player.z],[player.x+1,player.z+1],[player.x,player.z+1]].map(([x,z])=>project(worldPoint(x,y,z)));
  if(nearestMovementTarget(point,[{node:player,polygon}],{margin:0}))return true;
  // Pom is often easier to tap than the small visible area of his square.
  const matrix=playerObject.getMatrix(),body=pomContour.map(([x,y])=>project(matrix.transformPoint(vec3(x,y,0))));
  return !!nearestMovementTarget(point,[{node:player,polygon:body}],{margin:0});
}
function activateCurrentWarp(){
  const endpoints=warpEndpoints(),source=endpoints.findIndex(({cell,group})=>player.x===cell.x&&player.y===cell.y&&player.z===group.depth-1);
  if(source<0)return;
  animateWarpPreview(source,source%2?source-1:source+1);
}
function boardDown(e){
  if(pieceDrag.active)return;
  if(levelLoading||won||!viewReady||e.button>0)return;enterPlayFromIntro();stopIntro();
  if(!viewportUI.pageZoomed&&isBackgroundStudio()&&cameraState.environment==='daisy-meadow'){
    const hit=pickScenery(sceneryRay(e),cameraScenery.pickRecords);
    if(hit&&backgroundStudio.selectElement(hit.record.id)){
      const item=backgroundStudio.values.sceneryLayout.find(item=>item.id===hit.record.id);
      sceneryGesture={pointer:e.pointerId,hit,startX:item.x,startY:item.y,startZ:item.z};wrap.setPointerCapture(e.pointerId);resetStudyFollow();e.preventDefault();return;
    }
  }
  const point=boardPoint(e),warpTap=warpTapTarget(point),nearbyTop=warpTap?null:nearbyMovementTarget(point,{topsOnly:true});
  const piece=viewportUI.pageZoomed||nearbyTop||warpTap?null:draggableFrontPiece(e);
  if(piece){selected=piece.piece;pieceDragAnchor=piece;updateUI();if(pieceDrag.beginFace(e))return}
  const p=boardPoint(e);boardPointers.set(e.pointerId,p);if(!viewportUI.pageZoomed)wrap.setPointerCapture(e.pointerId);
  if(boardPointers.size===1){boardGesture={id:e.pointerId,x:p.x,y:p.y,moved:false,multi:false,warpTap};if(!warpTap)previewRoute(e);else clearRoutePreview()}else{boardGesture.multi=true;clearRoutePreview();clearBoardHover()}
}
function boardMove(e){
  if(viewportUI.pageZoomed){
    // Leave browser pan/pinch available once the page itself is magnified.
    // Track movement only to distinguish a tap from native panning.
    if(sceneryGesture?.pointer===e.pointerId||pieceDrag.active){boardUp(e,true);return}
    if(boardPointers.has(e.pointerId)){
      const p=boardPoint(e);boardPointers.set(e.pointerId,p);
      if(boardGesture){boardGesture.moved||=Math.hypot(p.x-boardGesture.x,p.y-boardGesture.y)>6;boardGesture.multi||=boardPointers.size>1;if(boardGesture.moved||boardGesture.multi)clearRoutePreview()}
    }
    return;
  }
  if(sceneryGesture?.pointer===e.pointerId){
    const g=sceneryGesture,p=scenePlanePoint(sceneryRay(e),g.hit.record);
    if(p){const delta={x:p.point.x-g.hit.point.x,y:p.point.y-g.hit.point.y,z:p.point.z-g.hit.point.z},axis=g.hit.record.axis;backgroundStudio.moveElement(g.hit.record.id,g.startX+delta.x*axis.x+delta.z*axis.z,g.startY+delta.y,g.startZ+delta.x*g.hit.record.depthAxis.x+delta.z*g.hit.record.depthAxis.z)}
    e.preventDefault();return;
  }
  if(pieceDrag.pointerMove(e)){e.preventDefault();return}
  if(!boardPointers.has(e.pointerId)){if(e.pointerType!=='touch')updateHover(e);return}
  const before=[...boardPointers.values()],old=boardPointers.get(e.pointerId),p=boardPoint(e);boardPointers.set(e.pointerId,p);
  if(boardPointers.size>=2){
    boardGesture.multi=true;boardGesture.moved=true;clearRoutePreview();const after=[...boardPointers.values()],a=before[0],b=before[1],c=after[0],d=after[1],oldDistance=Math.hypot(a.x-b.x,a.y-b.y),distance=Math.hypot(c.x-d.x,c.y-d.y),cx=(c.x+d.x)/2,cy=(c.y+d.y)/2;
    panBoard(cx-(a.x+b.x)/2,cy-(a.y+b.y)/2);if(oldDistance>1)zoomBoard(viewUnit*distance/oldDistance,cx,cy);
  }else{
    if(Math.hypot(p.x-boardGesture.x,p.y-boardGesture.y)>6)boardGesture.moved=true;
    if(!boardGesture.moved)return;clearRoutePreview();panBoard(p.x-old.x,p.y-old.y);
  }
  viewTouched=true;clearBoardHover();applyBoardView();resetStudyFollow();e.preventDefault();
}
function boardUp(e,cancel=false){
  if(sceneryGesture?.pointer===e.pointerId){const g=sceneryGesture;sceneryGesture=null;if(cancel)backgroundStudio.moveElement(g.hit.record.id,g.startX,g.startY,g.startZ);if(wrap.hasPointerCapture(e.pointerId))wrap.releasePointerCapture(e.pointerId);return}
  if(pieceDrag.pointerUp(e,cancel))return;
  if(!boardPointers.has(e.pointerId))return;boardPointers.delete(e.pointerId);
  const tap=!cancel&&boardPointers.size===0&&boardGesture&&!boardGesture.moved&&!boardGesture.multi;
  const warpTap=tap&&boardGesture.warpTap&&warpTapTarget(boardPoint(e));
  if(wrap.hasPointerCapture(e.pointerId))wrap.releasePointerCapture(e.pointerId);
  if(boardPointers.size===0)boardGesture=null;
  if(warpTap){clearRoutePreview();activateCurrentWarp();return}
  const preview=routePreview;
  if(tap&&preview&&preview.pointer===e.pointerId&&preview.board===movementBoard()&&preview.start===nodeKey(player)){
    viewTouched=true;moveTo(preview.target,preview.stud,preview);preview.fadeAt=performance.now();routePreviewTimer=setTimeout(clearRoutePreview,350);
  }else{clearRoutePreview();if(tap&&!preview){viewTouched=true;clickBoard(e)}}
}
function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
function expandVictoryBoard(rect,progress){
  const expanded=wrap.getBoundingClientRect();
  wrap.style.clipPath=progress>=1?'':victoryBoardClip(expanded,rect,progress);
  victoryEffects.setExpansionOutline(rect,expanded,progress);
}
function keepVictoryPomVisible(width,height,yaw,pitch,fov){
  const size=vec2(width,height),pom=playerObject.pos3D,point=render3D.worldToScreen(pom,size);
  if(!point)return;
  const edge=render3D.worldToScreen(pom.add(render3D.camera.getRight().scale(.5)),size);
  const margin=Math.min(width*.45,height*.45,Math.max(16,edge?Math.abs(edge.x-point.x)+8:16));
  const x=Math.max(margin,Math.min(width-margin,point.x)),y=Math.max(margin,Math.min(height-margin,point.y));
  if(Math.abs(x-point.x)<.1&&Math.abs(y-point.y)<.1)return;
  const ray=render3D.screenToRay(vec2(x,y),size),forward=render3D.camera.getForward(),denominator=ray.direction.dot(forward);
  if(Math.abs(denominator)<1e-6)return;
  const distance=pom.subtract(ray.origin).dot(forward)/denominator;
  configureStudyCamera(viewSpan(),cameraFocus.add(pom.subtract(ray.getPosition(distance))),yaw,pitch,fov);
  render3D.updateMatrices(width/height);syncCellGeometry();syncBackground();syncFloorGrid();syncPlayer();syncPuzzleProjection();
}
function syncVictoryShowcase(now,sequence){
  if(celebration!==sequence)return;
  const elapsed=now-sequence.start;
  expandVictoryBoard(sequence.boardRect,sequence.reducedMotion?1:ease(elapsed/700));
  const width=wrap.clientWidth,height=wrap.clientHeight;
  const turn=sequence.reducedMotion?1:ease(elapsed/1200);
  // Looking along the extrusion shear makes the complete mural read as a flat image.
  const yaw=sequence.yaw*(1-turn)+Math.atan(depthSkew())*turn,pitch=sequence.pitch*(1-turn);
  const top=24,bottom=24;
  const visual=puzzleVisualBounds(),unit=victoryFrameUnit(width,height,visual.right-visual.left,visual.height);
  // This is the camera endpoint at zero pitch, where yStretch is exactly 1.
  const finalHeight=height/unit,target=vec3((visual.left+visual.right)/2+extrusion(1.5).x,(visual.height+.85)/2+(top-bottom)/(2*unit),1.5);
  const fov=sequence.baseFov+(cameraState.fov-sequence.baseFov)*turn;
  configureStudyCamera(sequence.baseHeight+(finalHeight-sequence.baseHeight)*turn,sequence.baseTarget.lerp(target,turn),yaw,pitch,fov);
  // Keep Pom celebrating through the camera move and the rotating star.
  sequence.jump=!sequence.reducedMotion?.32*Math.sin(Math.PI*(elapsed%580)/580):0;
  render3D.updateMatrices(width/height);syncCellGeometry();syncBackground();syncFloorGrid();syncPlayer();syncPuzzleProjection();
  keepVictoryPomVisible(width,height,yaw,pitch,fov);
  const fade=ease((elapsed-250)/2000),strength=currentDesign().shadows.strength*(1-fade);
  render3D.sunColor=new Color(strength,strength,strength);
  wrap.dataset.view='completed';wrap.dataset.cameraPitch=pitch.toFixed(2);
  if(elapsed>=3200){
    if(isMakerPlaytest){showPlaytestResult();return}
    const rect=wrap.getBoundingClientRect(),size=vec2(width,height),center=victoryCenter(rect,window.innerWidth,window.innerHeight),screen=vec2(center.x,center.y);
    const ray=render3D.screenToRay(screen,size),forward=render3D.camera.getForward(),denominator=ray.direction.dot(forward);
    const distance=denominator?playerObject.pos3D.subtract(ray.origin).dot(forward)/denominator:0;
    const offset=playerObject.pos3D.subtract(ray.getPosition(distance)),baseTarget=cameraFocus.copy(),span=viewSpan();
    const recenter=progress=>{
      if(celebration!==sequence)return;
      if(!sequence.reducedMotion)sequence.jump=.32*Math.sin(Math.PI*((performance.now()-sequence.start)%580)/580);
      configureStudyCamera(span,baseTarget.add(offset.scale(progress)),yaw,pitch);
      render3D.updateMatrices(width/height);syncCellGeometry();syncBackground();syncFloorGrid();syncPlayer();syncPuzzleProjection();
    };
    victoryEffects.transitionTo(recenter,()=>showMenu('levels',sequence.levelId,{preserveVictoryTransition:true,deferCheck:true})).then(card=>{
      if(card?.isConnected){card.classList.add('is-just-completed');card.focus({preventScroll:true})}
    });
    return;
  }
  requestAnimationFrame(now=>syncVictoryShowcase(now,sequence));
}
function startCelebration(){
  hideHelp();stopIntro();selected=null;clearBoardHover();
  const rect=wrap.getBoundingClientRect(),boardRect={left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height,radius:parseFloat(getComputedStyle(wrap).borderTopLeftRadius)||0};
  const height=viewSpan(),originalHeight=wrap.clientHeight,target=(cameraFocus??viewTarget).copy(),right=render3D.camera.getRight(),up=render3D.camera.getUp();
  const sequence=celebration={start:performance.now(),levelId:activeLevel.id,pitch:viewPitch,yaw:cameraYaw(),reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,boardRect};
  setUmbrellaVisible(false);victoryEffects.start(activeLevel.name);document.querySelector('.stage').classList.add('is-won');
  const expanded=wrap.getBoundingClientRect(),expandedHeight=wrap.clientHeight,ratio=expandedHeight/Math.max(1,originalHeight),worldPerPixel=height/Math.max(1,originalHeight);
  setCanvasFixedSize(vec2(Math.max(1,wrap.clientWidth),Math.max(1,expandedHeight)));
  sequence.baseHeight=height*ratio;
  sequence.baseFov=studyPerspective()?victoryExpandedFov(cameraState.fov,ratio):cameraState.fov;
  sequence.baseTarget=target.add(right.scale((expanded.left+expanded.width/2-rect.left-rect.width/2)*worldPerPixel)).add(up.scale((rect.top+rect.height/2-expanded.top-expanded.height/2)*worldPerPixel));
  expandVictoryBoard(boardRect,0);requestAnimationFrame(now=>syncVictoryShowcase(now,sequence));
}
function cloneProjectionMesh(source){
  const mesh=new Mesh().combine(source);mesh.doubleSided=source.doubleSided;mesh.dynamicDraw=true;return mesh;
}
const puzzleMeshes=createPuzzleMeshProjection(cloneProjectionMesh);
let puzzleGPU;
const requestGPUProjection=new URLSearchParams(location.search).get('projection')!=='cpu';
let projectionCamera;
function puzzleProjectionState(){
  const camera=render3D.camera,p=camera.pos,r=camera.rotation;
  const enabled=!cameraModeActive&&!cameraLab&&(!isPreviewLevel(activeLevel)||isBackgroundStudio())&&studyPerspective(),old=projectionCamera;
  if(!old||old.enabled!==enabled||old.depthScale!==extrusionScale||old.x!==p.x||old.y!==p.y||old.z!==p.z||old.rx!==r.x||old.ry!==r.y||old.rz!==r.z){
    projectionCamera={enabled,depthScale:extrusionScale,x:p.x,y:p.y,z:p.z,rx:r.x,ry:r.y,rz:r.z,value:puzzleProjection({enabled,depthScale:extrusionScale,eye:p,forward:camera.getForward(),up:camera.getUp()})};
  }
  return projectionCamera.value;
}
function puzzlePoint(point){const p=projectPuzzlePoint(puzzleProjectionState(),point);return vec3(p.x,p.y,p.z)}
function logicalPuzzlePoint(point){const p=unprojectPuzzlePoint(puzzleProjectionState(),point);return vec3(p.x,p.y,p.z)}
function syncPuzzleProjection(){
  const projection=puzzleProjectionState();puzzleGPU?.begin(projection,requestGPUProjection&&extrusionScale===1);
  const gpu=puzzleGPU?.active;
  const backend=projection.enabled?(gpu?'gpu':'cpu'):'native';
  if(wrap.dataset.puzzleProjection!==backend)wrap.dataset.puzzleProjection=backend;
  if(gpu)puzzleMeshes.clear();else puzzleMeshes.begin(projection);
  const apply=object=>gpu?puzzleGPU.apply(object):puzzleMeshes.apply(object);
  for(const g of groups)for(const object of g.objects)apply(object);
  for(const object of [...extrusionObjects,...extrusionOutlines,...topPickObjects,...(movementMarkers?.renderObjects??[]),flagPrint,flagPole,flagCloth,flagVase,flagCap,hoverObject,studioTargetObject])apply(object);
  for(const parts of warpPreviewEnds)for(const object of Object.values(parts))apply(object);
  for(const object of [...pomParts,umbrellaCanopy,umbrellaHandle,...umbrellaPanels])if(object?.mesh){if(gpu)puzzleGPU.apply(object);else puzzleMeshes.apply(object,object.getMatrix())}
  if(!gpu)puzzleMeshes.end();
}
function puzzlePick(objects,query){return puzzleGPU?.active?puzzleGPU.pick(objects,query):query()}
function puzzleRaycast(ray,objects){return puzzlePick(objects,()=>engineObjectsRaycast3D(ray,objects))}

function gameInit(){
  const bounds=wrap.getBoundingClientRect();setCanvasFixedSize(vec2(Math.max(1,bounds.width),Math.max(1,bounds.height)));
  setCanvasClearColor(new Color(1,250/255,240/255));
  setDebugWatermark(false);puzzleGPU=createPuzzleGPUProjection({gl:glContext,cloneMesh:cloneProjectionMesh});new Render3DPlugin();puzzleGPU.attach(render3D);
  movementMarkers=createMovementMarkers();
  if(warpPipePreview){
    const panel=document.createElement('div');
    panel.className='warp-preview-controls';
    panel.setAttribute('role','group');
    panel.setAttribute('aria-label','Warp pipe visual preview');
    for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])panel.addEventListener(type,event=>event.stopPropagation());
    for(const [label,depths,withPom] of [['Hidden',[0,0],false],['Inactive',[1,0],false],['Active',[1,1],false],['Pom on pipe',[1,1],true]]){
      const button=document.createElement('button');
      button.type='button';button.textContent=label;button.className='btn';
      button.onclick=()=>{
        if(groups.length<2)return;
        warpPreviewAnimation++;busy=false;warpPreviewWarping=false;warpPreviewOpeningVisible=false;warpPreviewMouth=1;resetWarpEyes();
        stopIntro();hideHelp();groups[0].depth=depths[0];groups[1].depth=depths[1];
        const pipeCell=groups[0].cells.reduce((best,cell)=>cell.y<best.y?cell:best);
        player=withPom?{x:pipeCell.x,y:pipeCell.y,z:0}:{x:-1,y:H,z:0};selected=null;clearMovementRoutes();
        syncBlocks();syncPlayer();syncFlag();updateUI();
        const frame=sceneFrame(wrap.clientWidth,wrap.clientHeight);viewUnit=wrap.clientHeight/(frame.height*1.12);viewTarget=frame.target.copy();resetStudyFollow({paused:true});applyBoardView(false);
      };
      panel.append(button);
    }
    const animateButton=document.createElement('button');animateButton.type='button';animateButton.className='btn';animateButton.textContent='Animate warp';animateButton.onclick=()=>animateWarpPreview();panel.append(animateButton);
    wrap.append(panel);
  }
  warpAction=document.createElement('button');warpAction.type='button';warpAction.className='warp-action';warpAction.textContent='Use warp pipe';warpAction.hidden=true;
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])warpAction.addEventListener(type,event=>event.stopPropagation());
  warpAction.onclick=activateCurrentWarp;wrap.append(warpAction);
  render3D.onRenderTransparent=drawMapOutlines;
  render3D.sunDirection=vec3(-.45,.8,.5);render3D.sunColor=new Color(1,.91,.75);render3D.ambientColor=new Color(.52,.51,.4);render3D.ambientGroundColor=new Color(.35,.4,.3);
  baseCameraHeight=fitCamera(bounds.width,bounds.height);render3D.camera.orthographic=baseCameraHeight;positionCameraForView(viewSide);
  // Keep the horizon on the wall's base line; pulled pieces then extend down
  // toward Pom in the camera projection without moving the scenery.
  render3D.updateMatrices(bounds.width/bounds.height);
  const makeBackdrop=(texture,color)=>{const o=new EngineObject3D(vec3(),box,texture,color);o.rotation3D=render3D.camera.rotation.copy();o.lighting=false;o.receiveShadow=false;o.castShadow=false;o.emissive=1;o.transparent=backgroundObjects.length===1;backgroundObjects.push(o);return o};
  makeBackdrop(undefined,new Color(1));makeBackdrop(undefined,new Color(1));
  const overlays=makeBackdrop(undefined,new Color(1));overlays.transparent=true;overlays.mesh=undefined;
  makeBackdrop(undefined,new Color(1));syncFloorGrid();
  environmentLoader=createEnvironmentLoader();activeEnvironmentTextures=[];
  syncBackground();
  makeGroups();rebuildBlockMeshes();
  hoverObject=makeSurface(vec3(0,-100,0),standingSpotMesh(),new Color(1,1,1,0));hoverObject.transparent=true;hoverObject.render3D=()=>{};
  studioTargetObject=makeSurface(vec3(0,-100,0),standingSpotMesh(),new Color(1,1,1,0));studioTargetObject.transparent=true;studioTargetObject.render3D=()=>{};
  playerObject=new EngineObject3D(vec3(.5,.2,.14),pomBlob,undefined,inkColor);playerObject.scale3D=vec3(.72,.56,.018);playerObject.rotation3D=render3D.camera.rotation.copy();playerObject.lighting=false;playerObject.softShadow=0;pomParts=[playerObject];
  pomLight=new Light3D(vec3(),2,new Color(1,.88,.68),1);
  pomBody=new EngineObject3D(vec3(0,0,1),pomBlob,undefined,new Color(.97,.22,.16));pomBody.scale3D=vec3(.88,.88,1);pomBody.lighting=false;playerObject.addChild(pomBody);pomParts.push(pomBody);
  {
    warpSmile=new EngineObject3D(vec3(0,-.16,2.5),undefined,undefined,inkColor);warpSmile.lighting=false;warpSmile.castShadow=false;playerObject.addChild(warpSmile);pomParts.push(warpSmile);
  }
  for(const x of [-.14,.14]){const white=new EngineObject3D(vec3(x,.12,2),pomEye,undefined,new Color(1,1,1)),black=new EngineObject3D(vec3(x,.12,2.2),pomEye,undefined,new Color(.12,.1,.09));white.scale3D=vec3(.22,.28,1);black.scale3D=vec3(.12,.154,1);white.lighting=false;black.lighting=false;playerObject.addChild(white);playerObject.addChild(black);pomEyes.push({white,black});pomParts.push(white,black)}
  const sweatContour=[...quadraticSegment([0,.6],[-.65,-.05],[-.35,-.3],10),...quadraticSegment([-.35,-.3],[0,-.7],[.35,-.3],10).slice(1),...quadraticSegment([.35,-.3],[.65,-.05],[0,.6],10).slice(1)],sweatMesh=makeFanMesh(sweatContour);
  for(let i=0;i<2;i++){const outline=new EngineObject3D(vec3(.48+i*.17,.65-i*.2,2.8),sweatMesh,undefined,new Color(.157,.145,.122,0)),fill=new EngineObject3D(vec3(0,0,.2),sweatMesh,undefined,new Color(.64,.83,.97,0));outline.scale3D=vec3(.17,.19,1);fill.scale3D=vec3(.70,.72,1);outline.lighting=fill.lighting=false;outline.transparent=fill.transparent=true;outline.addChild(fill);playerObject.addChild(outline);sweatDrops.push({outline,fill})}
  const umbrellaRim=[...Array.from({length:25},(_,i)=>{const a=-Math.PI/2+i*Math.PI/24;return[.52*Math.sin(a),.54*Math.cos(a)]}),[.39,-.04],[.26,0],[.13,-.04],[0,0],[-.13,-.04],[-.26,0],[-.39,-.04]],umbrellaCenter=[0,0];
  umbrellaCanopy=new EngineObject3D(vec3(0,.84,3),makeFanMesh(umbrellaRim),undefined,new Color(.15,.2,.27,0));umbrellaCanopy.scale3D=vec3(.78,.58,1);umbrellaCanopy.lighting=false;umbrellaCanopy.transparent=true;playerObject.addChild(umbrellaCanopy);
  for(let panel=0;panel<4;panel++){const start=-Math.PI/2+panel*Math.PI/4,end=start+Math.PI/4,arc=Array.from({length:9},(_,i)=>{const a=start+(end-start)*i/8;return[.5*Math.sin(a),.52*Math.cos(a)]}),piece=new EngineObject3D(vec3(0,.84,3.035),makeSectorMesh(umbrellaCenter,arc),undefined,new Color(1));piece.scale3D=vec3(.76,.56,1);piece.lighting=false;piece.transparent=true;playerObject.addChild(piece);umbrellaPanels.push(piece)}
  umbrellaHandle=new EngineObject3D(vec3(0,.84,2.96),makeFanMesh([[-.035,-.02],[.035,-.02],[.035,-.6],[-.035,-.6]]),undefined,new Color(.15,.2,.27,0));umbrellaHandle.lighting=false;umbrellaHandle.transparent=true;playerObject.addChild(umbrellaHandle);setUmbrellaVisible(false);
  const {mesh:print,texture:printTexture}=createGoalBadge();
  const vase=buildLathe([[.075,0],[.09,.015],[.115,.12],[.135,.13],[.135,.17],[.105,.17],[.095,.14],[0,.14]],20,true,true);
  vase.colors=vase.normals.map(n=>{const shade=n.y>.4?1:n.y<-.4?.64:.82+.1*(n.x*.6+n.z*.8);return new Color(shade,shade,shade)});vase.dirty=true;
  flagMeshes={print,pole:buildCapsule(.045,.68,12,4,true),vase,cap:buildSphere(.085,12,6,true)};
  flagPrint=new EngineObject3D(vec3(),print,printTexture,new Color(1));flagPrint.lighting=false;flagPrint.castShadow=false;flagPrint.transparent=true;flagMeshes.printTile=flagPrint.tileInfo;
  flagPole=new EngineObject3D(vec3(),flagMeshes.pole,undefined,inkColor);
  flagCloth=new EngineObject3D(vec3(),flagMesh,undefined,new Color(1,.443,.22));flagCloth.lighting=false;
  flagVase=new EngineObject3D(vec3(),vase,undefined,new Color(.56,.33,.20));
  flagCap=new EngineObject3D(vec3(),flagMeshes.cap,undefined,new Color(.72,.51,.28));
  autoSelectNearbyPiece();updateUI();startBoardView();gameReady=true;document.querySelector('.stage').classList.add('is-ready');catalogScreens?.ready();myPuzzles.openPending();if(interactionLab)openInteractionCase();if(!isMakerPlaytest&&(new URLSearchParams(location.search).has('background-studio')||new URLSearchParams(location.search).has('environment-studio')))startLevel(levels.find(level=>level.kind==='background-studio').id);if(cameraLab)startLevel(levels.find(level=>level.compatibility.playable&&level.kind==='puzzle').id);
}
function gameUpdate(){
  introTick?.(timeReal*1000);
  if(warpPreviewEnds.length&&(warpPipesMoving||warpPreviewPlayerKey!==`${player.x},${player.y},${player.z}`)){syncWarpPipePreview();if(!busy&&warpPlayerOnPipe())syncPlayer()}
  syncCellGeometry();syncPomMatrix();if(pomLight&&playerObject)pomLight.pos3D=puzzlePoint(playerObject.pos3D);updatePomGlow(performance.now());updateStudyFollow();updateStudyVisibility();keepPomEyesRound();
  designPlayground.updateCellMeasurement(cellMeasurement());
  movementMarkers?.update(performance.now());
  if(selected&&!won){const color=selectedSurfaceColor(selected);for(const object of selected.objects)object.color=color}else pulsePiece=null;
  updateSelectionLightbox();
  syncPuzzleProjection();
  if(routePreview){
    if(routePreview.fadeAt)drawRoutePreview();
    else if(routePreview.board!==movementBoard()||routePreview.start!==nodeKey(player))clearRoutePreview();else drawRoutePreview();
  }
}
function moveTo(p,pressMarker=false,preview=null){
  if(levelLoading||won||busy||introPlaying||nodeKey(p)===nodeKey(player))return;const path=preview?.path??findPath(p);if(!path||path.length<2){showHelp('That spot is out of reach. Push or pull the blocks to make a path.','unreachable');return}
  const plans=preview?.plans??path.slice(1).map((to,i)=>routeFor(path[i],to)),profiles=movementProfiles(plans);
  const winningArrival=!warpPipePreview&&!isPreviewLevel(activeLevel)&&nodeKey(path.at(-1))===nodeKey(goalNode());
  const pressDestination=pressMarker||(movementMarkersEnabled()&&p.y<H);
  movementMarkerRoute=pressDestination?path.slice(1):null;movementMarkerRouteTargets=pressDestination?standableReachable():null;movementMarkerRouteIndex=0;
  hideHelp();save();resumeStudyFollow();busy=true;effortFrame++;setUmbrellaVisible(false);falling=false;updateUI();let index=0,start;
  const readyAt=performance.now()+(pressDestination?(movementMarkers?.press(p)??0):0);
  function tick(now){
    if(now<readyAt){requestAnimationFrame(tick);return}
    start??=now;
    // Carry elapsed time across cell boundaries instead of inserting a fresh
    // animation frame and a full stop at the beginning of every next step.
    const previousIndex=index;
    while(index<plans.length&&now-start>=plans[index].duration){start+=plans[index].duration;player={...path[++index]};if(movementMarkerRoute)movementMarkerRouteIndex=index;resetPomShape();playerObject.scale3D=vec3(.72,.56,.018);for(const {white,black} of pomEyes){white.scale3D=vec3(.22,.28,1);black.scale3D=vec3(.12,.154,1)}for(const drop of sweatDrops){drop.outline.color.a=0;drop.fill.color.a=0}if(index<plans.length)saveUnfinished()}
    if(index!==previousIndex&&movementMarkerRoute)syncMovementMarkers();
    if(index===plans.length){
      falling=false;setUmbrellaVisible(false);busy=false;movementMarkerRoute=null;movementMarkerRouteTargets=null;movementMarkerRouteIndex=0;
      if(winningArrival){won=true;recordCompletedLevel();startCelebration()}
      else {
        if(!canInteract(selected))selected=null;
        autoSelectNearbyPiece();
        saveUnfinished();
      }
      if(warpPreviewEnds.length)syncPlayer();
      updateUI();return;
    }
    const plan=plans[index],from=path[index],to=path[index+1],t=(now-start)/plan.duration,profile=profiles[index];
    const flight=plan.isJump?Math.max(0,Math.min(1,(t-.38)/.44)):t;
    const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
    const progress=plan.isJump?(t<.14?plan.takeoff*smooth(t/.14):t<.38?plan.takeoff:t<.82?plan.takeoff+(plan.landing-plan.takeoff)*smooth(flight):plan.landing+(1-plan.landing)*smooth((t-.82)/.18)):0;
    const jumpPoint=plan.isJump?sampleMovementProgress(plan,progress):null;
    const motion={pose:plan.isJump?worldPoint(jumpPoint.x,jumpPoint.y,jumpPoint.z):plan.stretch?shapePomReach(from,to,flight,profile):jumpPose(from,to,flight,profile),umbrella:plan.isFall&&flight>.08&&flight<.96,flight};
    if(plan.isJump&&!reducedSelectionMotion.matches){
      const windup=t<.38?smooth((t-.12)/.16):Math.max(0,1-flight/.12);
      const launch=flight>0&&flight<.22?Math.sin(Math.PI*flight/.22):0;
      const landing=t>=.82?Math.sin(Math.PI*(t-.82)/.18):0;
      const squash=.16*windup+.14*landing-.13*launch;
      playerObject.scale3D=vec3(.72*(1+squash),.56*(1-squash),.018);
      motion.pose=motion.pose.add(vec3(0,stretchY(-.2*squash),0));
      const effort=Math.min(1,windup+Math.sin(Math.PI*flight)*.8);
      for(const {white,black} of pomEyes){white.scale3D=vec3(.22,.28*(1-.65*effort),1);black.scale3D=vec3(.12,.154*(1-.65*effort),1)}
      for(let i=0;i<sweatDrops.length;i++){const drop=sweatDrops[i],q=Math.max(0,Math.min(1,(t-.18-i*.08)/.55)),alpha=Math.sin(Math.PI*q)*.9;drop.outline.pos3D=vec3(.48+i*.17+q*.16,.65-i*.2-q*.12,2.8);drop.outline.color=new Color(.157,.145,.122,alpha);drop.fill.color=new Color(.64,.83,.97,alpha)}
    }
    if(falling!==motion.umbrella){falling=motion.umbrella;setUmbrellaVisible(falling)}
    if(winningArrival&&index===plans.length-1){const offset=victoryArrival(t,reducedSelectionMotion.matches);motion.pose=motion.pose.add(vec3(offset.x,stretchY(offset.y),0))}
    playerObject.pos3D=motion.pose.add(render3D.camera.getForward().scale(-.045));if(falling)positionUmbrella(motion.flight);
    syncPuzzleProjection();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function pointOnFloor(ray){if(Math.abs(ray.direction.y)<1e-6)return null;const t=(0-ray.origin.y)/ray.direction.y;if(t<0)return null;return logicalPuzzlePoint(ray.getPosition(t))}
function nearbyMovementTarget(point,{topsOnly=false,floorsOnly=false}={}){
  const size=vec2(wrap.clientWidth,wrap.clientHeight),objects=[...blockObjects,...topPickObjects,...extrusionOutlines];
  const margin=floorsOnly?18:12;
  const candidates=standableReachable().filter(node=>(!topsOnly||node.y<H)&&(!floorsOnly||node.y===H)).map(node=>{
    const floor=node.y===H,y=floor?0:H-node.y;
    const polygon=[[node.x,node.z],[node.x+1,node.z],[node.x+1,node.z+1],[node.x,node.z+1]].map(([x,z])=>{
      const projected=puzzlePoint(worldPoint(x,y,z));
      return render3D.worldToScreen(projected,size);
    });
    return {node,polygon};
  });
  if(!nearestMovementTarget(point,candidates,{margin}))return null;
  return puzzlePick(objects,()=>nearestMovementTarget(point,candidates,{margin,visible:({node},sample)=>{
    const ray=render3D.screenToRay(vec2(sample.x,sample.y),size),hit=engineObjectsRaycast3D(ray,objects)[0];
    if(node.y===H)return !hit;
    const top=topObjectInfo.get(hit);
    return !!top&&top.x===node.x&&top.y===node.y&&top.z===node.z;
  }}));
}
function standableAt(ray,point){
  const nearbyTop=nearbyMovementTarget(point,{topsOnly:true});if(nearbyTop)return nearbyTop;
  if(puzzleProjectionState().enabled){
    const hit=puzzleRaycast(ray,[...blockObjects,...topPickObjects,...extrusionOutlines])[0];
    if(hit){const top=topObjectInfo.get(hit);return top?reachableTop(top):null}
  }else{
    const logical=boardRay(ray);let best=null,bestD=Infinity;
    if(Math.abs(logical.direction.y)>1e-6)for(const p of standableReachable().filter(p=>p.y<H)){
      const h=H-p.y,z=p.z+.5,x=p.x+.5+depthSkew()*(p.z+.5),t=(h-logical.origin.y)/logical.direction.y;
      if(t<0)continue;const q=logical.getPosition(t),d=Math.hypot(q.x-x,q.z-z);if(d<bestD&&d<.72){best=p;bestD=d}
    }
    if(best)return best;
  }
  const nearby=nearbyMovementTarget(point,{floorsOnly:true});if(nearby)return nearby;
  const floor=pointOnFloor(ray);if(floor){const p=standableReachable().filter(n=>n.y===H).sort((a,b)=>{const pa=worldPosition(a,.5),pb=worldPosition(b,.5);return Math.hypot(pa.x-floor.x,pa.z-floor.z)-Math.hypot(pb.x-floor.x,pb.z-floor.z)})[0];if(p){const q=worldPosition(p,.5);if(Math.hypot(q.x-floor.x,q.z-floor.z)<.9)return p}}
  return null;
}
function updateHover(e){if(!hoverObject)return;if(introPlaying){clearBoardHover();return}const point=boardPoint(e),ray=render3D.screenToRay(vec2(point.x,point.y),vec2(wrap.clientWidth,wrap.clientHeight)),p=standableAt(ray,point);hovered=p;if(!p||(movementMarkersEnabled()&&p.y<H)){hoverObject.color=new Color(1,1,1,0);return}hoverObject.pos3D=standingSpotCenter(p);hoverObject.color=new Color(1,1,1,.33)}
function clickBoard(e){if(levelLoading||busy||won)return;enterPlayFromIntro();const point=boardPoint(e),ray=render3D.screenToRay(vec2(point.x,point.y),vec2(wrap.clientWidth,wrap.clientHeight));
  const stud=pickMovementMarker(ray);if(stud){moveTo(stud,true);return}
  // A reachable top wins over the front or side of a piece within the touch margin.
  const nearbyTop=nearbyMovementTarget(point,{topsOnly:true});if(nearbyTop){moveTo(nearbyTop,movementMarkersEnabled());return}
  // Resolve visible, walkable cube tops before wall faces. The wall can be
  // nearer along the ray even when the pointer is visually on a platform top.
  if(!puzzleProjectionState().enabled){
  const logicalRay=boardRay(ray);let best=null,bestD=Infinity;for(const p of standableReachable().filter(p=>p.y<H)){const h=H-p.y,z=p.z+.5,x=p.x+.5+depthSkew()*(p.z+.5);if(Math.abs(logicalRay.direction.y)<1e-6)continue;const t=(h-logicalRay.origin.y)/logicalRay.direction.y;if(t<0)continue;const q=logicalRay.getPosition(t),d=Math.hypot(q.x-x,q.z-z);if(d<bestD&&d<.72){best=p;bestD=d}}if(best){moveTo(best);return}
  }
  const hits=puzzleRaycast(ray,[...blockObjects,...topPickObjects,...extrusionOutlines]),hit=hits.find(o=>blockObjects.includes(o)||topObjectInfo.has(o)||sideObjectInfo.has(o));if(hit){const top=topObjectInfo.get(hit);if(top){moveTo(walkabilityFacesEnabled()?top:reachableTop(top));return}const g=sideObjectInfo.get(hit)||groups.find(g=>g.objects.includes(hit));if(g){if(canInteract(g)){hideHelp();selected=g;updateUI()}else showHelp('Pom cannot push or pull this piece from here. Move him beside an exposed edge.','wall');return}}
  const nearby=nearbyMovementTarget(point,{floorsOnly:true});if(nearby){moveTo(nearby);return}
  // Match a visible point on the floor plane to the nearest reachable step.
  const floor=pointOnFloor(ray);if(floor){const candidates=standableReachable().filter(p=>p.y===H);const p=candidates.sort((a,b)=>{const pa=worldPosition(a,.5),pb=worldPosition(b,.5);return Math.hypot(pa.x-floor.x,pa.z-floor.z)-Math.hypot(pb.x-floor.x,pb.z-floor.z)})[0];if(p){const q=worldPosition(p,.5);if(Math.hypot(q.x-floor.x,q.z-floor.z)<1.15){moveTo(p);return}}
    const x=floor.x-depthSkew()*floor.z;
    if(x>=-1&&x<W+1&&floor.z>=0&&floor.z<GRID_DEPTH&&Math.hypot(worldPosition(player).x-floor.x,worldPosition(player).z-floor.z)>.72)showHelp('That spot is out of reach. Push or pull the blocks to make a path.','unreachable');
  }
}
function manipulate(dir){if(levelLoading||busy||won||!gameReady||!viewReady)return;enterPlayFromIntro();const g=selected;if(!g||!canReach(g))return;const next=g.depth+dir;if(next<0||next>3)return;const dest={...player,z:player.z+dir};if(!safeManipulation(g,next,dir))return;hideHelp();save();resumeStudyFollow();g.depth=next;player=dest;autoSelectNearbyPiece();animateEffort();saveUnfinished();updateUI()}
function restore(s){movementMarkerRoute=null;movementMarkerRouteTargets=null;movementMarkerRouteIndex=0;hideHelp();celebration=null;resumeStudyFollow();groups.forEach((g,i)=>g.depth=s.depths[i]);player={...s.player};selected=groups.find(g=>g.id===s.selected)||null;won=s.won;autoSelectNearbyPiece();saveUnfinished();applyBoardView();updateUI()}
wrap.addEventListener('pointerdown',boardDown);wrap.addEventListener('pointermove',boardMove);wrap.addEventListener('pointerup',e=>boardUp(e));wrap.addEventListener('pointercancel',e=>boardUp(e,true));wrap.addEventListener('lostpointercapture',e=>{if(!pieceDrag.pointerUp(e))boardUp(e,true)});wrap.addEventListener('pointerleave',()=>{if(!boardPointers.size)clearBoardHover()});
const safariZoom=installSafariZoom(wrap,{
  enabled:()=>!viewportUI.pageZoomed&&!levelLoading&&!won&&viewReady&&!pieceDrag.active&&boardPointers.size<2&&document.querySelector('#menuScreen').hidden,
  onStart(){enterPlayFromIntro();viewTouched=true;if(boardGesture)boardGesture.multi=true;clearBoardHover()},
  onZoom(ratio,x,y){zoomBoard(viewUnit*ratio,x,y);applyBoardView();resetStudyFollow()},
});
wrap.addEventListener('wheel',e=>{if(safariZoom.active){e.preventDefault();return}if(viewportUI.pageZoomed&&e.ctrlKey)return;if(pieceDrag.active){e.preventDefault();return}if(levelLoading||won||!viewReady)return;e.preventDefault();enterPlayFromIntro();stopIntro();viewTouched=true;const p=boardPoint(e);zoomBoard(viewUnit*Math.exp(-e.deltaY*(e.ctrlKey?.01:.002)),p.x,p.y);clearBoardHover();applyBoardView();resetStudyFollow()},{passive:false});
// Overlay controls must never select or move a ground spot underneath them.
const gameActions=document.querySelector('#gameActions');for(const event of ['pointerdown','pointermove','pointerup','click'])gameActions.addEventListener(event,e=>e.stopPropagation());gameActions.addEventListener('pointerenter',clearBoardHover);

const studioControls=document.querySelector('#studioControls'),movementCase=document.querySelector('#movementCase');for(const example of movementExamples){const option=document.createElement('option');option.value=example.id;option.textContent=example.label;movementCase.append(option)}movementCase.onchange=()=>{if(!busy)resetLevelState(studioLevel(levels,movementExamples.find(example=>example.id===movementCase.value)))};
const previewClimb=document.querySelector('#previewClimb');for(const event of ['pointerdown','pointerup','pointermove'])studioControls.addEventListener(event,e=>e.stopPropagation());previewClimb.onclick=()=>{if(busy||!activeLevel.previewMove)return;resetLevelState(activeLevel);moveTo(activeLevel.previewMove)};

// A temporary lab reuses catalog geometry without changing IDs or saved puzzles.
let interactionCase,interactionLevel;
function openInteractionCase(){
  if(busy||pieceDrag.active)return;
  const source=levels.find(level=>level.id===interactionLevel?.value)??levels.find(level=>level.legacyId===1);
  if(source.legacyId===1&&interactionCase?.value==='choices'){
    startLevel(source.id);resetLevelState({...source,name:'Two movable pieces',width:4,height:2,grid:['RRGG','RRGG'],start:{x:1,y:2,z:0},goal:{x:3,y:0},initialDepths:[0,1]});return;
  }
  if(source.legacyId===1&&interactionCase?.value==='three'){
    startLevel(source.id);resetLevelState({...source,name:'Three movable pieces',width:3,height:2,grid:['RGB','RGB'],start:{x:1,y:2,z:0},goal:{x:1,y:0},initialDepths:[1,0,1]});return;
  }
  if(source.legacyId===1&&interactionCase?.value==='overlap'){
    startLevel(source.id);resetLevelState({...source,name:'Overlapping pieces',width:6,height:5,grid:['RRRRRR','RGGGGR','RGGGGR','RRGGRR','RRRRRR'],start:{x:2,y:5,z:0},goal:{x:0,y:0},initialDepths:[0,2]});return;
  }
  const depth=source.legacyId===1?Number(interactionCase?.value??0):0;
  startLevel(source.id);
  if(depth){const level={...source,start:{...source.start,z:source.start.z+depth},initialDepths:groups.map(()=>depth)};resetLevelState(level)}
}
if(interactionLab){
  const panel=document.createElement('div');panel.className='interaction-lab';panel.setAttribute('aria-label','Interaction Lab');
  const title=document.createElement('strong');title.textContent='Interaction Lab';
  interactionLevel=document.createElement('select');interactionLevel.setAttribute('aria-label','Interaction lab level');
  for(const level of levels.filter(level=>level.compatibility.playable))interactionLevel.add(new Option(`${level.number} · ${level.name}`,level.id));
  interactionLevel.onchange=()=>{interactionCase.value='0';openInteractionCase()};
  interactionCase=document.createElement('select');interactionCase.setAttribute('aria-label','Interaction test case');
  for(const [value,label] of [['0','Fully in · pull only'],['1','One step out · push and pull'],['3','Fully out · push only'],['choices','Two movable pieces'],['three','Three movable pieces'],['overlap','Overlapping pieces']])interactionCase.add(new Option(label,value));
  interactionCase.onchange=openInteractionCase;
  const compare=document.createElement('select');compare.setAttribute('aria-label','Interaction style');
  for(const [value,label] of [['arrows','Drag arrows'],['stacked','Piece dock'],['classic','Selected piece only']])compare.add(new Option(label,value));
  compare.value=controlFeatures.enabled('stackedPieceButtons')?'stacked':controlFeatures.enabled('pieceDragArrows')?'arrows':'classic';
  compare.onchange=()=>{controlFeatures.set('pieceDragArrows',compare.value==='arrows');controlFeatures.set('stackedPieceButtons',compare.value==='stacked');syncControlFeatureInputs();refreshControlFeatures()};
  const reset=document.createElement('button');reset.className='btn';reset.textContent='Reset level';reset.onclick=openInteractionCase;
  const arrowsMode=document.createElement('select');arrowsMode.setAttribute('aria-label','Arrow display mode');
  arrowsMode.add(new Option('Selected piece','selected'));arrowsMode.add(new Option('All movable pieces','all'));
  arrowsMode.onchange=()=>{controlFeatures.set('allPieceDragArrows',arrowsMode.value==='all');syncControlFeatureInputs();updateUI()};
  panel.append(title,interactionLevel,interactionCase,arrowsMode,compare,reset);document.querySelector('.stage').append(panel);
}else if(!isMakerPlaytest){
  document.querySelector('#interactionLabLink').hidden=false;
}

// A pointer gesture stops the opening camera motion even on a disabled action.
document.querySelector('#pieceDock').addEventListener('pointerdown',()=>{if(!levelLoading&&gameReady&&viewReady)enterPlayFromIntro()},{capture:true});
document.querySelector('#pull').onclick=()=>manipulate(1);document.querySelector('#push').onclick=()=>manipulate(-1);
document.querySelector('#undo').onclick=()=>{if(!busy&&history.length)restore(history.pop())};document.querySelector('#reset').onclick=()=>{if(busy)return;hideHelp();celebration=null;groups.forEach((g,i)=>g.depth=activeLevel.initialDepths?.[i]??0);clearMovementRoutes();player={x:activeLevel.start.x,y:activeLevel.start.y??H,z:activeLevel.start.z};selected=null;history=[];won=false;if(canSaveUnfinished())unfinished.remove(activeLevel.id);autoSelectNearbyPiece();positionCameraForView(viewSide);render3D.camera.orthographic=baseCameraHeight;render3D.updateMatrices(wrap.clientWidth/wrap.clientHeight);syncBackground();updateUI();startBoardView()};
window.addEventListener('keydown',e=>{
  if(document.querySelector('.stage').inert||busy||won||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(['z','Z','r','R'].includes(e.key))enterPlayFromIntro();
  if(e.key.toLowerCase()==='z'){if(history.length)restore(history.pop())}if(e.key.toLowerCase()==='r')document.querySelector('#reset').click()
});
setCanvasPixelRatio(Math.min(window.devicePixelRatio||1,2));
glSetAntialias(true);
setLoadingScreen(undefined);
// Project DOM handles once per rendered frame, after fixed updates and camera
// follow/visibility changes. Never use a matrix left by a previous render pass.
function renderPieceControls(){
  if(!gameReady||!viewReady)return;
  render3D.updateMatrices(wrap.clientWidth/wrap.clientHeight);
  pieceDrag.sync();

}
const viewportUI=installViewportSafety(document.querySelector('.app'),wrap,window.visualViewport);
let engineStart;
async function startGameEngine(){
  if(gameReady)return true;
  if(engineStart)return false;
  // Show the existing level loader while the first engine initialization runs.
  document.querySelector('#menuScreen').hidden=true;
  document.querySelector('.stage').inert=false;
  syncScreenAppearance('game');
  levelLoadingPanel.hidden=false;levelLoadingRetry.hidden=true;
  levelLoadingMessage.textContent='Loading puzzle…';
  try{
    engineStart=engineInit(gameInit,gameUpdate,undefined,undefined,renderPieceControls,[],wrap);
    await engineStart;
    return gameReady;
  }catch(error){
    console.error('Unable to start the game',error);
    levelLoadingMessage.textContent='The game could not start. Please reload and try again.';
    return false;
  }
}
if(isMakerPlaytest||interactionLab||cameraLab||warpPipePreview||pageUrl.searchParams.has('background-studio')||pageUrl.searchParams.has('environment-studio')){
  await startGameEngine();
  if(warpPipePreview)await startLevel('builtin-008');
}else{
  catalogScreens?.ready();
  myPuzzles.openPending();
}

new ResizeObserver(()=>{
  const r={width:wrap.clientWidth,height:wrap.clientHeight};setCanvasFixedSize(vec2(Math.max(1,r.width),Math.max(1,r.height)));if(!backgroundObjects.length)return;
  if(levelLoading||r.width===viewWidth&&r.height===viewHeight)return;
  const mobile=mobileBoard(),changedMode=mobile!==viewMobile;viewWidth=r.width;viewHeight=r.height;baseCameraHeight=fitCamera(r.width,r.height);
  if(celebration){render3D.updateMatrices(r.width/r.height);return}
  if(changedMode||introPlaying){startBoardView();return}
  if(!viewTouched&&followAnchor?.paused&&activeLevel.kind==='puzzle'&&!cameraLab){startBoardView(false);return}
  stopIntro();if(!mobile&&!viewTouched){viewUnit=r.height/baseCameraHeight;viewTarget=sceneFrame(r.width,r.height).target}applyBoardView();
}).observe(wrap);
