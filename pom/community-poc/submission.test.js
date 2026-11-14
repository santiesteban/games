import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSubmission} from './submission.js';
const grid=Array(31).fill('.'.repeat(32)).concat('0'+'.'.repeat(31));
const submission=()=>({creatorName:'Example',description:'',permission:true,puzzle:{format:'little-ledges-puzzle',schemaVersion:1,rulesVersion:1,id:'test',name:'Example',grid,palette:{0:[1,2,3]},start:{x:0,y:32,z:0},goal:{x:0,y:31},initialDepths:[0]}});
test('accepts a valid puzzle while preserving its intended geometry',()=>{const input=submission(),result=validateSubmission(input);assert.deepEqual(result.puzzle.grid,input.puzzle.grid);assert.equal(result.creatorName,'Example')});
test('rejects unsupported mechanics rather than discarding them',()=>{const input=submission();input.puzzle.objects={manholes:[{x:0,y:31,slot:0}]};assert.throws(()=>validateSubmission(input),/unsupported fields/)});
test('requires sharing permission and a valid starting point',()=>{let input=submission();input.permission=false;assert.throws(()=>validateSubmission(input),/permission/);input=submission();input.puzzle.start.z=9;assert.throws(()=>validateSubmission(input))});
test('validates and preserves pullout switches alongside warp pipes',()=>{
 const input=submission();Object.assign(input.puzzle,{rulesVersion:2,grid:[...Array(31).fill('.'.repeat(32)),'A.BBC.DD'+'.'.repeat(24)],palette:{A:[200,20,20],B:[20,20,200],C:[20,200,20],D:[200,200,20]},start:{x:0,y:31,z:0},goal:{x:7,y:31},initialDepths:[1,1,1,1],warpPairs:[[{x:2,y:31},{x:3,y:31}]],switches:[{x:0,y:31,color:'C'}]});
 const result=validateSubmission(input).puzzle;
 assert.equal(result.rulesVersion,2);assert.deepEqual(result.switches,[{x:0,y:31,color:'2'}]);assert.deepEqual(result.warpPairs,input.puzzle.warpPairs);
 input.puzzle.switches=[{x:2,y:31,color:'C'}];assert.throws(()=>validateSubmission(input),/warp pipes/);
 input.puzzle.switches=[{x:0,y:31,color:'Z'}];assert.throws(()=>validateSubmission(input),/color/);
 input.puzzle.rulesVersion=1;assert.throws(()=>validateSubmission(input),/rules version 2/);
});
