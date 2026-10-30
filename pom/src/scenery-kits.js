import {TextureInfo,glContext} from 'littlejsengine';
import {createScenerySelectionCache} from './scenery-assets.js';
import daisyMetadata from './assets/scenery-kits/daisy-meadow/metadata.json';
import meadowMetadata from './assets/scenery-kits/meadow/metadata.json';
import japanMetadata from './assets/scenery-kits/japan-spring/metadata.json';

const urls=import.meta.glob('./assets/scenery-kits/*/*.webp',{eager:true,query:'?url',import:'default'});
const metadata={'daisy-meadow':daisyMetadata,'meadow':meadowMetadata,'japan-spring':japanMetadata};
export const hasSceneryKit=id=>!!metadata[id];
function decode(url){return new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>image.decode().then(()=>resolve(image),reject);
  image.onerror=()=>reject(new Error('An image in the scenery kit could not be loaded.'));image.src=url;
})}
function canvasAt(image,max){
  const scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
  canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas;
}
export function createSceneryKitLoader(){
  return createScenerySelectionCache(metadata,async(id,meta)=>{
      const name=meta.file.replace(/\.png$/,''),url=urls[`./assets/scenery-kits/${id}/${meta.webp}`];
      if(!url)throw new Error(`Missing scenery image: ${name}`);
      const image=await decode(url);
      if(image.width!==meta.width||image.height!==meta.height)throw new Error(`Unexpected scenery dimensions: ${name}`);
      // Keep originals intact on disk. Limit GPU uploads for phone validation:
      // sky/ground 2048, tree cards 1024, smaller cutouts 512.
      const maximum=name==='sky'||name==='ground-tile'||name==='distant-hills'||name==='static-background'||name==='flat-background'?2048:name==='round-daisy-patch'||name==='large-arching-cloud'||name.startsWith('tree-')||name.startsWith('hanging-cloud-')||name.startsWith('low-fog-')?1024:512;
      const canvas=canvasAt(image,maximum),wrap=meta.tileAxes.length?(name==='ground-tile'?true:[glContext.REPEAT,glContext.CLAMP_TO_EDGE]):false;
      const texture=new TextureInfo(canvas,true,wrap,false);
      let mask;
      if(meta.pivotPixels||meta.originPixels){
        const source=canvasAt(canvas,name.startsWith('tree-')||name==='round-daisy-patch'||name==='large-arching-cloud'?1024:512),context=source.getContext('2d',{willReadFrequently:true});
        mask={width:source.width,height:source.height,rgba:context.getImageData(0,0,source.width,source.height).data};
      }
      return {meta,texture,mask,uploadWidth:canvas.width,uploadHeight:canvas.height};
  });
}
