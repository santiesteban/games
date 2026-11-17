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
  // Very light switch colors otherwise disappear against the cream badge.
  const linear=channel=>{const value=channel/255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4};
  const luminance=.2126*linear(rgb[0])+.7152*linear(rgb[1])+.0722*linear(rgb[2]);
  if(luminance>.55){context.strokeStyle='#33263b';context.lineWidth=6;context.lineJoin='round';context.stroke()}
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
