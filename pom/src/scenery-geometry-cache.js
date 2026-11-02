// Retain every variant used by the current scene, independent of placement
// order. Prune only after rebuilding: an eager size cap can discard geometry
// still referenced by another card and thrash on every camera update.
export function createSceneryGeometryCache(dispose){
  const assets=new Map();
  let used=new Set();
  return {
    begin(){used=new Set()},
    get(asset,key,create){
      let variants=assets.get(asset);
      if(!variants){variants=new Map();assets.set(asset,variants)}
      if(!variants.has(key))variants.set(key,create());
      const value=variants.get(key);used.add(value);return value;
    },
    end(){
      for(const [asset,variants] of assets){
        for(const [key,value] of variants)if(!used.has(value)){dispose(value);variants.delete(key)}
        if(!variants.size)assets.delete(asset);
      }
    },
    clear(){for(const variants of assets.values())for(const value of variants.values())dispose(value);assets.clear();used.clear()},
  };
}
