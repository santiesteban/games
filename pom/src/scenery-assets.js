import {defaultSceneryLayout} from './scenery-layout.js';
const planted=new Set(['tree-a','tree-b','shrub-a','shrub-b','grass-a','grass-b','flowers-a','flowers-b','round-daisy-patch']);
const atmosphere=new Set(['hanging-cloud-a','hanging-cloud-b','low-fog-a','low-fog-b','large-arching-cloud']);
export function requiredSceneryAssets(metadata,state={}){
  const available=new Set(metadata.assets.map(a=>a.file.replace(/\.png$/,''))),names=new Set;
  if(state.background!==false){
    if(available.has('flat-background'))names.add('flat-background');
    else if(available.has('static-background'))names.add('static-background');
    else{names.add('sky');names.add('distant-hills')}
  }
  if(state.foreground!==false)names.add('ground-tile');
  if(state.props!==false){
    const daisy=state.environment==='daisy-meadow',layout=daisy?(state.sceneryLayout??defaultSceneryLayout()):defaultSceneryLayout();
    for(const item of layout)if(planted.has(item.role)||(daisy&&state.scenicAtmosphere&&atmosphere.has(item.role)))names.add(item.role);
  }
  return metadata.assets.filter(a=>names.has(a.file.replace(/\.png$/,'')));
}

// Cache individual images across layout selections. A new Studio element loads
// just its missing image, and a failed selection cannot discard shared textures.
export function createScenerySelectionCache(metadata,loadAsset){
  const images=new Map,selections=new Map;
  function load(id,{state={},retry=false}={}){
    const entries=requiredSceneryAssets(metadata[id],{...state,environment:id});
    const key=JSON.stringify([id,entries.map(a=>a.webp)]);
    if(retry&&selections.get(key)?.status==='error')selections.delete(key);
    if(selections.has(key))return selections.get(key);
    const record={status:'loading',assets:null,error:null};selections.set(key,record);
    const get=meta=>{
      const imageKey=JSON.stringify([id,meta.webp]);
      if(!images.has(imageKey)){
        const promise=Promise.resolve().then(()=>loadAsset(id,meta));images.set(imageKey,promise);
        promise.catch(()=>{if(images.get(imageKey)===promise)images.delete(imageKey)});
      }
      return images.get(imageKey);
    };
    record.promise=Promise.allSettled(entries.map(meta=>get(meta).then(asset=>[meta.file.replace(/\.png$/,''),asset]))).then(results=>{
      const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
      record.assets=Object.fromEntries(results.map(r=>r.value));record.status='ready';return record.assets;
    }).catch(error=>{record.error=error;record.status='error';return null});
    return record;
  }
  return{load};
}
