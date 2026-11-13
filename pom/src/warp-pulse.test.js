import test from 'node:test';
import assert from 'node:assert/strict';
import {vibrantWarpColor,warpPulsePhase} from './warp-pulse.js';
import {WARP_PIPE_COLORS} from '../shared/warp-pipes.js';

const rgb=hex=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);return {r,g,b}};
const saturation=c=>{const values=[c.r,c.g,c.b],max=Math.max(...values);return max?(max-Math.min(...values))/max:0};
test('the vivid pulse increases saturation without losing the pair color',()=>{
  for(const pair of WARP_PIPE_COLORS)for(const hex of [pair.body,pair.rim]){
    const base=rgb(hex),vivid=vibrantWarpColor(base);
    assert(saturation(vivid)>=saturation(base));
    assert(Math.max(vivid.r,vivid.g,vivid.b)>=Math.max(base.r,base.g,base.b));
    for(const key of ['r','g','b'])assert(vivid[key]>=0&&vivid[key]<=1);
    for(const [a,b] of [['r','g'],['g','b'],['b','r']])assert.equal(Math.sign(vivid[a]-vivid[b]),Math.sign(base[a]-base[b]));
  }
});
test('badge and destination pipe share a periodic pulse, with a static reduced-motion state',()=>{
  assert.equal(warpPulsePhase(0),0);assert.equal(warpPulsePhase(700),1);assert.equal(warpPulsePhase(1400),0);
  assert.equal(warpPulsePhase(0,true),warpPulsePhase(700,true));
});
