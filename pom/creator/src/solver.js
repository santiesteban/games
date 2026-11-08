import {validatePuzzle} from '../../shared/puzzle.js';
import {canReachPiece,manipulateState,goalPosition,nodeKey,replaySolution} from '../../shared/rules.js';
import {createMovementBoard,isSingleMove,movementNeighbors,planMovement} from '../../shared/movement-routes.js';

// Reject only geometric combinations that neither a regular move nor a jump
// can possibly accept. The actual decision still belongs to planMovement.
export function possibleMovement(from,to){
  if(isSingleMove(from,to))return true;
  const dx=to.x-from.x,dz=to.z-from.z,span=Math.max(Math.abs(dx),Math.abs(dz)),drop=to.y-from.y;
  return !(span<2||span>(drop>0?3:2)||drop< -1||(Math.min(Math.abs(dx),Math.abs(dz))!==0&&Math.abs(dx)!==Math.abs(dz))||(drop<0&&dx!==0&&dz!==0));
}

class Heap{
  constructor(){this.items=[]}
  push(value){const a=this.items;let i=a.length;a.push(value);while(i){const parent=(i-1)>>1;if(a[parent].score<=value.score)break;a[i]=a[parent];i=parent}a[i]=value}
  pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(true){let child=i*2+1;if(child>=a.length)break;if(child+1<a.length&&a[child+1].score<a[child].score)child++;if(a[child].score>=last.score)break;a[i]=a[child];i=child}a[i]=last}return first}
  get length(){return this.items.length}
}

// Weighted best-first exploration remains exhaustive if the queue empties;
// hitting either resource limit must never be reported as unsolvable.
export function solvePuzzle(input,{timeLimitMs=180000,maxStates,heuristicWeight=3,onProgress=()=>{},now=()=>performance.now()}={}){
  const started=now();let visited=0,transitions=0,lastProgress=started,bestDistance=Infinity,bestRow=Infinity;
  try{
    const puzzle=validatePuzzle(input),pieceCount=puzzle.initialDepths.length;
    const stateLimit=maxStates??Math.min(400000,Math.max(20000,Math.floor(45000000/(pieceCount+60))));
    const timedOut=()=>now()-started>=timeLimitMs;
    const root={depths:Uint8Array.from(puzzle.initialDepths),player:puzzle.start,parent:-1,action:null,steps:0},states=[root],queue=new Heap(),seen=new Set(),boards=new Map();
    const stateKey=s=>`${s.depths.join('')}:${nodeKey(s.player)}`;
    function boardFor(depths){const key=depths.join('');let value=boards.get(key);if(!value){if(boards.size>=(pieceCount>30?16:48))boards.delete(boards.keys().next().value);value={board:createMovementBoard(puzzle.grid,depths),routes:new Map()};boards.set(key,value)}return value}
    const goalPiece=boardFor(root.depths).board.byCell[puzzle.goal.y][puzzle.goal.x].id;
    function score(state){const p=state.player,goalDepth=Math.max(0,state.depths[goalPiece]-1);return state.steps+heuristicWeight*(Math.abs(p.x-puzzle.goal.x)+Math.abs(p.y-puzzle.goal.y)+Math.abs(p.z-goalDepth))}
    function result(status,extra={}){return {status,visited,transitions,elapsed:now()-started,revision:puzzle.revision,bestDistance,bestRow,...extra}}
    seen.add(stateKey(root));queue.push({index:0,score:score(root)});
    while(queue.length){
      if(timedOut())return result('undetermined',{reason:'time limit'});
      const head=queue.pop().index,current=states[head],{board,routes}=boardFor(current.depths);visited++;
      bestRow=Math.min(bestRow,current.player.y);bestDistance=Math.min(bestDistance,Math.abs(current.player.x-puzzle.goal.x)+Math.abs(current.player.y-puzzle.goal.y));
      const getPlan=(a,b)=>{if(!possibleMovement(a,b))return false;const key=`${nodeKey(a)}>${nodeKey(b)}`;if(!routes.has(key)){if(routes.size>=2000)routes.clear();routes.set(key,!!planMovement(board,a,b))}return routes.get(key)};
      function enqueue(next,action){
        transitions++;const key=stateKey(next);if(seen.has(key))return true;
        if(states.length>=stateLimit)return false;
        seen.add(key);const index=states.length,entry={...next,depths:action.type==='piece'?Uint8Array.from(next.depths):next.depths,parent:head,action,steps:current.steps+1};states.push(entry);queue.push({index,score:score(entry)});return true;
      }
      const goal=nodeKey(goalPosition(board,puzzle.goal));
      for(const to of movementNeighbors(board,current.player,getPlan)){
        if(timedOut())return result('undetermined',{reason:'time limit'});
        if(nodeKey(to)===goal){const actions=[{type:'move',to}];let i=head;while(states[i].parent!==-1){actions.push(states[i].action);i=states[i].parent}actions.reverse();if(!replaySolution(puzzle,actions))throw new Error('Solution replay failed.');return result('solvable',{actions})}
        if(!enqueue({depths:current.depths,player:to},{type:'move',to}))return result('undetermined',{reason:'state limit'});
      }
      for(const group of board.groups)if(canReachPiece(board,group,current.player))for(const dir of [1,-1]){
        if(timedOut())return result('undetermined',{reason:'time limit'});
        const next=manipulateState(board,current.player,group.id,dir);if(next&&!enqueue(next,{type:'piece',id:group.id,dir}))return result('undetermined',{reason:'state limit'});
      }
      const currentTime=now();if(currentTime-lastProgress>=250){lastProgress=currentTime;onProgress({status:'working',visited,queued:queue.length,elapsed:currentTime-started})}
    }
    return result('unsolvable',{goal:puzzle.goal});
  }catch(error){return {status:'error',visited,transitions,message:error.message,elapsed:now()-started}}
}
