import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraControlCube} from './camera-control-cube.js';

test('axis guides follow the projected cube orientation',()=>{
 const front=cameraControlCube(0,20),turned=cameraControlCube(35,20),tilted=cameraControlCube(35,40);
 assert.notEqual(turned.horizontal,front.horizontal);
 assert.notEqual(tilted.horizontal,turned.horizontal);
 assert.notEqual(tilted.vertical,turned.vertical);
 for(const geometry of [front,turned,tilted])for(const path of Object.values(geometry))assert(!/NaN|Infinity/.test(path));
});
