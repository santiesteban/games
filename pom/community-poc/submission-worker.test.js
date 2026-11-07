import test from 'node:test';
import assert from 'node:assert/strict';
import {submit} from './submission-worker.js';
const grid=Array(31).fill('.'.repeat(32)).concat('0'+'.'.repeat(31));
const puzzle={format:'little-ledges-puzzle',schemaVersion:1,rulesVersion:1,id:'test',name:'Example',grid,palette:{0:[1,2,3]},start:{x:0,y:32,z:0},goal:{x:0,y:31},initialDepths:[0]};
const body={creatorName:'Tester',permission:true,puzzle,turnstileToken:'token'};
const request=(value,origin='https://creator.example')=>new Request('https://worker.example/submit',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify(value)});
test('validates origin and verification before inserting a pending submission',async()=>{
 let writes=0;const env={CREATOR_ORIGIN:'https://creator.example',TURNSTILE_SECRET:'secret',SUBMISSION_LIMITER:{limit:async()=>({success:true})},DB:{prepare:()=>({bind:()=>({run:async()=>{writes++}})})}},old=globalThis.fetch;
 try{globalThis.fetch=async()=>new Response(JSON.stringify({success:false}));assert.equal((await submit(request(body,'https://attacker.example'),env)).status,403);assert.equal((await submit(request(body),env)).status,403);assert.equal(writes,0);globalThis.fetch=async()=>new Response(JSON.stringify({success:true,hostname:'creator.example',action:'puzzle_submit'}));let response=await submit(request(body),env);assert.equal(response.status,201);assert.equal((await response.json()).status,'pending');assert.equal(writes,1)}finally{globalThis.fetch=old}
});
