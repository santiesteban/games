import test from 'node:test';
import assert from 'node:assert/strict';
import {paddedCutout} from './cutout-padding.js';
test('cutout padding grows outward beyond texture edges without filling distant holes',()=>{
 const mask={width:1,height:1,rgba:[255,255,255,255]};
 const original=paddedCutout(mask,0),padded=paddedCutout(mask,1);
 assert.equal(original.distances.filter(d=>d===0).length,1);
 assert.equal(padded.solid(padded.pad+1,padded.pad),true);
 assert.equal(padded.solid(padded.pad+1,padded.pad+1),false);
 assert.equal(padded.solid(0,0),false);
});
