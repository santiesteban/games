import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLevelProgress} from './level-progress.js';
const levels=JSON.parse(fs.readFileSync(new URL('./data/levels.json',import.meta.url))).levels.filter(l=>!['design-playground','background-studio'].includes(l.kind));
const key='little-ledges:v4:completed-levels';
function withStorage(initial,run){
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map([[key,JSON.stringify(initial)]]),writes=[];
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>data.get(k)??null,setItem(k,v){writes.push([k,v]);data.set(k,v)},removeItem(k){writes.push([k,null]);data.delete(k)}}});
 try{run({data,writes})}finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage}
}
test('pre-catalog numeric completions survive loading and the next completion',()=>withStorage([1,19,53,54],({data,writes})=>{
 const progress=createLevelProgress(levels);assert.equal(progress.key,key);assert.equal(progress.count,4);assert.equal(writes.length,0);
 for(const id of [1,19,53,54])assert(progress.has(`builtin-${String(id).padStart(3,'0')}`));
 assert(progress.complete('builtin-002'));assert.deepEqual(JSON.parse(data.get(key)),['builtin-001','builtin-002','builtin-019','builtin-053','builtin-054']);
}));
test('stable completions survive restarting the game with the current catalog',()=>withStorage(['builtin-001','builtin-019','mural-saturn'],({data,writes})=>{
 const before=data.get(key);for(let i=0;i<3;i++){const p=createLevelProgress(levels);p.reload();assert.equal(p.count,3);assert(p.has('builtin-019'))}
 assert.equal(data.get(key),before);assert.equal(writes.length,0);
}));
test('finishing a level merges newer progress from another tab',()=>withStorage(['builtin-001'],({data})=>{
 const first=createLevelProgress(levels),second=createLevelProgress(levels);second.complete('builtin-002');first.complete('builtin-003');
 assert.deepEqual(JSON.parse(data.get(key)),['builtin-001','builtin-002','builtin-003']);
}));
test('clearing progress requires an explicit clear call; an unknown completion does not clear it',()=>withStorage(['builtin-001'],({data,writes})=>{
 const p=createLevelProgress(levels);assert.equal(p.complete('not-a-level'),false);assert.equal(writes.length,0);assert(p.has('builtin-001'));
 assert.equal(p.clear(),true);assert.equal(data.has(key),false);assert.equal(p.count,0);
}));
