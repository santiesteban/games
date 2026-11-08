import test from 'node:test';
import assert from 'node:assert/strict';
import {palettes,recolorPalette} from '../creator/src/palettes.js';

test('new color collections provide ten distinct valid colors',()=>{
  for(const name of ['bold','twilight','cloud','adventure','velocity','woodland']){
    const colors=palettes[name];assert.equal(colors.length,10);assert.equal(new Set(colors.map(rgb=>rgb.join(','))).size,10);
    assert(colors.every(rgb=>rgb.length===3&&rgb.every(n=>Number.isInteger(n)&&n>=0&&n<=255)));
  }
});

test('switching a ten-color puzzle to a shorter collection preserves every color slot',()=>{
  const original=Object.fromEntries(palettes.bold.map((rgb,i)=>[String(i),rgb]));
  for(const collection of Object.values(palettes)){
    const result=recolorPalette(original,collection);
    assert.deepEqual(Object.keys(result),Object.keys(original));
    assert.equal(new Set(Object.values(result).map(rgb=>rgb.join(','))).size,10);
  }
});
