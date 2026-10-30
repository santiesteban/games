import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnvironmentTextureLoader } from './environment-loader.js';

const art={id:'alley',variant:'portrait',background:'bg',foreground:'fg',width:1024,height:1536};
const image={width:1024,height:1536};

test('loading stays lazy and waits for both decoded images before publishing a pair',async()=>{
  const pending=new Map(),created=[];
  const loader=createEnvironmentTextureLoader('meadow',['sky','grass'],{loadImage:url=>new Promise(resolve=>pending.set(url,resolve)),createTexture:image=>{created.push(image);return image}});
  assert.equal(pending.size,0);assert.deepEqual(loader.cached({id:'meadow'}),['sky','grass']);
  const promise=loader.load(art);assert.equal(loader.load(art),promise);assert.equal(pending.size,2);
  pending.get('bg')(image);await Promise.resolve();assert.equal(created.length,0);assert.equal(loader.cached(art),undefined);
  pending.get('fg')(image);assert.deepEqual(await promise,[image,image]);assert.equal(created.length,2);
  assert.equal(loader.cached({...art,variant:'landscape'}),undefined);
  assert.equal(await loader.load(art),loader.cached(art));
});

test('bad dimensions and failed requests preserve old scenery and can be retried',async()=>{
  let fail=true,created=0;
  const loader=createEnvironmentTextureLoader('meadow',['sky','grass'],{loadImage:async()=>fail?{width:1,height:1}:image,createTexture:image=>{created++;return image}});
  await assert.rejects(loader.load(art),/dimensions/);assert.equal(created,0);assert.equal(loader.cached(art),undefined);assert.deepEqual(loader.cached({id:'meadow'}),['sky','grass']);
  fail=false;assert.deepEqual(await loader.load(art),[image,image]);assert.equal(created,2);
});

test('legacy layer size exceptions remain supported',async()=>{
  const legacy={id:'legacy',background:'bg',foreground:'fg',width:3072,height:1024,backgroundSize:[3072,1023]};
  const loader=createEnvironmentTextureLoader('meadow',[],{loadImage:async url=>({width:3072,height:url==='bg'?1023:1024}),createTexture:image=>image});
  assert.deepEqual((await loader.load(legacy)).map(image=>image.height),[1023,1024]);
});


test('an unseeded loader fetches Meadow on demand instead of caching empty startup textures',async()=>{
 const calls=[],loader=createEnvironmentTextureLoader('meadow',undefined,{loadImage:async url=>{calls.push(url);return image},createTexture:image=>image});
 assert.equal(loader.cached({id:'meadow'}),undefined);assert.deepEqual(calls,[]);
 await loader.load({...art,id:'meadow',variant:undefined});assert.deepEqual(calls,['bg','fg']);
});
