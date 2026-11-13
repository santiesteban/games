import test from 'node:test';
import assert from 'node:assert/strict';
import {createPulloutSwitchAssets} from './pullout-switch-assets.js';
import {createWarpPipeAssets} from './warp-pipe-assets.js';

test('switch and warp badges share their frame, size and rendering settings',()=>{
  const originalDocument=globalThis.document,canvases=[];
  globalThis.document={createElement(type){
    assert.equal(type,'canvas');
    const calls=[],context={calls,fillStyle:'',globalCompositeOperation:'source-over'};
    for(const method of ['beginPath','roundRect','moveTo','arcTo','closePath','ellipse','fillText'])
      context[method]=(...args)=>calls.push([method,...args]);
    context.fill=()=>calls.push(['fill',context.fillStyle,context.globalCompositeOperation]);
    const canvas={getContext:()=>context};canvases.push(canvas);return canvas;
  }};
  try{
    const switchBadge=createPulloutSwitchAssets().createBadge([200,150,20]);
    const warpBadge=createWarpPipeAssets().createEnd().badge;
    const switchCanvas=canvases[0],warpCanvas=canvases[1];
    assert.equal(switchCanvas.width,256);assert.equal(switchCanvas.height,256);
    assert.equal(warpCanvas.width,256);assert.equal(warpCanvas.height,256);
    assert.deepEqual(switchCanvas.getContext().calls.slice(0,6),warpCanvas.getContext().calls.slice(0,6));
    assert.deepEqual(switchBadge.mesh.points,warpBadge.mesh.points);
    assert.equal(switchBadge.mesh.doubleSided,warpBadge.mesh.doubleSided);
    for(const property of ['transparent','lighting','emissive','castShadow','receiveShadow'])
      assert.equal(switchBadge[property],warpBadge[property],property);
    assert.deepEqual(switchCanvas.getContext().calls.slice(6),[
      ['beginPath'],['moveTo',128,179.5],['arcTo',179,88.5,166,88.5,10],
      ['arcTo',77,88.5,84,101.5,10],['arcTo',128,179.5,136,166.5,10],['closePath'],
      ['fill','rgb(200 150 20)','source-over'],
    ]);
  }finally{
    if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  }
});
