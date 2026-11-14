import test from 'node:test';
import assert from 'node:assert/strict';
import {checksum,parsePayload} from '../creator/src/import/vendor/pushmo-decode.js';
import {readLevelBytes,readLevelText} from '../creator/src/import/level-data.js';
import {encodePuzzle,decodePuzzle} from '../shared/puzzle.js';

function payload(){
  const bytes=new Uint8Array(718),view=new DataView(bytes.buffer);
  bytes.set([0x8d,6,0,0]);bytes[12]=1;bytes[13]=7;bytes.set([7,174,136,149,127,42,46,35,81,28],14);
  for(let offset=24;offset<108;offset+=4)bytes[offset]=255;
  bytes.set([7,31,0,0],24);
  bytes.set([0,31,1,32],28);
  bytes.set([2,31,11,0],68);bytes.set([3,31,12,0],72);
  view.setUint32(176,0x300,true);
  const row='0.112.33'+'.'.repeat(24);
  for(let i=0;i<1024;i++){
    const tile=i>>6,local=i&63,x=(tile%4)*8+(local&1)+((local>>1)&2)+((local>>2)&4),y=(tile>>2)*8+((local>>1)&1)+((local>>2)&2)+((local>>3)&4);
    const n=y===31&&row[x]!=='.'?Number(row[x]):10;
    bytes[206+(i>>1)]|=n<<(i%2?0:4);
  }
  view.setUint32(8,checksum(bytes.slice(12)),true);return bytes;
}

test('Pushmo binary and decoded JSON import preserve switches and manhole pairs',async()=>{
  const bytes=payload(),source=await parsePayload(bytes),binary=await readLevelBytes(bytes),json=await readLevelText(JSON.stringify(source));
  assert.deepEqual(binary,json);
  assert.equal(binary.puzzle.rulesVersion,2);
  assert.deepEqual(binary.puzzle.switches,[{x:0,y:31,color:'2'}]);
  assert.deepEqual(binary.puzzle.warpPairs,[[{x:2,y:31},{x:3,y:31}]]);
  assert.deepEqual(decodePuzzle(encodePuzzle(binary.puzzle)),binary.puzzle);
});

test('unsupported and incomplete Pushmo gadgets are rejected rather than changed',async()=>{
  const source=await parsePayload(payload());
  source.manholes[0].inverted=true;
  await assert.rejects(readLevelText(JSON.stringify(source)),/Inverted manholes/);
  source.manholes[0].inverted=false;source.manholes.pop();
  await assert.rejects(readLevelText(JSON.stringify(source)),/exactly two/);
  source.manholes=[];source.flags.uses_manholes=false;source.flags.raw&=~0x100;
  source.switches[0].inverted=true;
  await assert.rejects(readLevelText(JSON.stringify(source)),/Inverted source switches/);
});
