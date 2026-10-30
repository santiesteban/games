// Browser magnification changes the visual viewport, not necessarily 100dvh or
// the layout viewport. Fit the controls to what the player can actually see.
// This does not counter-scale fonts, alter the browser's zoom, or change saves.
export function visibleAppFrame(viewport){
  if(!viewport||!Number.isFinite(viewport.scale)||viewport.scale<=1.01)return null;
  const {width,height,offsetLeft=0,offsetTop=0,scale}=viewport;
  if(![width,height,offsetLeft,offsetTop].every(Number.isFinite)||width<=0||height<=0)return null;
  return{width,height,x:offsetLeft,y:offsetTop,scale};
}
export function installViewportSafety(root,board,viewport){
  let frame=null;
  const properties=['--visual-width','--visual-height','--visual-x','--visual-y'];
  function sync(){
    frame=visibleAppFrame(viewport);root.classList.toggle('is-page-zoomed',!!frame);
    root.dataset.browserZoom=String(viewport?.scale??1);
    if(frame)for(const [key,value]of properties.map((key,i)=>[key,[frame.width,frame.height,frame.x,frame.y][i]]))root.style.setProperty(key,`${value}px`);
    else for(const key of properties)root.style.removeProperty(key);
  }
  // Safari's legacy gesture events have their own zoom default. Only the
  // playfield owns them; headers, settings and other pages keep browser zoom.
  // If page zoom already happened, allow native gestures to recover instead.
  const guard=event=>{if(!frame&&event.cancelable)event.preventDefault()};
  const types=['gesturestart','gesturechange','gestureend','dblclick'];
  for(const type of types)board.addEventListener(type,guard,{capture:true,passive:false});
  viewport?.addEventListener('resize',sync);viewport?.addEventListener('scroll',sync);sync();
  return{sync,get pageZoomed(){return !!frame},dispose(){
    for(const type of types)board.removeEventListener(type,guard,{capture:true});
    viewport?.removeEventListener('resize',sync);viewport?.removeEventListener('scroll',sync);
    frame=null;root.classList.remove('is-page-zoomed');for(const key of properties)root.style.removeProperty(key);
  }};
}
