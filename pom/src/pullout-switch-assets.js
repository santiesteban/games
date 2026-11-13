import {Color,EngineObject3D,Mesh,TextureInfo,vec3} from 'littlejsengine';

const BADGE_SIZE=.56;
const badgeMesh=(()=>{
  const half=BADGE_SIZE/2,mesh=new Mesh().addQuad(vec3(-half,half,0),vec3(-half,-half,0),vec3(half,-half,0),vec3(half,half,0));
  mesh.doubleSided=true;return mesh;
})();
const colorKey=rgb=>rgb.join(',');

function badgeTexture(rgb){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const context=canvas.getContext('2d');context.translate(128,128);context.scale(256/BADGE_SIZE,-256/BADGE_SIZE);
  context.beginPath();context.roundRect(-.26,-.26,.52,.52,.075);context.fillStyle='#33263b';context.fill();
  context.beginPath();context.roundRect(-.235,-.235,.47,.47,.055);context.fillStyle='#fff3d0';context.fill();
  context.beginPath();context.moveTo(-.15,.095);context.lineTo(.15,.095);context.lineTo(0,-.165);context.closePath();
  context.fillStyle=`rgb(${rgb.join(' ')})`;context.fill();
  return new TextureInfo(canvas,true,false,false);
}

export function createPulloutSwitchAssets(){
  const textures=new Map;
  return {
    createBadge(rgb){
      const key=colorKey(rgb);if(!textures.has(key))textures.set(key,badgeTexture(rgb));
      const badge=new EngineObject3D(vec3(),badgeMesh,textures.get(key),new Color(1));
      badge.lighting=false;badge.emissive=1;badge.castShadow=false;badge.receiveShadow=false;
      return badge;
    },
  };
}