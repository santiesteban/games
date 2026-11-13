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
export function pulloutSwitchState(board,player,switches=[]){
  if(!switches?.length)return null;
  const grid=board.byCell.map(row=>row.map(group=>group?.color??'.').join(''));
  let current=board,position={...player},changed=false;const movements=[],steps=[];
  while(true){
    const item=switches.find(item=>item.x===position.x&&item.y===position.y&&current.byCell[item.y]?.[item.x]?.depth-1===position.z&&current.validNode(position));
    if(!item||!current.groups.some(group=>group.color===item.color&&group.depth<3))break;
    while(current.groups.some(group=>group.color===item.color&&group.depth<3)){
      const depths=current.groups.map(group=>group.color===item.color?Math.min(3,group.depth+1):group.depth),next=createMovementBoard(grid,depths);
      if(!next.validNode(position)){
        const obstacle=next.byCell[position.y-1]?.[position.x],jump={...position,y:position.y-1};
        if(obstacle?.color===item.color&&next.validNode(jump)){
          movements.push({type:'jump',from:position,to:jump});position=jump;
        }else{
          const z=Math.max(position.z,obstacle?.depth??position.z);let landing;
          for(let y=position.y;y<=next.height;y++)if(next.validNode({x:position.x,y,z})){landing={x:position.x,y,z};break}
          if(!landing)throw new Error('Pullout switch could not find a safe landing.');
          movements.push({type:landing.y>position.y?'fall':'push',from:position,to:landing});position=landing;
        }
      }
      current=next;changed=true;steps.push({depths,player:{...position}});
    }
  }
  return changed?{depths:current.groups.map(group=>group.depth),player:position,movements,steps}:null;
}
// Both endpoints need an exposed top square at their current depth.
export function warpDestination(board,p,pairs=[]){
  for(const pair of pairs){
    const nodes=pair.map(cell=>{const group=board.byCell[cell.y]?.[cell.x];if(!group||group.depth<=0)return null;const node={x:cell.x,y:cell.y,z:group.depth-1};return board.validNode(node)?node:null});
    if(!nodes[0]||!nodes[1])continue;
    if(nodeKey(p)===nodeKey(nodes[0]))return nodes[1];
    if(nodeKey(p)===nodeKey(nodes[1]))return nodes[0];
  }
  return null;
}
export function replaySolution(puzzle,actions){
  if(!Array.isArray(actions)||actions.length>10000)return false;
  let board=createMovementBoard(puzzle.grid,puzzle.initialDepths),p={...puzzle.start};
  function activate(){const next=pulloutSwitchState(board,p,puzzle.switches);if(next){board=createMovementBoard(puzzle.grid,next.depths);p=next.player}}
  activate();
  for(const a of actions){
    if(a.type==='move'){if(!a.to||!planMovement(board,p,a.to))return false;p=a.to}
    else if(a.type==='warp'){const to=warpDestination(board,p,puzzle.warpPairs);if(!to)return false;p=to}
    else if(a.type==='piece'){const next=manipulateState(board,p,a.id,a.dir);if(!next)return false;board=createMovementBoard(puzzle.grid,next.depths);p=next.player}
    else return false;
    activate();
  }
  return nodeKey(p)===nodeKey(goalPosition(board,puzzle.goal))&&board.validNode(p);
}
