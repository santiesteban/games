import test from 'node:test';
import assert from 'node:assert/strict';
import {pickScenery,scenePlanePoint} from './scenery-picking.js';
const record={id:'cloud',corners:[{x:0,y:1,z:0},{x:1,y:1,z:0},{x:1,y:0,z:0},{x:0,y:0,z:0}]};
const ray={origin:{x:.5,y:.5,z:4},direction:{x:0,y:0,z:-1}};
test('scenery picks the nearest face and ignores transparent holes',()=>{
 assert.equal(pickScenery(ray,[record]).record.id,'cloud');
 assert.equal(pickScenery(ray,[{...record,mask:{width:1,height:1,rgba:[0,0,0,0]}}]),null);
 assert.equal(pickScenery({...ray,origin:{x:2,y:.5,z:4}},[record]),null);
 const near={...record,id:'near',corners:record.corners.map(p=>({...p,z:2}))};
 assert.equal(pickScenery(ray,[record,near]).record.id,'near');
});
test('dragging continues on the original plane beyond its bounds',()=>{
 const hit=scenePlanePoint({...ray,origin:{x:3,y:2,z:4}},record);
 assert.deepEqual(hit.point,{x:3,y:2,z:0});
 assert.equal(scenePlanePoint({...ray,direction:{x:1,y:0,z:0}},record),null);
});
