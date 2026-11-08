import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {packProgress} from './catalog-screens.js';
import {loadLevelCatalog} from '../shared/level-format.js';
const catalog=loadLevelCatalog(JSON.parse(fs.readFileSync(new URL('./data/levels.json',import.meta.url))));

test('pack totals match visible catalog levels instead of hidden pack members',()=>{
  const available=level=>level.compatibility.playable&&!level.knownIssues;
  const totals=catalog.groups.map(group=>packProgress(catalog.levels.filter(level=>level.group===group.id),new Set(),available).total);
  assert.deepEqual(totals,[11,9,14,16,16,9,1,2]);
});
test('visibility changes update both counts without losing hidden completions',()=>{
  const levels=[{id:'visible',kind:'puzzle'},{id:'hidden',kind:'puzzle',knownIssues:true},{id:'unsupported',kind:'puzzle',unsupported:true},{id:'studio',kind:'background-studio'}];
  const saved=new Set(['visible','hidden','unsupported','studio','unknown']);
  const original=[...saved];
  assert.deepEqual(packProgress(levels,saved,l=>!l.knownIssues&&!l.unsupported),{completed:1,total:1});
  assert.deepEqual(packProgress(levels,saved,l=>!l.unsupported),{completed:2,total:2});
  assert.deepEqual(packProgress(levels,saved,l=>!l.knownIssues&&!l.unsupported),{completed:1,total:1});
  assert.deepEqual([...saved],original);
});
test('empty and fully hidden packs have zero progress; studios never inflate counts',()=>{
  assert.deepEqual(packProgress([],new Set(),()=>true),{completed:0,total:0});
  assert.deepEqual(packProgress([{id:'hidden'}],new Set(['hidden']),()=>false),{completed:0,total:0});
  assert.deepEqual(packProgress([{id:'a',kind:'design-playground'},{id:'b',kind:'background-studio'}],new Set(['a','b']),()=>true),{completed:0,total:0});
});
