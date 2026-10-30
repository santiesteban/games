import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleAppFrame,installViewportSafety} from './viewport-safety.js';
const v=(scale=1)=>({scale,width:512,height:384,offsetLeft:128,offsetTop:96});
function fixture(scale=1){
 const viewport=Object.assign(new EventTarget(),v(scale)),board=new EventTarget(),styles=new Map,classes=new Set;
 const root={dataset:{},style:{setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)},classList:{toggle(k,on){on?classes.add(k):classes.delete(k)},remove:k=>classes.delete(k)}};
 return{viewport,board,root,styles,classes,safety:installViewportSafety(root,board,viewport)};
}
test('ordinary page zoom and keyboard-sized viewport at scale 1 keep the original layout',()=>{
 assert.equal(visibleAppFrame(v()),null);assert.equal(visibleAppFrame(null),null);assert.equal(visibleAppFrame({...v(2),width:0}),null);
 const f=fixture();assert.equal(f.styles.size,0);assert.equal(f.safety.pageZoomed,false);
});
test('magnified visual viewport keeps the app in the visible area without counter-scaling UI',()=>{
 const f=fixture(2);assert.deepEqual(visibleAppFrame(f.viewport),{width:512,height:384,x:128,y:96,scale:2});
 assert.equal(f.styles.get('--visual-width'),'512px');assert.equal(f.styles.get('--visual-height'),'384px');assert.equal(f.styles.get('--visual-x'),'128px');assert.equal(f.styles.get('--visual-y'),'96px');assert(f.classes.has('is-page-zoomed'));
 f.viewport.offsetLeft=256;f.viewport.offsetTop=192;f.viewport.dispatchEvent(new Event('scroll'));assert.equal(f.styles.get('--visual-x'),'256px');assert.equal(f.styles.get('--visual-y'),'192px');
 f.viewport.width=384;f.viewport.height=512;f.viewport.dispatchEvent(new Event('resize'));assert.equal(f.styles.get('--visual-width'),'384px');assert.equal(f.styles.get('--visual-height'),'512px');
});
test('board-owned legacy pinch and double-tap defaults are canceled without canceling normal clicks',()=>{
 const f=fixture();for(const type of ['gesturestart','gesturechange','gestureend','dblclick']){const e=new Event(type,{cancelable:true});f.board.dispatchEvent(e);assert(e.defaultPrevented)}
 for(const type of ['click','pointerdown','pointerup']){const e=new Event(type,{cancelable:true});f.board.dispatchEvent(e);assert.equal(e.defaultPrevented,false)}
});
test('native gestures stay available to recover from browser magnification',()=>{
 const f=fixture(2);for(const type of ['gesturestart','gesturechange','gestureend','dblclick']){const e=new Event(type,{cancelable:true});f.board.dispatchEvent(e);assert.equal(e.defaultPrevented,false)}
 f.viewport.scale=1;f.viewport.dispatchEvent(new Event('resize'));assert.equal(f.safety.pageZoomed,false);assert.equal(f.styles.size,0);assert(!f.classes.has('is-page-zoomed'));
});
test('unsupported visual viewport and noncancelable events remain safe',()=>{
 const f=fixture();const event=new Event('gesturestart');f.board.dispatchEvent(event);assert.equal(event.defaultPrevented,false);
 const safety=installViewportSafety(f.root,new EventTarget(),undefined);assert.equal(safety.pageZoomed,false);safety.dispose();
});
test('disposal restores layout and removes native gesture interception',()=>{
 const f=fixture(2);f.safety.dispose();assert.equal(f.styles.size,0);assert(!f.classes.has('is-page-zoomed'));
 f.viewport.scale=3;f.viewport.dispatchEvent(new Event('resize'));assert.equal(f.styles.size,0);
 const e=new Event('gesturestart',{cancelable:true});f.board.dispatchEvent(e);assert.equal(e.defaultPrevented,false);
});
