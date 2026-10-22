const STORAGE_KEY='little-ledges:v4:level-preferences';

export function createLevelPreferences(){
  function read(){
    try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return{hideKnownIssues:saved?.hideKnownIssues!==false}}
    catch{return null}
  }
  let value=read()||{hideKnownIssues:true};
  return{
    key:STORAGE_KEY,
    get hideKnownIssues(){return value.hideKnownIssues},
    reload(){value=read()||{hideKnownIssues:true}},
    set(name,checked){
      if(name!=='hideKnownIssues')return false;
      value={...(read()||value),[name]:checked};
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));return true}catch{return false}
    },
  };
}
