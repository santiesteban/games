// All dimensions are camera-plane units. The image scale depends on the visible
// canvas and horizon, never the board's fitted height or zoom baseline.
export function environmentFrame(environment,{ortho,worldWidth,groundQ}){
  const anchor=environment.groundAnchorY,aspect=environment.aspectRatio??environment.width/environment.height;
  const foregroundHeight=Math.max(ortho,worldWidth/aspect,(ortho/2+groundQ)/(1-anchor),environment.registeredLayers?(ortho/2-groundQ)/anchor:0);
  const foregroundY=groundQ+(anchor-.5)*foregroundHeight;
  const backgroundHeight=environment.registeredLayers?foregroundHeight:Math.max(ortho,worldWidth/aspect);
  return{foregroundHeight,foregroundY,backgroundHeight,backgroundY:environment.registeredLayers?foregroundY:0};
}

export function environmentCacheKey(environment){return environment.variant?`${environment.id}:${environment.variant}`:environment.id}

export function environmentComposition(environment,variant){
  const art=environment.variants?.[variant];
  if(!art)return environment;
  // Do not inherit legacy size exceptions or its anchor into a new composition.
  return{...environment,backgroundSize:undefined,foregroundSize:undefined,...art,aspectRatio:art.width/art.height,variant};
}

// Compare cropped image area after satisfying the ground anchor, not simply the
// device orientation. A 15% improvement is needed to leave the current version.
export function selectEnvironmentComposition(environment,{width,height,groundFraction=.75,previous,preferred='auto'}){
  if(!environment.variants||preferred==='legacy')return environment;
  if(environment.variants[preferred])return environmentComposition(environment,preferred);
  const ratio=Math.max(1,width)/Math.max(1,height),groundQ=.5-groundFraction;
  const candidates=Object.keys(environment.variants).map(variant=>{
    const composition=environmentComposition(environment,variant);
    const frame=environmentFrame(composition,{ortho:1,worldWidth:ratio,groundQ});
    return{composition,area:frame.backgroundHeight**2*composition.aspectRatio};
  }).sort((a,b)=>a.area-b.area);
  const current=candidates.find(candidate=>candidate.composition.variant===previous),best=candidates[0];
  return(current&&best.area>=current.area*.85?current:best)?.composition??environment;
}
