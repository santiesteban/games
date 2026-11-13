import {Color, EngineObject3D, TextureInfo, buildLathe, vec3} from 'littlejsengine';
import {WARP_PIPE_COLORS} from '../shared/warp-pipes.js';
import {vibrantWarpColor} from './warp-pulse.js';
import {createPuzzleBadgeMesh,drawPuzzleBadgeFrame} from './puzzle-badge.js';

const DARK=new Color(.20,.08,.28);
const fromHex=hex=>new Color(...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));

function texture(paint){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=256;
  paint(canvas.getContext('2d'));
  return new TextureInfo(canvas,true,false,false);
}

function badgeTexture(index,labeled,overlay=false){
  const colors=WARP_PIPE_COLORS[index%WARP_PIPE_COLORS.length];
  const vivid=hex=>{const color=vibrantWarpColor(fromHex(hex));return `rgb(${Math.round(color.r*255)} ${Math.round(color.g*255)} ${Math.round(color.b*255)})`};
  return texture(context=>{
    if(overlay){context.beginPath();context.roundRect(28,28,200,200,32);context.fillStyle='#ffe45c';context.fill();context.globalCompositeOperation='destination-out'}
    if(!overlay)drawPuzzleBadgeFrame(context);
    context.fillStyle=overlay?vivid(colors.body):colors.body;context.beginPath();context.roundRect(77,130,102,62,[0,0,18,18]);context.fill();
    context.beginPath();context.roundRect(57,80,142,60,12);
    context.fillStyle=overlay?vivid(colors.rim):colors.rim;context.fill();
    context.beginPath();context.ellipse(128,82,71,25,0,0,Math.PI*2);
    context.fillStyle=overlay?vivid(colors.rim):colors.rim;context.fill();
    context.beginPath();context.ellipse(128,82,43,13,0,0,Math.PI*2);
    if(overlay){context.fillStyle='#000';context.fill();context.globalCompositeOperation='source-over'}else{context.fillStyle='#3a184a';context.fill()}
    if(labeled&&!overlay){context.fillStyle='#33263b';context.font='bold 50px sans-serif';context.textAlign='center';context.fillText(String(index+1),199,220)}
  });
}

// Each end uses the same meshes and has independent state and placement.
export function createWarpPipeAssets(){
  const body=buildLathe([[.18,0],[.18,.23],[.19,.24],[.19,0],[.18,0]],32,true,false);
  const rim=buildLathe([[.17,.22],[.245,.22],[.245,.37],[.17,.37],[.17,.22]],32,false,false);
  const cap=buildLathe([[0,.371],[.17,.371]],32,false,true);
  const opening=buildLathe([[0,.30],[.17,.30]],32,false,true);
  const badge=createPuzzleBadgeMesh();
  const textures=new Map();
  function createEnd(index=0,labeled=false){
    const palette=WARP_PIPE_COLORS[index%WARP_PIPE_COLORS.length],key=`${index}:${labeled}`;
    if(!textures.has(key))textures.set(key,{base:badgeTexture(index,labeled),pulse:badgeTexture(index,labeled,true)});
    const make=(mesh,color,textureInfo)=>{
      const object=new EngineObject3D(vec3(),mesh,textureInfo,color);
      object.lighting=false;object.emissive=1;object.castShadow=false;object.receiveShadow=false;
      return object;
    };
    const pieces={
      body:make(body,fromHex(palette.body)),rim:make(rim,fromHex(palette.rim)),cap:make(cap,fromHex(palette.rim)),opening:make(opening,DARK),
      badge:make(badge,new Color(1),textures.get(key).base),badgePulse:make(badge,new Color(1,1,1,0),textures.get(key).pulse),
    };
    pieces.badge.transparent=pieces.badgePulse.transparent=true;
    return pieces;
  }
  return {createEnd,meshes:{body,rim,cap,opening,badge},textures};
}
