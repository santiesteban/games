import { validatePuzzle } from '../../shared/puzzle.js';
import { canReachPiece, manipulateState, goalPosition, nodeKey, replaySolution } from '../../shared/rules.js';
import { createMovementBoard, movementNeighbors, planMovement } from '../../shared/movement-routes.js';

self.onmessage=({data})=>{
  let visited=0,transitions=0;const started=performance.now(),limit=15000;let stateLimit=18000;
  const budget=()=>{if(performance.now()-started>limit||visited>=stateLimit)throw new Error('budget')};
  try{
    const puzzle=validatePuzzle(data);stateLimit=Math.min(18000,Math.max(200,Math.floor(1000000/puzzle.initialDepths.length)));const root={depths:puzzle.initialDepths,player:puzzle.start,parent:-1,action:null},queue=[root],key=s=>`${s.depths.join('')}:${nodeKey(s.player)}`,seen=new Set([key(root)]),boards=new Map();
    function boardFor(depths){const key=depths.join('');if(!boards.has(key)){if(boards.size>=64)boards.delete(boards.keys().next().value);boards.set(key,{board:createMovementBoard(puzzle.grid,depths),routes:new Map()})}return boards.get(key)}
    for(let head=0;head<queue.length;head++){
      visited=head+1;budget();const current=queue[head],{board,routes}=boardFor(current.depths);
      const getPlan=(a,b)=>{budget();const key=`${nodeKey(a)}>${nodeKey(b)}`;if(!routes.has(key)){if(routes.size>=4000)routes.clear();routes.set(key,planMovement(board,a,b))}return routes.get(key)};
      function enqueue(next,action){
        transitions++;const k=key(next);if(seen.has(k))return;
        budget();if(queue.length>=stateLimit)throw new Error('budget');seen.add(k);queue.push({...next,parent:head,action});
      }
      for(const to of movementNeighbors(board,current.player,getPlan)){
        if(nodeKey(to)===nodeKey(goalPosition(board,puzzle.goal))){
          const actions=[{type:'move',to}];let i=head;while(queue[i].parent!==-1){actions.push(queue[i].action);i=queue[i].parent}actions.reverse();
          if(!replaySolution(puzzle,actions))throw new Error('Solution replay failed.');
          self.postMessage({status:'solvable',visited,transitions,actions,revision:puzzle.revision,elapsed:performance.now()-started});return;
        }
        enqueue({depths:current.depths,player:to},{type:'move',to});
      }
      for(const g of board.groups)if(canReachPiece(board,g,current.player))for(const dir of [1,-1]){budget();const next=manipulateState(board,current.player,g.id,dir);if(next)enqueue(next,{type:'piece',id:g.id,dir})}
      if(head%100===0)self.postMessage({status:'working',visited,queued:queue.length-head,elapsed:performance.now()-started});
    }
    self.postMessage({status:'unsolvable',visited,transitions,revision:puzzle.revision,goal:puzzle.goal,elapsed:performance.now()-started});
  }catch(error){self.postMessage({status:error.message==='budget'?'undetermined':'error',visited,transitions,message:error.message,elapsed:performance.now()-started})}
};
