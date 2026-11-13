const KEY='little-ledges:v1:unfinished-puzzles';

// Geometry changes invalidate a position, including replacements of personal puzzles.
export function puzzleSignature(level){
  return JSON.stringify([level.grid,level.start,level.goal,level.initialDepths??[],level.userPuzzle?.revision??null,...(level.switches?.length?[level.switches]:[])]);
}
function hasMoves(level,state){
  if(!Array.isArray(state?.history)||state.history.length)return true;
  const start=level.start,player=state.player;
  return !start||!player||player.x!==start.x||player.y!==(start.y??level.grid.length)||player.z!==start.z||!Array.isArray(state.depths)||state.depths.some((depth,i)=>depth!==(level.initialDepths?.[i]??0));
}
export function createUnfinishedPuzzles(storage=globalThis.localStorage){
  function read(){
    try{const data=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(data)?data.filter(item=>item&&typeof item.id==='string'&&typeof item.signature==='string'&&item.state&&typeof item.state==='object').slice(0,3):[]}catch{return []}
  }
  function write(items){try{storage.setItem(KEY,JSON.stringify(items));return true}catch{return false}}
  return {
    key:KEY,
    list:read,
    get(level){const state=read().find(item=>item.id===level.id&&item.signature===puzzleSignature(level))?.state;return state&&hasMoves(level,state)?state:null},
    save(level,state){return write([{id:level.id,signature:puzzleSignature(level),state},...read().filter(item=>item.id!==level.id)].slice(0,3))},
    remove(id){const items=read(),remaining=items.filter(item=>item.id!==id);return remaining.length===items.length||write(remaining)},
  };
}
