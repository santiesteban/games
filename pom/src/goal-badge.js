import { Color, Mesh, TextureInfo, vec2, vec3 } from 'littlejsengine';

// Paint the frame and flag together: almost-coplanar glyph meshes fight for
// depth precision in perspective. Only the shallow outside edge is geometry.
export function createGoalBadge(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const context=canvas.getContext('2d'),span=.56;
  context.translate(128,128);context.scale(256/span,-256/span);
  const rounded=(half,radius,color)=>{
    context.beginPath();context.roundRect(-half,-half,half*2,half*2,radius);
    context.fillStyle=color;context.fill();
  };
  const gold=context.createLinearGradient(-.2,.24,.18,-.24);
  for(const [stop,color]of [[0,'#fff0a0'],[.3,'#edc85f'],[.65,'#d8a234'],[.85,'#f2d174'],[1,'#c38d24']])gold.addColorStop(stop,color);
  rounded(.26,.075,'#514020');
  rounded(.235,.055,gold);
  context.beginPath();context.moveTo(-.17,.195);context.lineTo(.13,.195);
  context.strokeStyle='rgba(255,255,225,.65)';context.lineWidth=.014;context.lineCap='round';context.stroke();
  context.fillStyle='#403522';context.fillRect(-.12,-.14,.04,.28);
  context.beginPath();context.moveTo(-.08,.14);context.lineTo(-.08,.01);context.lineTo(.125,.075);context.closePath();
  context.fillStyle='#ff7138';context.fill();
  const half=span/2,mesh=new Mesh().addQuad(vec3(-half,half,0),vec3(-half,-half,0),vec3(half,-half,0),vec3(half,half,0));
  const corners=[[.185,.185,0],[-.185,.185,Math.PI/2],[-.185,-.185,Math.PI],[.185,-.185,Math.PI*1.5]];
  const perimeter=corners.flatMap(([x,y,angle])=>Array.from({length:7},(_,i)=>vec3(x+.075*Math.cos(angle+i*Math.PI/12),y+.075*Math.sin(angle+i*Math.PI/12),0)));
  const edgeUV=Array.from({length:4},()=>vec2(.5,.15));
  for(let i=0;i<perimeter.length;i++){
    const a=perimeter[i],b=perimeter[(i+1)%perimeter.length],shade=(a.y+b.y)>0?.7:.45;
    mesh.addQuad(a,b,b.add(vec3(0,0,-.04)),a.add(vec3(0,0,-.04)),new Color(shade,shade*.85,shade*.65),edgeUV);
  }
  mesh.doubleSided=true;
  return {mesh,texture:new TextureInfo(canvas,true,false,false)};
}
