import {Color,EngineObject3D,TextureInfo,vec3} from 'littlejsengine';
import {createPuzzleBadgeMesh,drawPuzzleBadgeFrame} from './puzzle-badge.js';

const badgeMesh=createPuzzleBadgeMesh();
const colorKey=rgb=>rgb.join(',');

function badgeTexture(rgb){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const context=canvas.getContext('2d');
  drawPuzzleBadgeFrame(context);
  context.beginPath();context.moveTo(128,179.5);context.arcTo(179,88.5,166,88.5,10);context.arcTo(77,88.5,84,101.5,10);context.arcTo(128,179.5,136,166.5,10);context.closePath();
  context.fillStyle=`rgb(${rgb.join(' ')})`;context.fill();
  return new TextureInfo(canvas,true,false,false);
}

export function createPulloutSwitchAssets(){
  const textures=new Map;
  return {
    createBadge(rgb){
      const key=colorKey(rgb);if(!textures.has(key))textures.set(key,badgeTexture(rgb));
      const badge=new EngineObject3D(vec3(),badgeMesh,textures.get(key),new Color(1));
      badge.lighting=false;badge.emissive=1;badge.castShadow=false;badge.receiveShadow=false;badge.transparent=true;
      return badge;
    },
  };
}