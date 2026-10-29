import test from 'node:test';
import assert from 'node:assert/strict';
import {limitStagePan,minimumBackdropDistance,projectStageShadow} from './stage-geometry.js';
test('manual panning stays around the stage without changing target depth',()=>{
 const bounds={left:0,right:4,height:4},r={x:1,y:0,z:0},u={x:0,y:1,z:0};
 assert.deepEqual(limitStagePan({x:100,y:-100,z:2},r,u,bounds),{x:6,y:-2,z:2});
 assert.deepEqual(limitStagePan({x:2,y:2,z:2},r,u,bounds),{x:2,y:2,z:2});
 assert.equal(limitStagePan({x:100,y:2,z:2},r,u,bounds,true).x,16);
 const rotated={x:Math.SQRT1_2,y:0,z:-Math.SQRT1_2},next=limitStagePan({x:100,y:2,z:-100},rotated,u,bounds);
 assert.ok(Math.abs(next.x+next.z)<1e-10);
});
test('backdrop can approach the front view but clears puzzle at side views',()=>{
 assert.ok(minimumBackdropDistance(10,0)<1);
 assert.ok(minimumBackdropDistance(10,Math.PI/4)>3.8);
});
const quad=[{x:0,y:2,z:0},{x:1,y:2,z:0},{x:1,y:0,z:0},{x:0,y:0,z:0}],sun={x:0,y:1,z:1};
test('scenery shadow projects onto ground and wall with continuous UVs',()=>{
 const floor=projectStageShadow(quad,sun,{origin:{x:0,y:0,z:0},normal:{x:0,y:1,z:0}});
 assert.ok(floor.polygon.every(p=>Math.abs(p.y)<1e-8));
 assert.equal(floor.polygon[0].z,-2);assert.ok(Math.abs(floor.polygon[0].u)<1e-10);
 const wall=projectStageShadow(quad,sun,{origin:{x:0,y:0,z:-1},normal:{x:0,y:0,z:1}});
 assert.ok(wall.polygon.every(p=>Math.abs(p.z+1)<1e-8&&p.y>=0));
 assert.equal(projectStageShadow(quad,sun,{origin:{x:0,y:0,z:2},normal:{x:0,y:0,z:1}}),null);
 assert.equal(projectStageShadow(quad,sun,{origin:{x:0,y:0,z:-1},normal:{x:0,y:0,z:-1}}),null);
 const soft=projectStageShadow(quad,sun,{origin:{x:0,y:0,z:0},normal:{x:0,y:1,z:0}},.3);
 assert.ok(soft.polygon.some(p=>p.u<0));
});
