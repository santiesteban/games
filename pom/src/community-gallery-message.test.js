import test from 'node:test';
import assert from 'node:assert/strict';
import {galleryImportUrl} from '../shared/gallery-message.js';

test('gallery import accepts only a message from the open gallery frame and trusted origin',()=>{
  const frame={},origin='https://santiesteban.github.io',data={type:'little-ledges:gallery-import',url:'https://example.com/puzzle'};
  assert.equal(galleryImportUrl({source:frame,origin,data},frame,origin),data.url);
  assert.equal(galleryImportUrl({source:{},origin,data},frame,origin),null);
  assert.equal(galleryImportUrl({source:frame,origin:'https://attacker.example',data},frame,origin),null);
  assert.equal(galleryImportUrl({source:frame,origin,data},null,origin),null);
  assert.equal(galleryImportUrl({source:frame,origin,data:{type:'other',url:data.url}},frame,origin),null);
});
