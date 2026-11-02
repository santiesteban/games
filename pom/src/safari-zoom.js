// Safari trackpads report cumulative gesture scales rather than wheel deltas.
// Touchscreens already using two pointer positions keep that existing path.
export function installSafariZoom(board,{enabled,onStart,onZoom}){
  let previous=null;
  function start(event){
    previous=null;
    if(!enabled()||!Number.isFinite(event.scale)||event.scale<=0)return;
    previous=event.scale;
    if(event.cancelable)event.preventDefault();
    onStart();
  }
  function change(event){
    if(previous===null)return;
    if(!enabled()){previous=null;return}
    if(!Number.isFinite(event.scale)||event.scale<=0)return;
    if(event.cancelable)event.preventDefault();
    const ratio=event.scale/previous;previous=event.scale;
    const rect=board.getBoundingClientRect();
    const x=Number.isFinite(event.clientX)?event.clientX-rect.left:rect.width/2;
    const y=Number.isFinite(event.clientY)?event.clientY-rect.top:rect.height/2;
    onZoom(ratio,x,y);
  }
  function end(){previous=null}
  const handlers={gesturestart:start,gesturechange:change,gestureend:end};
  for(const [type,handler]of Object.entries(handlers))board.addEventListener(type,handler,{passive:false});
  return{get active(){return previous!==null},dispose(){for(const [type,handler]of Object.entries(handlers))board.removeEventListener(type,handler);end()}};
}
