import { environmentCacheKey } from './environment-layout.js';

function decodeImage(url){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=async()=>{try{await image.decode();resolve(image)}catch(error){reject(error)}};
    image.onerror=()=>reject(new Error('The scenery images could not be loaded.'));image.src=url;
  });
}

export function createEnvironmentTextureLoader(defaultId,defaultTextures,{createTexture,loadImage=decodeImage}){
  const cache=new Map(defaultTextures?.length?[[defaultId,{textures:defaultTextures}]]:[]);
  return{
    cached(environment){return cache.get(environmentCacheKey(environment))?.textures},
    load(environment){
      const key=environmentCacheKey(environment),cached=cache.get(key);
      if(cached?.textures)return Promise.resolve(cached.textures);
      if(cached?.promise)return cached.promise;
      const record={};cache.set(key,record);
      record.promise=Promise.all([loadImage(environment.background),loadImage(environment.foreground)]).then(images=>{
        if(images.some((image,index)=>{
          const size=index===0?environment.backgroundSize:environment.foregroundSize;
          return image.width!==(size?.[0]??environment.width)||image.height!==(size?.[1]??environment.height);
        }))throw new Error('The scenery layers have unexpected dimensions.');
        // Publish one complete pair only after both layers have decoded and
        // passed validation. The caller guards display changes by request ID.
        record.textures=images.map(createTexture);return record.textures;
      }).catch(error=>{cache.delete(key);throw error});
      return record.promise;
    },
  };
}
