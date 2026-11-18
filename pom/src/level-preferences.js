const STORAGE_KEY='little-ledges:v4:level-preferences';
const DEFAULTS={hideKnownIssues:true,hideHelpText:false,scenario:null};

const valid=(name,value)=>name==='scenario'?value===null||['daisy-meadow','riso-print','dreamscape','grass-clouds'].includes(value):typeof value==='boolean';

export function createLevelPreferences(){
  function read(){
    try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return Object.fromEntries(Object.entries(DEFAULTS).map(([name,fallback])=>[name,valid(name,saved?.[name])?saved[name]:fallback]))}
    catch{return null}
  }
  let value=read()||{...DEFAULTS};
  return{
    key:STORAGE_KEY,
    get hideKnownIssues(){return value.hideKnownIssues},
    get hideHelpText(){return value.hideHelpText},
    get scenario(){return value.scenario},
    reload(){value=read()||{...DEFAULTS}},
    set(name,checked){
      if(!Object.hasOwn(DEFAULTS,name)||!valid(name,checked))return false;
      value={...(read()||value),[name]:checked};
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));return true}catch{return false}
    },
  };
}
