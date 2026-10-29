import test from 'node:test';
import assert from 'node:assert/strict';
import {followsArrow,dragDistance,dragFraction,SNAP_FRACTION,createPieceDrag,pickPieceFront,snapDragSteps,nearArrow,pieceInteractionAnchor,arrowPomClearance} from './piece-drag.js';

test('drag progress follows the depth axis at either camera angle',()=>{
  for(const x of [-.6,.6]){
    const axis={x,y:.8},start={x:100,y:80};
    assert.equal(dragDistance(start,{x:100+x*40,y:112},axis),40);
    assert.equal(dragDistance(start,{x:100-x*40,y:48},axis),-40);
    assert.ok(Math.abs(dragDistance(start,{x:132,y:80-x*40},axis))<1e-10);
  }
});
test('gesture intent accepts either direction within 60 degrees of the arrow',()=>{
  const axis={x:.6,y:.8};
  assert.equal(followsArrow(6,8,axis),true);
  assert.equal(followsArrow(-6,-8,axis),true);
  assert.equal(followsArrow(8,-6,axis),false);
  assert.equal(followsArrow(10,3,axis),true);
  assert.equal(followsArrow(1,0,{x:.5,y:Math.sqrt(3)/2}),true);
  assert.equal(followsArrow(1,0,{x:.4,y:Math.sqrt(.84)}),false);
});

test('continuous drag inverts perspective and clamps to the available travel range',()=>{
  const project=t=>90*t/(1-.2*t);
  for(const fraction of [.1,.3,.5,.8])assert.ok(Math.abs(dragFraction(project(fraction),project)-fraction)<.0001);
  assert.equal(dragFraction(-30,project),0);
  assert.equal(dragFraction(200,project),1);
  assert.equal(SNAP_FRACTION,.08);
  assert.ok(Math.abs(dragFraction(project(2.4),project,3)-2.4)<.0001);
});

test('the piece previews intermediate depths before release, and cancel never commits',()=>{
  class Element {
    children=[];events={};hidden=false;disabled=false;
    style={setProperty(){}};classList={add(){},remove(){},toggle(){}};
    append(e){this.children.push(e)}
    setAttribute(){}
    addEventListener(type,fn){this.events[type]=fn}
    setPointerCapture(id){this.pointer=id}
    hasPointerCapture(id){return this.pointer===id}
    releasePointerCapture(){this.pointer=null}
    remove(){}
    querySelector(){return {setAttribute(){},querySelectorAll(){return []}}}
    fire(type,x=0){this.events[type]?.({button:0,pointerId:1,clientX:x,clientY:0,stopPropagation(){},preventDefault(){}})}
  }
  const saved={document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,matchMedia:globalThis.matchMedia};
  try{
    globalThis.document={createElement:()=>new Element()};
    const frames=[];globalThis.requestAnimationFrame=fn=>frames.push(fn);globalThis.matchMedia=()=>({matches:true});
    let allowed=[1];
    const piece={depth:1},wrap=new Element(),previews=[],moves=[],taps=[];
    const direction={maxDepth:3,axis:{x:1,y:0},length:100,projectDistance:t=>t*100,polygon:[{x:0,y:0},{x:20,y:20}]};
    const controller=createPieceDrag({wrap,readState:atGrab=>({piece,anchor:{x:atGrab?100:0,y:0},allowed,directions:Object.fromEntries(allowed.map(dir=>[dir,{...direction,axis:{x:dir,y:0}}]))}),preview:(p,offset)=>previews.push(p?offset:0),move:(dir,steps)=>moves.push(dir*steps),clearHover(){},onTap:e=>taps.push(e)});
    controller.sync();const pull=wrap.children[0].children[1];
    pull.fire('pointerdown');pull.fire('pointerup');
    assert.equal(taps.length,1);assert.deepEqual(moves,[]);assert.equal(frames.length,0);
    pull.fire('pointerdown');pull.fire('pointermove',25);
    assert.ok(Math.abs(previews.at(-1)-.25)<.0001);
    assert.equal(piece.depth,1,'preview must not mutate the rules state');
    assert.equal(moves.length,0,'movement follows the pointer before any commit');
    pull.fire('pointercancel',25);frames.shift()(performance.now());
    assert.equal(previews.at(-1),0);assert.deepEqual(moves,[]);assert.equal(controller.active,false);
    pull.fire('pointerdown');pull.fire('pointermove',75);
    assert.ok(Math.abs(previews.at(-1)-.75)<.0001);
    pull.fire('pointerup',75);frames.shift()(performance.now());
    assert.deepEqual(moves,[1]);assert.equal(previews.at(-1),0);
    // The same outward handle accepts an inward drag and a reversal mid-drag.
    allowed=[-1,1];controller.sync();
    pull.fire('pointerdown');pull.fire('pointermove',75);pull.fire('pointermove',-75);
    assert.ok(Math.abs(previews.at(-1)+.75)<.0001);
    pull.fire('pointerup',-75);frames.shift()(performance.now());
    assert.deepEqual(moves,[1,-1]);
    const push=wrap.children[0].children[0];
    push.fire('pointerdown');push.fire('pointermove',75);
    assert.ok(Math.abs(previews.at(-1)-.75)<.0001);
    push.fire('pointerup',75);frames.shift()(performance.now());
    assert.deepEqual(moves,[1,-1,1]);
    pull.fire('pointerdown');pull.fire('pointermove',280);
    assert.ok(Math.abs(previews.at(-1)-2.8)<.0001);
    pull.fire('pointerup',280);frames.shift()(performance.now());
    assert.equal(moves.at(-1),3);moves.pop();
    pull.fire('pointerdown');pull.fire('pointermove',5);pull.fire('pointerup',0);frames.shift()(performance.now());
    assert.equal(moves.at(-1),1,'stale release coordinates cannot undo a deliberate small drag');moves.pop();
    // A blocked reverse direction stays at the original position.
    allowed=[1];controller.sync();pull.fire('pointerdown');pull.fire('pointermove',-75);
    assert.equal(previews.at(-1),0);
    pull.fire('pointerup',-75);frames.shift()(performance.now());
    assert.deepEqual(moves,[1,-1,1]);
    // Front-face input captures the board, using the same preview/settle path.
    const event=x=>({button:0,pointerId:2,clientX:x,clientY:0,stopPropagation(){},preventDefault(){}});
    assert.equal(controller.beginFace(event(100)),true);
    assert.equal(wrap.hasPointerCapture(2),true);
    controller.sync();assert.equal(wrap.children[0].children[2].hidden,false);
    assert.equal(controller.pointerMove(event(170)),true);
    assert.ok(Math.abs(previews.at(-1)-.7)<.0001);
    assert.equal(controller.pointerUp(event(170)),true);frames.shift()(performance.now());
    assert.deepEqual(moves,[1,-1,1,1]);
    assert.equal(wrap.hasPointerCapture(2),false);
    controller.sync();assert.equal(wrap.children[0].children[2].hidden,true);
  }finally{for(const [key,value]of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value}}
});

