import {adoptStackedInteraction,INTERACTION_REVISION} from './interaction-defaults.js';
import { DEFAULT_DESIGN } from './design-style.js';

export const CONTROL_FEATURES=[
  {id:'stackedPieceButtons',defaultEnabled:true,label:'Piece control dock',description:'Choose a nearby piece using tabs above Push and Pull. Turn off to use only the selected piece.'},
  {id:'pieceDragArrows',defaultEnabled:false,label:'Drag arrows on pieces',description:'Drag an arrow to slide the selected piece with your pointer. Release to snap to a legal step. Turn off to compare with the screen buttons.'},
  {id:'allPieceDragArrows',defaultEnabled:false,label:'Arrows on all movable pieces',description:'With drag arrows enabled, show centered arrows on every piece Pom can move. Turn off to show arrows only on the selected piece.'},
  {id:'selectionLightbox',defaultEnabled:true,label:'Pulsing piece highlight',description:'Pulse the selected piece color. Turn off for the classic outline and tint.'},
  {id:'movementArrow',defaultEnabled:false,label:'Show movement arrow',description:'Show the route arrow while choosing where Pom should move.'},
  {id:'movementStuds',defaultEnabled:DEFAULT_DESIGN.studs.enabled,label:'Reachable platform markers',description:'Show small markers on platforms Pom can reach. Tap a marker to move there.'},
  {id:'autoSelectPieces',defaultEnabled:true,label:'Automatically select nearby pieces',description:'After Pom moves, select a piece he can push or pull: behind him first, then right, then left.'},
  {id:'pullDepthColors',defaultEnabled:false,label:'Color top faces by pull distance',description:'Green at the front, yellow on the second row, and red on the third, with gentle gradients and subtle square grid lines on the tops and sides.'},
  {id:'walkabilityTopFaces',defaultEnabled:false,label:'Walkability grid on top faces',description:'Grid squares mark platforms Pom can reach; diagonal lines mark platforms that are out of reach.'},
  {id:'pieceShadows',defaultEnabled:DEFAULT_DESIGN.shadows.enabled,label:'Cast shadows',description:'Pieces and Pom cast shadows from a light at the top right. Unshadowed colors stay unchanged.'},
  {id:'floorGrid',defaultEnabled:DEFAULT_DESIGN.floorGrid.enabled,label:'Custom floor grid',description:'Customize the existing flat floor in Design Playground: walkable fill, foreground wash, and grid-line color, opacity, and width.'},
];
export const TOP_FACE_STYLES=[['flat','Flat'],['checkerboard','Checkerboard'],['pull-depth','Pull-distance colors'],['walkability','Walkability grid'],['diamond-shapes','Diamond shapes']];
const STORAGE_KEY='little-ledges:v4:control-features';

export function createControlFeatures({persistent=true}={}){
  const defaults={...Object.fromEntries(CONTROL_FEATURES.map(feature=>[feature.id,feature.defaultEnabled===true])),flatTopFaces:true,movementMarkerShape:'diamond'};
  function read(){
    if(!persistent)return {...defaults};
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'),savedFlags=saved?.version===2?saved.flags:saved;
      const flags=adoptStackedInteraction(saved,Object.fromEntries(CONTROL_FEATURES.map(feature=>{
        // Adopt the approved visual design once; retain unrelated control preferences.
        const adoptDesign=saved?.version!==2&&['movementStuds','pullDepthColors','pieceShadows'].includes(feature.id);
        const adoptFloor=feature.id==='floorGrid'&&saved?.floorGridRevision===undefined;
        return[feature.id,!adoptDesign&&!adoptFloor&&typeof savedFlags?.[feature.id]==='boolean'?savedFlags[feature.id]:defaults[feature.id]];
      })));
      flags.flatTopFaces=saved?.version===2&&typeof savedFlags?.flatTopFaces==='boolean'?savedFlags.flatTopFaces:defaults.flatTopFaces;
      flags.movementMarkerShape=saved?.movementMarkerRevision===2&&['diamond','square','circle'].includes(savedFlags?.movementMarkerShape)?savedFlags.movementMarkerShape:defaults.movementMarkerShape;
      return flags;
    }catch{return null}
  }
  let value=read()??{...defaults};
  function persist(){if(persistent)localStorage.setItem(STORAGE_KEY,JSON.stringify({version:2,floorGridRevision:DEFAULT_DESIGN.floorGrid.revision,interactionRevision:INTERACTION_REVISION,movementMarkerRevision:2,flags:value}))}
  try{persist()}catch{}
  return{
    key:STORAGE_KEY,
    get movementMarkerShape(){return value.movementMarkerShape??'diamond'},
    setMovementMarkerShape(shape){
      if(!['diamond','square','circle'].includes(shape))return false;
      value={...(persistent?(read()??value):value),movementMarkerShape:shape};
      try{persist();return true}catch{return false}
    },
    get topFaceStyle(){return value.diamondTopFaces?'diamond-shapes':value.walkabilityTopFaces?'walkability':value.pullDepthColors?'pull-depth':value.flatTopFaces?'flat':'checkerboard'},
    setTopFaceStyle(style){
      if(!TOP_FACE_STYLES.some(([id])=>id===style))return false;
      value={...(persistent?(read()??value):value),pullDepthColors:style==='pull-depth',walkabilityTopFaces:style==='walkability',diamondTopFaces:style==='diamond-shapes',flatTopFaces:style==='flat'};
      try{persist();return true}catch{return false}
    },
    enabled(name){return value[name]===true},
    reload(){if(persistent)value=read()??{...defaults}},
    set(name,enabled){
      if(!Object.hasOwn(defaults,name)||typeof enabled!=='boolean')return false;
      value={...(persistent?(read()??value):value),[name]:enabled};
      try{persist();return true}catch{return false}
    },
  };
}
