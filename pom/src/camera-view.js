// Keep the original down angle; the forward angle is halfway to a flat elevation view.
export const CAMERA_PITCHES=[.38,.19];
export const DEFAULT_VIEW={horizontal:1,vertical:0};
export function cameraStep(value){return Number.isFinite(value)?Math.max(-1,Math.min(1,Math.round(value))):0}
export function cameraSlant(horizontal){return[-1,.5,1][cameraStep(horizontal)+1]}
export function cameraPosition(horizontal,vertical){
  const x=cameraStep(horizontal),y=Number.isFinite(vertical)?Math.max(0,Math.min(1,Math.round(vertical))):0;
  return{horizontal:x,vertical:y,pitch:CAMERA_PITCHES[y],slant:cameraSlant(x)};
}

// Round the outside contour as one shape, keeping the shaded faces joined.
function roundedCubeContour(points,radius=5){
  const corners=points.map((point,i)=>{
    const before=points[(i+points.length-1)%points.length],after=points[(i+1)%points.length],a=Math.hypot(before[0]-point[0],before[1]-point[1]),b=Math.hypot(after[0]-point[0],after[1]-point[1]),r=Math.min(radius,a/2,b/2);
    return{point,enter:point.map((v,j)=>v+(before[j]-v)*r/a),exit:point.map((v,j)=>v+(after[j]-v)*r/b)};
  });
  return corners.map((corner,i)=>`${i?'L':'M'}${corner.enter.join(' ')}Q${corner.point.join(' ')} ${corner.exit.join(' ')}`).join('')+'Z';
}

export function createViewController(root,onChange){
  const cube=root.querySelector('.view-cube'),svg=cube.querySelector('svg'),arrows=[...root.querySelectorAll('[data-drag-direction]')];
  let position=cameraPosition(DEFAULT_VIEW.horizontal,DEFAULT_VIEW.vertical),disabled=false,gesture;
  const directions={left:[-1,0],right:[1,0],up:[0,1],down:[0,-1]};
  function update(horizontal,vertical){
    position=cameraPosition(horizontal,vertical);
    root.dataset.horizontal=position.horizontal;root.dataset.vertical=position.vertical;root.dataset.slant=position.slant;
    const side=['right','center','left'][position.horizontal+1],height=position.vertical?'forward':'down';
    cube.setAttribute('aria-label',`View: ${side} and ${height}. Drag to turn`);
    // Show six clear schematic poses; the camera keeps its gentler angles.
    const x=19+position.horizontal*5,y=position.vertical?14:18,w=38,h=32,dx=-position.horizontal*12,dy=position.vertical?0:-11;
    svg.querySelector('.cube-front').setAttribute('d',`M${x} ${y}h${w}v${h}h${-w}Z`);
    const edge=position.horizontal>=0?x:x+w;
    svg.querySelector('.cube-side').setAttribute('d',`M${edge} ${y}l${dx} ${dy}v${h}l${-dx} ${-dy}Z`);
    svg.querySelector('.cube-side').style.display=position.horizontal?'':'none';
    svg.querySelector('.cube-top').setAttribute('d',`M${x} ${y}l${dx} ${dy}h${w}l${-dx} ${-dy}Z`);
    svg.querySelector('.cube-top').style.display=position.vertical?'none':'';
    const outline=position.horizontal>0?[[x+dx,y+dy],[x+w+dx,y+dy],[x+w,y],[x+w,y+h],[x,y+h],[x+dx,y+h+dy]]:position.horizontal<0?[[x,y],[x+dx,y+dy],[x+w+dx,y+dy],[x+w+dx,y+h+dy],[x+w,y+h],[x,y+h]]:[[x,y+dy],[x+w,y+dy],[x+w,y+h],[x,y+h]];
    const uniqueOutline=outline.filter((point,i)=>point[0]!==outline[(i+outline.length-1)%outline.length][0]||point[1]!==outline[(i+outline.length-1)%outline.length][1]);
    const contour=roundedCubeContour(uniqueOutline);
    svg.querySelector('.cube-clip').setAttribute('d',contour);svg.querySelector('.cube-outline').setAttribute('d',contour);
    svg.querySelector('.cube-seams').setAttribute('d',`${position.vertical?'':`M${x} ${y}H${x+w}`}${position.horizontal?`M${edge} ${y}V${y+h}`:''}`);
    svg.querySelector('.cube-eye').setAttribute('transform',`translate(${x+w/2} ${y+h/2})`);
    for(const arrow of arrows){const [dx,dy]=directions[arrow.dataset.dragDirection],next=cameraPosition(position.horizontal+dx,position.vertical+dy),unavailable=disabled||(next.horizontal===position.horizontal&&next.vertical===position.vertical);arrow.classList.toggle('is-disabled',unavailable);arrow.setAttribute('aria-disabled',String(unavailable))}
  }
  function choose(horizontal,vertical){if(!disabled)onChange(cameraPosition(horizontal,vertical))}
  const activate=()=>{if(!disabled)root.classList.add('is-active')};
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return}
    const direction={ArrowLeft:directions.left,ArrowRight:directions.right,ArrowUp:directions.up,ArrowDown:directions.down}[event.key];
    if(!direction)return;
    activate();event.preventDefault();event.stopPropagation();choose(position.horizontal+direction[0],position.vertical+direction[1]);
  });
  cube.addEventListener('pointerdown',event=>{
    if(disabled||event.button>0)return;
    activate();cube.focus({preventScroll:true});gesture={id:event.pointerId,x:event.clientX,y:event.clientY,...position};cube.setPointerCapture(event.pointerId);cube.classList.add('is-dragging');event.preventDefault();
  });
  cube.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    choose(gesture.horizontal+dx/30,gesture.vertical-dy/28);
  });
  const release=()=>{gesture=null;cube.classList.remove('is-dragging');root.classList.remove('is-active')};
  cube.addEventListener('pointerup',release);cube.addEventListener('pointercancel',release);cube.addEventListener('lostpointercapture',release);
  function close(){release();root.classList.remove('is-active')}
  cube.addEventListener('keyup',close);
  document.addEventListener('pointerdown',event=>{if(!root.contains(event.target))close()});
  root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))close()});
  update(position.horizontal,position.vertical);
  return{update,close,setDisabled(value){disabled=value;cube.disabled=value;update(position.horizontal,position.vertical);if(value)close()}};
}
