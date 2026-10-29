export function dragDistance(start,end,axis){return (end.x-start.x)*axis.x+(end.y-start.y)*axis.y}
export function followsArrow(dx,dy,axis){return Math.abs(dx*axis.x+dy*axis.y)>=Math.hypot(dx,dy)*.5}
export const SNAP_FRACTION=.08;
export function snapDragSteps(fraction,pixels,maxDepth){
  if(pixels<4||fraction<=0)return 0;
  return Math.min(maxDepth,Math.max(1,Math.ceil(fraction-.08)));
}
export function nearArrow(point,directions,radius=24){
  return Object.values(directions).some(direction=>[direction.polygon,...(direction.tails??[])].some(poly=>poly.some((p,i)=>{
    const q=poly[(i+1)%poly.length],dx=q.x-p.x,dy=q.y-p.y,t=Math.max(0,Math.min(1,((point.x-p.x)*dx+(point.y-p.y)*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(point.x-p.x-t*dx,point.y-p.y-t*dy)<=radius;
  })));
}
// Invert the projected depth segment, including perspective foreshortening.
export function dragFraction(distance,projectDistance,maxDepth=1){
  if(distance<=0)return 0;
  if(distance>=projectDistance(maxDepth))return maxDepth;
  let lo=0,hi=maxDepth;
  for(let i=0;i<16;i++){const mid=(lo+hi)/2;if(projectDistance(mid)<distance)lo=mid;else hi=mid}
  return (lo+hi)/2;
}
export function createPieceDrag({wrap,readState,move,preview,clearHover,onRelease=()=>{},onBegin=()=>{},onTap=()=>{},pan=()=>{}}){
  const layer=document.createElement('div');layer.className='piece-drag';layer.hidden=true;
  layer.setAttribute('role','group');layer.setAttribute('aria-label','Drag to move selected piece');wrap.append(layer);
  let state,gesture,settling=false;
  function clear(){
    const old=gesture;gesture=null;settling=false;
    if(old){old.button.classList.remove('dragging','armed');if(old.capture.hasPointerCapture(old.id))old.capture.releasePointerCapture(old.id)}
    preview(null,0);
  }
  const handles=[-1,1].map(dir=>{
    const button=document.createElement('button');button.type='button';button.className='piece-drag-handle';
    const name=dir===1?'Pull out':'Push in';button.setAttribute('aria-label',`${name}: drag either way`);button.title=`Drag inward or outward · Enter to ${name.toLowerCase()}`;
    button.innerHTML='<svg aria-hidden="true"><path class="arrow-outline"/><path class="arrow-line"/>'+[0,1,2].map(()=>'<path class="depth-tail-outline"/><path class="depth-tail-fill"/>').join('')+'</svg>';layer.append(button);
    button.addEventListener('keydown',()=>button.classList.remove('pointer-interaction'));
    button.addEventListener('blur',()=>button.classList.remove('pointer-interaction'));
    function start(e,capture=button){
      button.classList.add('pointer-interaction');
      e.stopPropagation();if(e.button!==0||gesture||!state?.directions[dir]||button.disabled)return;
      e.preventDefault();onBegin(state.piece);clearHover();
      gesture={id:e.pointerId,piece:state.piece,depth:state.piece.depth,dir,button,capture,start:{x:e.clientX,y:e.clientY},...state.directions[dir],directions:state.directions,fraction:0,pixels:0,movement:0,showShadow:false};
      capture.setPointerCapture(e.pointerId);button.classList.add('dragging');
      preview(gesture.piece,0);return true;
    }
    button.addEventListener('pointerdown',e=>start(e));
    function progress(e){
      if(!gesture||settling||gesture.id!==e.pointerId||gesture.button!==button)return;
      const end={x:e.clientX,y:e.clientY};
      gesture.movement=Math.max(gesture.movement,Math.hypot(end.x-gesture.start.x,end.y-gesture.start.y));
      const dx=end.x-gesture.start.x,dy=end.y-gesture.start.y;
      if(!gesture.intent&&Math.hypot(dx,dy)>=4)gesture.intent=followsArrow(dx,dy,gesture.axis)?'piece':'camera';
      if(gesture.intent==='camera'){
        const previous=gesture.panPoint??gesture.start;pan(end.x-previous.x,end.y-previous.y);gesture.panPoint=end;return;
      }
      if(!gesture.intent)return;
      const signed=dragDistance(gesture.start,end,gesture.axis);
      gesture.dir=signed>=0?dir:-dir;
      const direction=gesture.directions[gesture.dir];
      gesture.pixels=direction?Math.max(0,dragDistance(gesture.start,end,direction.axis)):0;
      gesture.fraction=direction?dragFraction(dragDistance(gesture.start,end,direction.axis),direction.projectDistance,direction.maxDepth??1):0;
      button.classList.toggle('armed',gesture.fraction>=SNAP_FRACTION);
      preview(gesture.piece,gesture.fraction?gesture.dir*gesture.fraction:0);
    }
    button.addEventListener('pointermove',e=>{e.stopPropagation();progress(e)});
    function finish(e,cancel=false){
      e.stopPropagation();if(!gesture||settling||gesture.id!==e.pointerId||gesture.button!==button)return;
      // Use the last tracked position: release/capture events can carry stale coordinates.
      const g=gesture;
      if(g.intent==='camera'){clear();onRelease();return}
      if(!cancel&&g.movement<4){clear();onRelease();onTap(e);return}
      const current=readState(),valid=current?.piece===g.piece&&g.piece.depth===g.depth&&current.allowed.includes(g.dir);
      const target=!cancel&&valid?snapDragSteps(g.fraction,g.pixels,g.directions[g.dir]?.maxDepth??1):0;
      settling=true;onRelease();if(g.capture.hasPointerCapture(g.id))g.capture.releasePointerCapture(g.id);
      const start=performance.now(),duration=matchMedia('(prefers-reduced-motion:reduce)').matches?0:140;
      function settle(now){
        if(gesture!==g)return;
        const current=readState();if(current?.piece!==g.piece||g.piece.depth!==g.depth){clear();return}
        const t=duration?Math.min(1,(now-start)/duration):1,ease=1-(1-t)**3;
        preview(g.piece,g.dir*(g.fraction+(target-g.fraction)*ease));
        if(t<1){requestAnimationFrame(settle);return}
        clear();if(target)move(g.dir,target);
      }
      requestAnimationFrame(settle);
    }
    button.addEventListener('pointerup',e=>finish(e));
    button.addEventListener('pointercancel',e=>finish(e,true));
    button.addEventListener('lostpointercapture',e=>finish(e));
    button.addEventListener('click',e=>{
      e.stopPropagation();
      if(e.detail===0&&!gesture){const r=button.getBoundingClientRect();onTap({clientX:r.left+r.width/2,clientY:r.top+r.height/2})}
    });
    return {button,dir,start,progress,finish};
  });
  const shadow=document.createElement('div');shadow.className='piece-drag-shadow';shadow.hidden=true;shadow.setAttribute('aria-hidden','true');layer.append(shadow);
  for(const type of ['pointerdown','pointermove','pointerup'])layer.addEventListener(type,e=>e.stopPropagation());
  return {beginFace(e){
    if(gesture)return false;
    state=readState(true);if(!state)return false;
    const handle=handles.find(h=>state.directions[h.dir]);
    const centered=readState(),rect=wrap.getBoundingClientRect?.()??{left:0,top:0};
    const showShadow=!centered||!nearArrow({x:e.clientX-rect.left,y:e.clientY-rect.top},centered.directions);
    const started=handle?.start(e,wrap)===true;
    if(started)gesture.showShadow=showShadow;
    return started;
  },pointerMove(e){
    if(gesture?.capture!==wrap||gesture.id!==e.pointerId)return false;
    handles.find(h=>h.button===gesture.button).progress(e);return true;
  },pointerUp(e,cancel=false){
    if(gesture?.capture!==wrap||gesture.id!==e.pointerId)return false;
    handles.find(h=>h.button===gesture.button).finish(e,cancel);return true;
  },dispose(){if(gesture)clear();layer.remove();},get active(){return !!gesture},get moving(){return gesture?.intent==='piece'},setSuppressed(value){layer.classList.toggle('is-suppressed',value)},sync(){
    state=readState();layer.hidden=!state;
    if(gesture&&(!state||state.piece!==gesture.piece||gesture.piece.depth!==gesture.depth))clear();
    shadow.hidden=!state||!gesture||!gesture.showShadow||gesture.capture!==wrap||settling;
    shadow.classList.toggle('is-fading',gesture?.intent==='camera');
    if(!shadow.hidden){
      const grabbed=readState(true),path=points=>points.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ')+' Z';
      shadow.innerHTML=`<svg width="100%" height="100%" viewBox="0 0 ${wrap.clientWidth} ${wrap.clientHeight}" aria-hidden="true">${Object.values(grabbed?.directions??{}).map(direction=>`<path d="${path(direction.polygon)}" fill="#fffaf0" stroke="#292537" stroke-width="3"/>${(direction.tails??[]).map(tail=>`<path d="${path(tail)}" fill="#f3bc52" stroke="#292537" stroke-width="2"/>`).join('')}`).join('')}</svg>`;
    }
    if(!state)return;
    layer.style.setProperty('--piece-arrow-color',state.color??'#fffaf0');
    const offset=gesture?gesture.dir*gesture.fraction:0,depth=Math.max(0,Math.min(3,state.previewDepth??(state.piece.depth+offset)));
    for(const {button,dir} of handles){
      const direction=state.directions[dir];button.hidden=!direction;button.disabled=!direction;if(!direction)continue;
      const points=[...direction.polygon,...(direction.tails??[]).flat()];
      const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
      const left=Math.min(...xs)-8,top=Math.min(...ys)-8,width=Math.max(48,Math.max(...xs)-left+8),height=Math.max(48,Math.max(...ys)-top+8);
      button.style.left=`${left}px`;button.style.top=`${top}px`;button.style.width=`${width}px`;button.style.height=`${height}px`;
      const svg=button.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      const path=direction.polygon.map((p,i)=>`${i?'L':'M'}${p.x-left},${p.y-top}`).join(' ')+' Z';
      const paths=svg.querySelectorAll('path');
      for(const p of Array.from(paths).slice(0,2))p.setAttribute('d',path);
      for(let index=0;index<3;index++){
        const tail=direction.tails?.[index];
        if(!tail){paths[2+index*2]?.setAttribute('d','');paths[3+index*2]?.setAttribute('d','');continue}
        const d=tail.map((p,i)=>`${i?'L':'M'}${p.x-left},${p.y-top}`).join(' ')+' Z';
        const outline=paths[2+index*2],fill=paths[3+index*2];
        outline.setAttribute('d',d);fill.setAttribute('d',d);
        // Keep the tail in place, but fade steps already traversed in this gesture.
        const traversed=gesture?.intent==='piece'&&gesture.dir===dir?Math.min(direction.maxDepth,Math.floor(gesture.fraction+0.08)):0;
        fill.setAttribute('class',`depth-tail-fill${index<traversed?'':' filled'}`);
      }
      button.title=`${dir===1?'Pull out':'Push in'}: ${direction.tails?.length??direction.maxDepth} steps available · drag either way`;
    }
  }};
}

// Ray/solid intersections distinguish the visible front from top/side surfaces.
export function pickPieceFront(ray,pieces,height){
  let nearest=null;
  for(const piece of pieces)for(const cell of piece.cells){
    const min={x:cell.x,y:height-cell.y-1,z:-.08},max={x:cell.x+1,y:height-cell.y,z:piece.depth+.025};
    let enter=0,exit=Infinity,face=null;
    for(const axis of ['x','y','z']){
      const origin=ray.origin[axis],direction=ray.direction[axis];
      if(Math.abs(direction)<1e-9){if(origin<min[axis]||origin>max[axis]){exit=-1;break}continue}
      const a=(min[axis]-origin)/direction,b=(max[axis]-origin)/direction,lo=Math.min(a,b),hi=Math.max(a,b);
      if(lo>enter){enter=lo;face=axis}
      exit=Math.min(exit,hi);
    }
    if(enter>exit||exit<0||nearest&&enter>=nearest.distance)continue;
    nearest={piece,distance:enter,front:face==='z'&&ray.direction.z<0,x:ray.origin.x+ray.direction.x*enter,y:ray.origin.y+ray.direction.y*enter};
  }
  return nearest?.front?nearest:null;
}


export function pieceInteractionAnchor(cells,player){
  const target={x:player.x+.5,y:player.y-1.15};
  const cell=cells.reduce((a,b)=>Math.hypot(a.x+.5-target.x,a.y+.5-target.y)<=Math.hypot(b.x+.5-target.x,b.y+.5-target.y)?a:b);
  return {x:Math.max(cell.x+.15,Math.min(cell.x+.85,target.x)),y:Math.max(cell.y+.15,Math.min(cell.y+.85,target.y))};
}

export function arrowPomClearance(directions,pom){
  if(!pom)return 0;
  let shift=0;
  for(const d of Object.values(directions)){
    const points=[...d.polygon,...(d.tails??[]).flat()],xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    if(Math.max(...xs)<pom.x-34||Math.min(...xs)>pom.x+34)continue;
    if(Math.max(...ys)<pom.y-38||Math.min(...ys)>pom.y+30)continue;
    shift=Math.min(shift,pom.y-38-Math.max(...ys));
  }
  return shift;
}
