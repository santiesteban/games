import test from 'node:test';
import assert from 'node:assert/strict';
import {createMovementBoard} from '../shared/movement-routes.js';
import {pieceDockState} from './piece-dock.js';

test('depth limits and legal actions follow the real board at every depth',()=>{
  for(let depth=0;depth<=3;depth++){
    const board=createMovementBoard(['R'],[depth]);
    const state=pieceDockState(board,{x:0,y:1,z:depth},0);
    assert.equal(state.active,'center');
    assert.equal(state.push,depth>0);
    assert.equal(state.pull,depth<3);
    assert.equal(state.slots.center.piece.depth,depth);
    assert.equal(board.groups[0].depth,depth,'checking safety must not mutate depth');
  }
});

test('three pieces use spatial slots, and unsafe pushes stay disabled despite nonzero depth',()=>{
  const board=createMovementBoard(['RGB'],[1,0,1]);
  const state=pieceDockState(board,{x:1,y:1,z:0},0);
  assert.equal(state.active,'left');
  assert.deepEqual(['left','center','right'].map(slot=>state.slots[slot].piece.color),['R','G','B']);
  assert.equal(state.push,false,'pushing the side piece would put Pom below ground depth');
  assert.equal(state.pull,true);
  assert.deepEqual(board.groups.map(piece=>piece.depth),[1,0,1]);
});

test('one connected piece spanning multiple neighbors appears once in the center',()=>{
  const board=createMovementBoard(['RRR']);
  const state=pieceDockState(board,{x:1,y:1,z:0},0);
  assert.equal(state.active,'center');
  assert.equal(state.slots.left,null);
  assert.equal(state.slots.right,null);
  assert.equal(state.slots.center.piece.id,0);
});

test('separate pieces with the same color keep distinct tabs and identities',()=>{
  const board=createMovementBoard(['R.R'],[1,1]);
  const state=pieceDockState(board,{x:1,y:1,z:0},1);
  assert.equal(state.slots.center,null);
  assert.notEqual(state.slots.left.piece.id,state.slots.right.piece.id);
  assert.equal(state.slots.left.piece.color,state.slots.right.piece.color);
  assert.equal(state.active,'right');
});

test('no reachable pieces and no selection produce a neutral disabled dock',()=>{
  const board=createMovementBoard(['R'],[0]);
  for(const selectedId of [null,undefined]){
    const state=pieceDockState(board,{x:-1,y:1,z:3},selectedId);
    assert.deepEqual(state.slots,{left:null,center:null,right:null});
    assert.equal(state.active,'none');
    assert.equal(state.push,false);
    assert.equal(state.pull,false);
  }
});

test('an empty slot cannot impersonate an undefined selection when pieces are available',()=>{
  const board=createMovementBoard(['R']);
  const state=pieceDockState(board,{x:0,y:1,z:0},undefined);
  assert.equal(state.slots.left,null);
  assert.equal(state.active,'none');
  assert.equal(state.push,false);
  assert.equal(state.pull,false);
});

test('busy states keep the selected tab identity but disable actions',()=>{
  const board=createMovementBoard(['R'],[1]);
  const state=pieceDockState(board,{x:0,y:1,z:1},0,{paused:true});
  assert.equal(state.active,'center');
  assert.equal(state.slots.center.piece.id,0);
  assert.equal(state.push,false);
  assert.equal(state.pull,false);
});

test('selected-only mode uses the selected piece, without selecting another piece implicitly',()=>{
  const board=createMovementBoard(['RGB'],[1,0,1]),player={x:1,y:1,z:0};
  const selected=pieceDockState(board,player,0,{tabs:false});
  assert.equal(selected.tabs,false);
  assert.equal(selected.active,'center');
  assert.equal(selected.slots.center.piece.id,0);
  assert.equal(selected.pull,true);
  const unselected=pieceDockState(board,player,null,{tabs:false});
  assert.equal(unselected.active,'none');
  assert.equal(unselected.pull,false);
});
