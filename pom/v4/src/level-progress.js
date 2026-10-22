const STORAGE_KEY='little-ledges:v4:completed-levels';

export function createLevelProgress(levelIds){
  const valid=new Set(levelIds);
  let completed=new Set;
  function read(){
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    return new Set(Array.isArray(saved)?saved.filter(id=>valid.has(id)):[]);
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
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...completed].sort((a,b)=>a-b)));return true}catch{return false}
    },
    clear(){
      try{localStorage.removeItem(STORAGE_KEY)}catch{return false}
      completed.clear();return true;
    },
  };
}
