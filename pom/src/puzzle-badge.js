import {Mesh,vec3} from 'littlejsengine';

export function createPuzzleBadgeMesh(){
  const half=.56/2,mesh=new Mesh().addQuad(vec3(-half,half,0),vec3(-half,-half,0),vec3(half,-half,0),vec3(half,half,0));
  mesh.doubleSided=true;return mesh;
}

export function drawPuzzleBadgeFrame(context){
  context.beginPath();context.roundRect(18,18,220,220,40);context.fillStyle='#33263b';context.fill();
  context.beginPath();context.roundRect(28,28,200,200,32);context.fillStyle='#fff3d0';context.fill();
}
