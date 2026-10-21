import test from 'node:test';
import assert from 'node:assert/strict';
import { reachOutline, reachFaceDepth } from './reach-motion.js';

const idleContour=Array.from({length:48},(_,i)=>[.5*Math.cos(i*Math.PI/24),.47*Math.sin(i*Math.PI/24)+.08]);

test('eyes remain ahead of a body bending toward or away from the camera',()=>{
  let reproducedHiddenEyes=false;
  for(const direction of [-1,1])for(const depth of [-20,-4,0,4,20])for(const vertical of [-.3,0,.3]){
    const centers=[{x:direction*.3,y:vertical,z:depth},{x:0,y:0,z:0}];
    const outline=reachOutline(centers,idleContour),fill=reachOutline(centers,idleContour,.055);
    const bodyFront=Math.max(...outline.map(p=>p.z),...fill.map(p=>p.z+1));
    reproducedHiddenEyes||=bodyFront>2;
    assert(reachFaceDepth(outline,fill)>bodyFront);
    assert(Number.isFinite(reachFaceDepth(outline,fill)));
  }
  assert(reproducedHiddenEyes,'exercise the deformation that covered the old fixed eye layer');
});

test('an unstretched body uses the original eye layer',()=>{
  const centers=[{x:0,y:0,z:0},{x:0,y:0,z:0}];
  assert.equal(reachFaceDepth(reachOutline(centers,idleContour),reachOutline(centers,idleContour,.055)),2);
});
