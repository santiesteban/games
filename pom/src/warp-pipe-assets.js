import {Color, EngineObject3D, TextureInfo, buildLathe, vec3} from 'littlejsengine';
import {WARP_PIPE_COLORS} from '../shared/warp-pipes.js';
import {vibrantWarpColor} from './warp-pulse.js';
import {createPuzzleBadgeMesh} from './puzzle-badge.js';
import {drawWarpPipeBadge} from '../shared/warp-pipe-badge.js';

export const WARP_PIPE_HEIGHT=.72;
export const INVERTED_PIPE_LENGTH=.4;
export const invertedPipeExtension=()=>INVERTED_PIPE_LENGTH-.37*WARP_PIPE_HEIGHT;

const DARK=new Color(.20,.08,.28);
const fromHex=hex=>new Color(...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));

function texture(paint){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=256;
  paint(canvas.getContext('2d'));
  return new TextureInfo(canvas,true,false,false);
}

function badgeTexture(index,labeled,overlay=false,inverted=false){
  const colors=WARP_PIPE_COLORS[index%WARP_PIPE_COLORS.length];
  const vivid=hex=>{const color=vibrantWarpColor(fromHex(hex));return `rgb(${Math.round(color.r*255)} ${Math.round(color.g*255)} ${Math.round(color.b*255)})`};
  return texture(context=>drawWarpPipeBadge(context,index,{labeled,overlay,inverted,vivid}));
}

// Each end uses the same meshes and has independent state and placement.
export function createWarpPipeAssets(){
  const body=buildLathe([[.18,0],[.18,.23],[.19,.24],[.19,0],[.18,0]],32,true,false);
  const rim=buildLathe([[.17,.22],[.245,.22],[.245,.37],[.17,.37],[.17,.22]],32,false,false);
  const cap=buildLathe([[0,.371],[.17,.371]],32,false,true);
  const opening=buildLathe([[0,.30],[.17,.30]],32,false,true);
  const badge=createPuzzleBadgeMesh();
  const textures=new Map();
  function createEnd(index=0,labeled=false,inverted=false){
    const palette=WARP_PIPE_COLORS[index%WARP_PIPE_COLORS.length],key=`${index}:${labeled}:${inverted}`;
    if(!textures.has(key))textures.set(key,{base:badgeTexture(index,labeled,false,inverted),pulse:badgeTexture(index,labeled,true,inverted)});
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
