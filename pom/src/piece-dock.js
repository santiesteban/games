import {canReachPiece, safePieceChange} from '../shared/rules.js';

const positions=['left','center','right'];
const shapes=[
  ['M3.5 3.5H14.5L16.3 5.3H5.3Z','M3.5 3.5L5.3 5.3V16.3L3.5 14.5Z','M5.3 5.3h11v11h-11Z'],
  ['M3.5 3.5H14.5L18 7H7Z','M3.5 3.5L7 7V18L3.5 14.5Z','M7 7h11v11H7Z'],
  ['M3.5 3.5H14.5L20 9H9Z','M3.5 3.5L9 9V20L3.5 14.5Z','M9 9h11v11H9Z'],
  ['M3.5 3.5H14.5L22.3 11.3H11.3Z','M3.5 3.5L11.3 11.3V22.3L3.5 14.5Z','M11.3 11.3h11v11h-11Z'],
];

// Use the canonical board and rules, including collision safety, at every update.
export function pieceDockState(board,player,selectedId,{paused=false,tabs=true}={}){
  function moves(piece){
    const reachable=canReachPiece(board,piece,player);
    return {
      push:!!reachable&&piece.depth>0&&safePieceChange(board,piece,player,piece.depth-1,-1),
      pull:!!reachable&&piece.depth<3&&safePieceChange(board,piece,player,piece.depth+1,1),
    };
  }
  const row=board.byCell[player.y-1],slots={left:null,center:null,right:null},seen=new Set();
  // A connected piece occupying several neighbor cells gets the center slot
  // first, then left, then right. Equal colors do not merge separate pieces.
  for(const [position,x] of [['center',player.x],['left',player.x-1],['right',player.x+1]]){
    const piece=row?.[x];
    if(!piece||seen.has(piece.id))continue;
    const actions=moves(piece);
    if(!actions.push&&!actions.pull)continue;
    seen.add(piece.id);slots[position]={piece,...actions};
  }
  let active=positions.find(position=>slots[position]&&slots[position].piece.id===selectedId)??'none';
  let selected=active==='none'?null:slots[active];
  if(!tabs){
    const piece=board.groups[selectedId];
    const actions=piece&&moves(piece);
    selected=actions&&(actions.push||actions.pull)?{piece,...actions}:null;
    active=selected?'center':'none';
    slots.center=selected;
  }
  return {slots,active,tabs,paused,push:!paused&&!!selected?.push,pull:!paused&&!!selected?.pull};
}

function colors(rgb){
  const luminance=rgb.map(value=>value/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4)
    .reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
  const fill=`rgb(${rgb.join(' ')})`;
  return {fill,background:luminance<.12?'#e6e6e6':fill,text:luminance<.18?'#fff':'#111'};
}

export function createPieceDock(root,onSelect){
  const buttons=Object.fromEntries(positions.map(position=>[position,root.querySelector(`[data-piece="${position}"]`)]));
  let state;
  for(const position of positions){
    buttons[position].addEventListener('click',()=>{
      if(!state?.paused&&state?.slots[position])onSelect(state.slots[position].piece.id);
    });
  }
  return {
    sync(next,palette){
      state=next;
      root.dataset.activePiece=state.paused?'none':state.active;
      root.classList.toggle('is-selected-only',!state.tabs);
      for(const position of positions){
        const button=buttons[position],entry=state.slots[position],piece=entry?.piece;
        const active=!state.paused&&state.tabs&&position===state.active;
        button.disabled=!piece||state.paused;
        button.dataset.state=piece?(state.paused?'paused':active?'active':'enabled'):'disabled';
        button.setAttribute('aria-pressed',String(active));
        button.setAttribute('aria-label',`${position[0].toUpperCase()+position.slice(1)} piece${piece?`, ${piece.color}, depth ${piece.depth}`:''}`);
        if(!piece){delete button.dataset.pieceId;continue}
        button.dataset.pieceId=String(piece.id);
        const color=colors(palette[piece.color]);
        root.style.setProperty(`--color-piece-${position}-fill`,color.fill);
        root.style.setProperty(`--color-piece-${position}`,color.fill);
        root.style.setProperty(`--color-piece-${position}-background`,color.background);
        root.style.setProperty(`--color-piece-${position}-control-text`,color.text);
        button.querySelectorAll('path').forEach((path,index)=>path.setAttribute('d',shapes[piece.depth][index]));
      }
      for(const action of ['push','pull']){
        const button=root.querySelector(`[data-mode="${action}"]`);
        button.disabled=!state[action];
        const piece=state.active==='none'?null:state.slots[state.active]?.piece;
        button.setAttribute('aria-label',`${action==='push'?'Push':'Pull'}${piece?` ${piece.color} piece`:''}`);
      }
    },
  };
}