test('front-face picking respects top/side occlusion and returns the grab position',()=>{
  const piece={cells:[{x:0,y:0}],depth:1};
  const front=pickPieceFront({origin:{x:.75,y:.4,z:5},direction:{x:0,y:0,z:-1}},[piece],1);
  assert.equal(front.piece,piece);assert.equal(front.x,.75);assert.equal(front.y,.4);
  assert.equal(pickPieceFront({origin:{x:.5,y:5,z:.5},direction:{x:0,y:-1,z:0}},[piece],1),null);
  assert.equal(pickPieceFront({origin:{x:5,y:.5,z:.5},direction:{x:-1,y:0,z:0}},[piece],1),null);
  assert.equal(pickPieceFront({origin:{x:2,y:.5,z:5},direction:{x:0,y:0,z:-1}},[piece],1),null);
});

test('snap favors completing deliberate movement without treating taps as moves',()=>{
  assert.equal(snapDragSteps(.03,5,3),1);
  assert.equal(snapDragSteps(.8,40,3),1);
  assert.equal(snapDragSteps(1.3,70,3),2);
  assert.equal(snapDragSteps(2.85,180,3),3);
  assert.equal(snapDragSteps(.02,2,3),0);
  assert.equal(snapDragSteps(2.85,180,2),2);
});
test('near an existing arrow suppresses a redundant shadow',()=>{
  const directions={1:{polygon:[{x:0,y:0},{x:20,y:0},{x:10,y:20}],tails:[]}};
  assert.equal(nearArrow({x:25,y:10},directions),true);
  assert.equal(nearArrow({x:100,y:100},directions),false);
});

test('arrow anchor follows Pom’s contact edge rather than a large piece centroid',()=>{
  const cells=Array.from({length:12},(_,x)=>({x,y:3}));
  assert.deepEqual(pieceInteractionAnchor(cells,{x:1,y:4,z:0}),{x:1.5,y:3.15});
  assert.deepEqual(pieceInteractionAnchor(cells,{x:10,y:4,z:3}),{x:10.5,y:3.15});
  assert.deepEqual(pieceInteractionAnchor([{x:2,y:3}],{x:1,y:4,z:0}),{x:2.15,y:3.15});
});

test('the whole arrow tip clears Pom while nearby side arrows keep their position',()=>{
  const d={polygon:[{x:90,y:65},{x:110,y:65},{x:100,y:115}],tails:[]},pom={x:100,y:110};
  const dy=arrowPomClearance({1:d},pom);
  assert.equal(115+dy,pom.y-38);
  assert.equal(arrowPomClearance({1:d},{x:200,y:110}),0);
  assert.equal(arrowPomClearance({1:d},{x:100,y:200}),0);
});
