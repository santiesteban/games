import test from 'node:test';
import assert from 'node:assert/strict';
import {createLevelLoadGate} from './level-loading.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};

test('a puzzle stays covered until every required asset is ready',async()=>{
  const events=[],a=deferred(),b=deferred(),gate=createLevelLoadGate(state=>events.push(state));
  const pending=gate.run(()=>Promise.all([a.promise,b.promise]));
  a.resolve();await Promise.resolve();assert.deepEqual(events,['loading']);
  b.resolve();await pending;assert.deepEqual(events,['loading','ready']);
});
test('a late asset failure from the previous puzzle cannot cover the current puzzle',async()=>{
  const events=[],old=deferred(),gate=createLevelLoadGate(state=>events.push(state));
  const pending=gate.run(()=>old.promise);await gate.run(async()=>{});
  old.reject(new Error('old image failed'));await pending;
  assert.deepEqual(events,['loading','loading','ready']);
});
test('leaving a loading puzzle prevents it from reopening when its images finish',async()=>{
  const events=[],assets=deferred(),gate=createLevelLoadGate(state=>events.push(state));
  const pending=gate.run(()=>assets.promise);gate.cancel();assets.resolve();await pending;
  assert.deepEqual(events,['loading','idle']);
});
test('a failed load can be retried without retaining the error state',async()=>{
  const events=[],failure=new Error('offline'),gate=createLevelLoadGate((state,error)=>events.push([state,error]));
  await gate.run(async()=>{throw failure});assert.equal(events.at(-1)[1],failure);
  await gate.run(async()=>{});assert.deepEqual(events.map(([state])=>state),['loading','error','loading','ready']);
});
