import test from 'node:test';
import assert from 'node:assert/strict';
import {installSafariZoom} from './safari-zoom.js';
function fixture(){
  const board=new EventTarget();board.getBoundingClientRect=()=>({left:20,top:40,width:300,height:200});
  const calls=[];let allowed=true;
  const zoom=installSafariZoom(board,{enabled:()=>allowed,onStart:()=>calls.push('start'),onZoom:(...args)=>calls.push(args)});
  function send(type,scale,point={clientX:170,clientY:140}){const event=new Event(type,{cancelable:true});Object.assign(event,{scale,...point});board.dispatchEvent(event);return event}
  return{zoom,calls,send,disable(){allowed=false}};
}
test('Safari cumulative pinch scales zoom incrementally about the gesture location',()=>{
  const f=fixture();assert(f.send('gesturestart',1).defaultPrevented);
  f.send('gesturechange',1.2);f.send('gesturechange',1.5);
  assert.deepEqual(f.calls,['start',[1.2,150,100],[1.25,150,100]]);
  f.send('gestureend',1.5);assert.equal(f.zoom.active,false);
  f.send('gesturechange',2);assert.equal(f.calls.length,3);
});
test('native magnification recovery and existing pointer pinches can opt out',()=>{
  const f=fixture();f.disable();assert.equal(f.send('gesturestart',1).defaultPrevented,false);
  f.send('gesturechange',2);assert.deepEqual(f.calls,[]);
});
test('lost eligibility, invalid scales and disposal cannot leave stale zoom gestures',()=>{
  const f=fixture();f.send('gesturestart',1);f.send('gesturechange',0);f.send('gesturechange',NaN);assert.deepEqual(f.calls,['start']);
  f.disable();f.send('gesturechange',2);assert.equal(f.zoom.active,false);
  f.zoom.dispose();assert.equal(f.send('gesturestart',1).defaultPrevented,false);
});
