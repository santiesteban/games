import { createMovementBoard, planMovement } from './movement-routes.js';
export const nodeKey=p=>`${p.x},${p.y},${p.z}`;
export function canReachPiece(board,g,p){
  if(!g||p.y<board.height&&board.byCell[p.y]?.[p.x]===g&&p.z<g.depth)return false;
  return g.cells.some(c=>{
    if(p.x===c.x&&p.y===c.y+1&&p.z===g.depth)return true;
    if(Math.abs(p.x-c.x)!==1||p.y!==c.y+1)return false;
    const sideDepth=c.y===board.height?0:board.byCell[c.y]?.[p.x]?.depth??-1;
    return sideDepth<g.depth&&p.z>=Math.max(0,sideDepth)&&p.z<g.depth;
  });
}
export function safePieceChange(board,g,p,next,dir){const old=g.depth;try{g.depth=next;return board.validNode({...p,z:p.z+dir})}finally{g.depth=old}}
export function manipulateState(board,p,id,dir){
  const g=board.groups[id];if(![-1,1].includes(dir)||!g||!canReachPiece(board,g,p)||g.depth+dir<0||g.depth+dir>3||!safePieceChange(board,g,p,g.depth+dir,dir))return null;
  return {depths:board.groups.map(b=>b.depth+(b===g?dir:0)),player:{...p,z:p.z+dir}};
}
export function goalPosition(board,goal){return {...goal,z:Math.max(0,(board.byCell[goal.y]?.[goal.x]?.depth??0)-1)}}
export function replaySolution(puzzle,actions){
  if(!Array.isArray(actions)||actions.length>10000)return false;
  let board=createMovementBoard(puzzle.grid,puzzle.initialDepths),p={...puzzle.start};
  for(const a of actions){
    if(a.type==='move'){if(!a.to||!planMovement(board,p,a.to))return false;p=a.to}
    else if(a.type==='piece'){const next=manipulateState(board,p,a.id,a.dir);if(!next)return false;board=createMovementBoard(puzzle.grid,next.depths);p=next.player}
    else return false;
  }
  return nodeKey(p)===nodeKey(goalPosition(board,puzzle.goal))&&board.validNode(p);
}
