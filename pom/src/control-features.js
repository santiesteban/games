import { DEFAULT_DESIGN } from './design-style.js';

export const CONTROL_FEATURES=[
  {id:'selectionLightbox',defaultEnabled:true,label:'Pulsing piece highlight',description:'Use an inward light-box pulse. Turn off for the classic outline and tint.'},
  {id:'movementStuds',defaultEnabled:DEFAULT_DESIGN.studs.enabled,label:'Reachable platform studs',description:'Show small raised bumps on platforms Pom can reach. Tap a bump to press it down and move there.'},
  {id:'autoSelectPieces',defaultEnabled:true,label:'Automatically select nearby pieces',description:'After Pom moves, select a piece he can push or pull: behind him first, then right, then left.'},
  {id:'pullDepthColors',defaultEnabled:false,label:'Color top faces by pull distance',description:'Green at the front, yellow on the second row, and red on the third, with gentle gradients and subtle square grid lines on the tops and sides.'},
  {id:'walkabilityTopFaces',defaultEnabled:false,label:'Walkability grid on top faces',description:'Grid squares mark platforms Pom can reach; diagonal lines mark platforms that are out of reach.'},
  {id:'pieceShadows',defaultEnabled:DEFAULT_DESIGN.shadows.enabled,label:'Cast shadows',description:'Pieces and Pom cast shadows from a light at the top right. Unshadowed colors stay unchanged.'},
  {id:'floorGrid',defaultEnabled:DEFAULT_DESIGN.floorGrid.enabled,label:'Custom floor grid',description:'Customize the existing flat floor in Design Playground: walkable fill, foreground wash, and grid-line color, opacity, and width.'},
];
export const TOP_FACE_STYLES=[['checkerboard','Checkerboard'],['pull-depth','Pull-distance colors'],['walkability','Walkability grid']];
const STORAGE_KEY='little-ledges:v4:control-features';

export function createControlFeatures({persistent=true}={}){
  const defaults=Object.fromEntries(CONTROL_FEATURES.map(feature=>[feature.id,feature.defaultEnabled===true]));
  function read(){
    if(!persistent)return {...defaults};
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'),flags=saved?.version===2?saved.flags:saved;
      return Object.fromEntries(CONTROL_FEATURES.map(feature=>{
        // Adopt the approved visual design once; retain unrelated control preferences.
        const adoptDesign=saved?.version!==2&&['movementStuds','pullDepthColors','pieceShadows'].includes(feature.id);
        const adoptFloor=feature.id==='floorGrid'&&saved?.floorGridRevision===undefined;
        return[feature.id,!adoptDesign&&!adoptFloor&&typeof flags?.[feature.id]==='boolean'?flags[feature.id]:defaults[feature.id]];
      }));
    }catch{return null}
  }
  let value=read()??{...defaults};
  function persist(){if(persistent)localStorage.setItem(STORAGE_KEY,JSON.stringify({version:2,floorGridRevision:DEFAULT_DESIGN.floorGrid.revision,flags:value}))}
  try{persist()}catch{}
  return{
    key:STORAGE_KEY,
    get topFaceStyle(){return value.walkabilityTopFaces?'walkability':value.pullDepthColors?'pull-depth':'checkerboard'},
    setTopFaceStyle(style){
      if(!TOP_FACE_STYLES.some(([id])=>id===style))return false;
      value={...(read()??value),pullDepthColors:style==='pull-depth',walkabilityTopFaces:style==='walkability'};
      try{persist();return true}catch{return false}
    },
    enabled(name){return value[name]===true},
    reload(){value=read()??{...defaults}},
    set(name,enabled){
      if(!Object.hasOwn(defaults,name)||typeof enabled!=='boolean')return false;
      value={...(read()??value),[name]:enabled};
      try{persist();return true}catch{return false}
    },
  };
}
