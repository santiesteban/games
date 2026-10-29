export const SCENERY_ROLES=['tree-a','tree-b','shrub-a','shrub-b','grass-a','grass-b','flowers-a','flowers-b','hanging-cloud-a','hanging-cloud-b','low-fog-a','low-fog-b','round-daisy-patch','large-arching-cloud'];
export const defaultSceneryLayout=()=>SCENERY_ROLES.filter(role=>!['round-daisy-patch','large-arching-cloud'].includes(role)).map(role=>({id:role,role,x:0,y:0,z:0,scale:1,tilt:0}));
export function normalizeSceneryLayout(input){
  if(!Array.isArray(input))return defaultSceneryLayout();
  const ids=new Set(),number=(v,lo,hi,fallback)=>Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):fallback;
  return input.slice(0,48).filter(e=>e&&SCENERY_ROLES.includes(e.role)&&typeof e.id==='string'&&!ids.has(e.id)&&ids.add(e.id)).map(e=>({id:e.id,role:e.role,x:number(e.x,-40,40,0),y:number(e.y,-10,30,0),z:number(e.z,-20,20,0),scale:number(e.scale,.1,4,1),tilt:number(e.tilt,-80,80,0),...(e.cutout&&typeof e.cutout==='object'?{cutout:cutoutMaterial(e.role,{},e.cutout)}:{})}));
}

export function cutoutMaterial(role,shared={},override){
 const scenic=role==='large-arching-cloud'||role.startsWith('hanging-cloud')||role.startsWith('low-fog');
 const defaults={padding:0,paddingColor:'#fffaf0',depth:scenic?0:.08,depthColor:'#6e593d'};
 const value={...defaults,...(scenic?{}:shared),...override};
 return {padding:Math.max(0,Math.min(.5,Number(value.padding)||0)),depth:Math.max(0,Math.min(.5,Number(value.depth)||0)),paddingColor:/^#[0-9a-f]{6}$/i.test(value.paddingColor)?value.paddingColor:defaults.paddingColor,...(value.support===true?{support:true}:{}),depthColor:/^#[0-9a-f]{6}$/i.test(value.depthColor)?value.depthColor:defaults.depthColor};
}
