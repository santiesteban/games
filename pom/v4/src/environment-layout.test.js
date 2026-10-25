import test from 'node:test';
import assert from 'node:assert/strict';
import { environmentFrame, environmentCacheKey, environmentComposition, selectEnvironmentComposition } from './environment-layout.js';

const environment={id:'alley',width:3072,height:1024,aspectRatio:3,backgroundSize:[3072,1023],groundAnchorY:.82,registeredLayers:true,variants:{
  portrait:{width:1024,height:1536,groundAnchorY:.66731771,background:'portrait-bg',foreground:'portrait-fg'},
  landscape:{width:2048,height:1024,groundAnchorY:.78808594,background:'landscape-bg',foreground:'landscape-fg'},
}};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('phone and wide canvases select distinct compositions with their own anchors',()=>{
  for(const [width,height]of [[360,560],[390,650],[430,740]]){
    const result=selectEnvironmentComposition(environment,{width,height});
    assert.equal(result.variant,'portrait');assert.equal(result.groundAnchorY,.66731771);
  }
  for(const [width,height]of [[1280,600],[740,360]])assert.equal(selectEnvironmentComposition(environment,{width,height}).variant,'landscape');
});

test('small layout changes retain the previous composition until a meaningful gain',()=>{
  for(const width of [1140,1160,1180,1200])assert.equal(selectEnvironmentComposition(environment,{width,height:1000,previous:'portrait'}).variant,'portrait');
  assert.equal(selectEnvironmentComposition(environment,{width:1700,height:1000,previous:'portrait'}).variant,'landscape');
  assert.equal(selectEnvironmentComposition(environment,{width:600,height:1000,previous:'landscape'}).variant,'portrait');
});

test('shared frames cover the canvas and place both layers at the measured horizon',()=>{
  for(const variant of ['portrait','landscape'])for(const [width,height]of [[360,560],[390,650],[430,740],[768,700],[1280,600],[740,360]])for(const horizon of [.1,.4,.65,.8,.95])for(const ortho of [3,10,40]){
    const art=environmentComposition(environment,variant),ratio=width/height,groundQ=(.5-horizon)*ortho;
    const frame=environmentFrame(art,{ortho,worldWidth:ortho*ratio,groundQ});
    close(frame.foregroundHeight,frame.backgroundHeight);close(frame.foregroundY,frame.backgroundY);
    const top=frame.backgroundY+frame.backgroundHeight/2,bottom=frame.backgroundY-frame.backgroundHeight/2;
    assert.ok(top>=ortho/2-1e-8);assert.ok(bottom<=-ortho/2+1e-8);assert.ok(frame.backgroundHeight*art.aspectRatio>=ortho*ratio-1e-8);
    close(top-art.groundAnchorY*frame.backgroundHeight,groundQ);
  }
});

test('puzzle zoom does not enlarge the scenery at a fixed screen horizon',()=>{
  const art=environmentComposition(environment,'portrait'),frames=[3,10,40].map(ortho=>{
    const frame=environmentFrame(art,{ortho,worldWidth:ortho*.6,groundQ:-ortho*.28,sceneHeight:1000});
    return{height:frame.backgroundHeight/ortho,y:frame.backgroundY/ortho};
  });
  for(const frame of frames){close(frame.height,frames[0].height);close(frame.y,frames[0].y)}
});

test('legacy scenery and the original alley remain available as single-pair fallbacks',()=>{
  const legacy={id:'meadow',width:2172,height:724,aspectRatio:3,groundAnchorY:.6,registeredLayers:false};
  assert.equal(selectEnvironmentComposition(legacy,{width:390,height:650}),legacy);
  assert.equal(selectEnvironmentComposition(environment,{width:390,height:650,preferred:'legacy'}),environment);
  assert.equal(environmentCacheKey(legacy),'meadow');
  const portrait=environmentComposition(environment,'portrait');
  assert.equal(environmentCacheKey(portrait),'alley:portrait');assert.equal(portrait.backgroundSize,undefined);
  const frame=environmentFrame(legacy,{ortho:10,worldWidth:6,groundQ:-2.8});
  close(frame.backgroundHeight,10);close(frame.backgroundY,0);
});

test('manual studio choices override automatic selection',()=>{
  assert.equal(selectEnvironmentComposition(environment,{width:390,height:650,preferred:'landscape'}).variant,'landscape');
  assert.equal(selectEnvironmentComposition(environment,{width:1280,height:600,preferred:'portrait'}).variant,'portrait');
});
