import test from 'node:test';
import assert from 'node:assert/strict';
import {createUnfinishedPuzzles} from './unfinished-puzzles.js';

function setup(){let value=null;const storage={getItem:()=>value,setItem:(_,v)=>{value=v}};return createUnfinishedPuzzles(storage)}
function level(id){return {id,grid:['R'],start:{x:0,y:1,z:0},goal:{x:0,y:0}}}
const state=n=>({player:{x:0,y:1,z:n},depths:[n],history:[]});
test('keeps three unfinished puzzles in most-recently played order',()=>{
 const saves=setup(),[a,b,c,d]=['a','b','c','d'].map(level);
 saves.save(a,state(1));saves.save(b,state(1));saves.save(c,state(1));saves.save(a,state(2));
 assert.deepEqual(saves.list().map(e=>e.id),['a','c','b']);
 assert.deepEqual(saves.get(a),state(2));saves.save(d,state(1));
 assert.deepEqual(saves.list().map(e=>e.id),['d','a','c']);saves.remove('a');assert.equal(saves.get(a),null);
});
test('does not restore a changed puzzle and handles corrupt storage',()=>{
 const saves=setup(),a=level('a');saves.save(a,state(1));
 assert.equal(saves.get({...a,grid:['G']}),null);assert.deepEqual(saves.get(a),state(1));
 const broken=createUnfinishedPuzzles({getItem(){throw Error()},setItem(){throw Error()}});
 assert.deepEqual(broken.list(),[]);assert.equal(broken.save(a,state(1)),false);
});
