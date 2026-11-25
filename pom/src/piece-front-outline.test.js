import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPieceFrontOutline,mergeStraightOutlineEdges} from './piece-front-outline.js';

test('merging straight edges preserves each boundary segment, including holes',()=>{
  const cells=[];
  for(let y=0;y<4;y++)for(let x=0;x<5;x++)if(!(x===1&&y===1))cells.push({x,y});
  const original=buildPieceFrontOutline(cells),merged=mergeStraightOutlineEdges(original),expanded=[];
  for(const [x1,y1,x2,y2] of merged){
    const dx=Math.sign(x2-x1),dy=Math.sign(y2-y1);
    for(let x=x1,y=y1;x!==x2||y!==y2;x+=dx,y+=dy)expanded.push([x,y,x+dx,y+dy].join(','));
  }
  assert.deepEqual(expanded.sort(),original.map(edge=>edge.join(',')).sort());
  assert.ok(merged.length<original.length);
});

test('front outline excludes shared cell edges and keeps outside edges',()=>{
  assert.deepEqual(buildPieceFrontOutline([{x:0,y:0},{x:1,y:0}]),[
    [0,1,1,1],[1,0,0,0],[0,0,0,1],
    [1,1,2,1],[2,1,2,0],[2,0,1,0],
  ]);
});

test('front outline preserves interior boundaries of a hole',()=>{
  const cells=[];
  for(let y=0;y<3;y++)for(let x=0;x<3;x++)if(x!==1||y!==1)cells.push({x,y});
  const edges=buildPieceFrontOutline(cells).map(edge=>edge.join(','));
  for(const edge of ['1,1,2,1','2,1,2,2','2,2,1,2','1,2,1,1'])assert.ok(edges.includes(edge),edge);
  assert.equal(edges.length,16);
});

test('cached edges match original front geometry across Saturn pieces and depths',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {createMovementBoard}=await import('../shared/movement-routes.js');
  const catalog=JSON.parse(await readFile(new URL('./data/levels.json',import.meta.url),'utf8'));
  const level=catalog.levels.find(item=>item.id==='mural-saturn');
  const board=createMovementBoard(level.grid),height=level.grid.length;
  for(const group of board.groups)for(const depth of [0,1,2.5,3]){
    const original=[],same=(x,y)=>board.byCell[y]?.[x]===group,z=depth?depth+.04:.028,offset=depth?.2*z:0;
    const add=(x1,y1,x2,y2)=>original.push([x1+offset,y1*.9,z,x2+offset,y2*.9,z]);
    for(const {x,y} of group.cells){
      const y0=height-y-1,y1=height-y;
      if(!same(x,y+1))add(x,y0,x+1,y0);
      if(!same(x+1,y))add(x+1,y0,x+1,y1);
      if(!same(x,y-1))add(x+1,y1,x,y1);
      if(!same(x-1,y))add(x,y1,x,y0);
    }
    const cached=buildPieceFrontOutline(group.cells).map(([x1,y1,x2,y2])=>[x1+offset,(height-y1)*.9,z,x2+offset,(height-y2)*.9,z]);
    assert.deepEqual(cached,original,`piece ${group.id}, depth ${depth}`);
  }
});
