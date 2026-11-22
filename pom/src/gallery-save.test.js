import test from 'node:test';
import assert from 'node:assert/strict';
import {saveGalleryPuzzle} from '../shared/gallery-save.js';

function storageWith(existing){const writes=[];return {writes,async storage(store,method,value){assert.equal(store,'puzzles');if(method==='get')return existing;if(method==='put')writes.push(value)}}}
const puzzle={id:'level-1',revision:'rev-1'};
test('gallery add saves a new puzzle without starting or completing it',async()=>{const db=storageWith();assert.equal(await saveGalleryPuzzle(puzzle,db.storage,123),'added');assert.deepEqual(db.writes,[{id:'level-1',puzzle,updatedAt:123,completed:false}])});
test('adding an existing revision preserves the saved record and completion',async()=>{const db=storageWith({id:puzzle.id,puzzle,completed:true});assert.equal(await saveGalleryPuzzle(puzzle,db.storage),'already-saved');assert.equal(db.writes.length,0)});
test('a conflicting revision requires review and is not overwritten',async()=>{const db=storageWith({id:puzzle.id,puzzle:{...puzzle,revision:'old'},completed:true});assert.equal(await saveGalleryPuzzle(puzzle,db.storage),'review-update');assert.equal(db.writes.length,0)});
test('storage failures are surfaced to the gallery',async()=>{await assert.rejects(saveGalleryPuzzle(puzzle,async()=>{throw new Error('Storage unavailable')}),/Storage unavailable/)});
