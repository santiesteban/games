const KEY='little-ledges:v1:unfinished-puzzles';

// Geometry changes invalidate a position, including replacements of personal puzzles.
export function puzzleSignature(level){
  return JSON.stringify([level.grid,level.start,level.goal,level.initialDepths??[],level.userPuzzle?.revision??null]);
}
export function createUnfinishedPuzzles(storage=globalThis.localStorage){
  function read(){
    try{const data=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(data)?data.filter(item=>item&&typeof item.id==='string'&&typeof item.signature==='string'&&item.state&&typeof item.state==='object').slice(0,3):[]}catch{return []}
  }
  function write(items){try{storage.setItem(KEY,JSON.stringify(items));return true}catch{return false}}
  return {
    key:KEY,
    list:read,
    get(level){return read().find(item=>item.id===level.id&&item.signature===puzzleSignature(level))?.state??null},
    save(level,state){return write([{id:level.id,signature:puzzleSignature(level),state},...read().filter(item=>item.id!==level.id)].slice(0,3))},
    remove(id){const items=read(),remaining=items.filter(item=>item.id!==id);return remaining.length===items.length||write(remaining)},
  };
}
