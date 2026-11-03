import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSceneryToPuzzle} from './scenery-mount.js';
test('the entire set moves as one unit to the flat puzzle backing at any authored distance',()=>{
 for(const distance of [3,8,18,24,48]){
  const mesh={points:[{x:1,y:2,z:3}]},objects=[{pos3D:{x:0,y:0,z:0},mesh},{pos3D:{x:4,y:2,z:-3},mesh}],reference={distance,points:[{x:0,y:0,z:-distance+.08}]},bounds={back:-distance,front:10},contacts=[{x:4,z:-3}],pickRecords=[{corners:[{x:4,y:2,z:-3}]}];
  mountSceneryToPuzzle({objects,reference,bounds,contacts,pickRecords},-distance-.02,.08);
  assert(Math.abs(reference.wallZ+.005)<1e-12);
  assert.equal(objects[1].pos3D.z-objects[0].pos3D.z,-3);
  assert.equal(objects[1].pos3D.z,contacts[0].z);
  assert.equal(contacts[0].z,pickRecords[0].corners[0].z);
  assert.equal(bounds.front-bounds.back,10+distance);
  assert.deepEqual(mesh.points,[{x:1,y:2,z:3}]);
  assert.equal(reference.authoredDistance,distance);
 }
});
