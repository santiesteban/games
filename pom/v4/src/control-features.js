import { DEFAULT_DESIGN } from './design-style.js';

export const CONTROL_FEATURES=[
  {id:'movementStuds',defaultEnabled:DEFAULT_DESIGN.studs.enabled,label:'Reachable platform studs',description:'Show small raised bumps on platforms Pom can reach. Tap a bump to press it down and move there.'},
  {id:'autoSelectPieces',label:'Automatically select nearby pieces',description:'After Pom moves, select a piece he can push or pull: behind him first, then right, then left.'},
  {id:'pullDepthColors',defaultEnabled:true,label:'Color top faces by pull distance',description:'Green at the front, yellow on the second row, and red on the third, with gentle gradients and subtle square grid lines on the tops and sides.'},
  {id:'pieceShadows',defaultEnabled:DEFAULT_DESIGN.shadows.enabled,label:'Cast shadows',description:'Pieces and Pom cast shadows from a light at the top right. Unshadowed colors stay unchanged.'},
];
const STORAGE_KEY='little-ledges:v4:control-features';

export function createControlFeatures(){
  const defaults=Object.fromEntries(CONTROL_FEATURES.map(feature=>[feature.id,feature.defaultEnabled===true]));
  function read(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'),flags=saved?.version===2?saved.flags:saved;
      return Object.fromEntries(CONTROL_FEATURES.map(feature=>{
        // Adopt the approved visual design once; retain unrelated control preferences.
        const adoptDesign=saved?.version!==2&&['movementStuds','pullDepthColors','pieceShadows'].includes(feature.id);
        return[feature.id,!adoptDesign&&typeof flags?.[feature.id]==='boolean'?flags[feature.id]:defaults[feature.id]];
      }));
    }catch{return null}
  }
  let value=read()??{...defaults};
  function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify({version:2,flags:value}))}
  try{persist()}catch{}
  return{
    key:STORAGE_KEY,
    enabled(name){return value[name]===true},
    reload(){value=read()??{...defaults}},
    set(name,enabled){
      if(!Object.hasOwn(defaults,name)||typeof enabled!=='boolean')return false;
      value={...(read()??value),[name]:enabled};
      try{persist();return true}catch{return false}
    },
  };
}
