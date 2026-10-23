const STORAGE_KEY='little-ledges:v4:completed-levels';

export function createLevelProgress(levels){
  const valid=new Set(levels.map(level=>level.id));
  const legacyIds=new Map(levels.filter(level=>level.legacyId!==undefined).map(level=>[level.legacyId,level.id]));
  let completed=new Set;
  function read(){
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    // Old numeric completions remain readable; new writes always use permanent IDs.
    return new Set(Array.isArray(saved)?saved.map(id=>typeof id==='number'?legacyIds.get(id):id).filter(id=>valid.has(id)):[]);
  }
  function reload(){try{completed=read()}catch{completed=new Set}}
  reload();
  return{
    key:STORAGE_KEY,
    has(id){return completed.has(id)},
    get count(){return completed.size},
    reload,
    complete(id){
      if(!valid.has(id))return false;
      // Merge other tabs' progress before saving this completion.
      try{for(const saved of read())completed.add(saved)}catch{}
      completed.add(id);
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...completed].sort()));return true}catch{return false}
    },
    clear(){
      try{localStorage.removeItem(STORAGE_KEY)}catch{return false}
      completed.clear();return true;
    },
  };
}
