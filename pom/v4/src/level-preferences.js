const STORAGE_KEY='little-ledges:v4:level-preferences';
const DEFAULTS={hideKnownIssues:true,hideHelpText:false};

export function createLevelPreferences(){
  function read(){
    try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return Object.fromEntries(Object.entries(DEFAULTS).map(([name,fallback])=>[name,typeof saved?.[name]==='boolean'?saved[name]:fallback]))}
    catch{return null}
  }
  let value=read()||{...DEFAULTS};
  return{
    key:STORAGE_KEY,
    get hideKnownIssues(){return value.hideKnownIssues},
    get hideHelpText(){return value.hideHelpText},
    reload(){value=read()||{...DEFAULTS}},
    set(name,checked){
      if(!Object.hasOwn(DEFAULTS,name)||typeof checked!=='boolean')return false;
      value={...(read()||value),[name]:checked};
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));return true}catch{return false}
    },
  };
}
