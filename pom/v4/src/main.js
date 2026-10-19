import {
  engineInit, Render3DPlugin, EngineObject3D, Mesh, buildBox, vec2, vec3,
  Color, render3D, textureInfos, setCanvasFixedSize, setCanvasPixelRatio, glSetAntialias, setDebugWatermark, engineObjectsRaycast3D,
} from 'littlejsengine';
import skyBackground from '../../sky-background.png';
import meadowForeground from '../../meadow-foreground.png';
import './style.css';

const wrap = document.querySelector('#canvasWrap');
const W=8,H=6,FLOOR_DEPTH=5,GRID_DEPTH=4,DEPTH_SKEW=.42, ink='#28251f';
const mural=[['.','.','.','Y','Y','.','.','.'],['.','B','B','B','Y','Y','.','.'],['O','O','B','B','B','O','O','.'],['O','G','G','G','G','O','O','.'],['R','R','G','G','R','R','R','.'],['R','R','R','R','R','R','R','.']];
const palette={R:new Color(1,.443,.22),O:new Color(.949,.627,.353),G:new Color(.475,.651,.431),B:new Color(.333,.663,.682),Y:new Color(1,.875,.247)};
let groups=[],byCell=Array.from({length:H},()=>Array(W).fill(null)),player={x:0,y:H,z:0},selected=null,hovered=null,history=[],won=false,busy=false,viewSide=1,toastTimer,blockObjects=[],extrusionObjects=[],extrusionOutlines=[],selectionObjects=[],topObjectInfo=new Map,sideObjectInfo=new Map,playerObject,pomShadow,hoverObject,flagPole,flagCloth,backgroundObjects=[];
const box=buildBox(),flagMesh=new Mesh().addStrip([vec3(-.5,.5,0),vec3(-.5,-.5,0),vec3(.5,0,0)],vec3(0,0,1));
const colors=palette,inkColor=new Color(.157,.145,.122);
const topPalette=Object.fromEntries(Object.entries(palette).map(([key,color])=>[key,tinted(color,.035)])),sidePalette=Object.fromEntries(Object.entries(palette).map(([key,color])=>[key,shaded(color,.96)]));
function squareFace(m,map,bounds,color,normal){const [u0,u1,v0,v1]=bounds,pts=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]],center=map((u0+u1)/2,(v0+v1)/2),vertices=[center,...pts.map(([u,v])=>map(u,v))],indices=[];for(let i=1;i<=4;i++)indices.push(0,i,i===4?1:i+1);m.addTriangles(vertices,indices,normal,undefined,color);return m}
function frontTileMesh(){const m=new Mesh();squareFace(m,(x,y)=>vec3(x,y,0),[-.5,.5,-.5,.5],new Color(1),vec3(0,0,1));m.doubleSided=true;return m}
function makeFanMesh(perimeter){const points=[vec3() ,...perimeter.map(([x,y])=>vec3(x,y,0))],indices=[];for(let i=1;i<points.length;i++)indices.push(0,i,i===points.length-1?1:i+1);const mesh=new Mesh().addTriangles(points,indices,vec3(0,0,1));mesh.doubleSided=true;return mesh}
function quadraticSegment(a,c,b,steps=8){return Array.from({length:steps+1},(_,i)=>{const t=i/steps,s=1-t;return[s*s*a[0]+2*s*t*c[0]+t*t*b[0],s*s*a[1]+2*s*t*c[1]+t*t*b[1]]})}
function shadowMesh(){const m=new Mesh();for(const [rx,rz,alpha]of [[.48,.3,.08],[.37,.23,.11],[.25,.15,.14]]){const points=[vec3(0,0,0),...Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;return vec3(Math.cos(a)*rx,0,Math.sin(a)*rz)})],indices=[];for(let i=1;i<points.length;i++)indices.push(0,i,i===points.length-1?1:i+1);m.addTriangles(points,indices,vec3(0,1,0),undefined,new Color(.13,.105,.075,alpha))}m.doubleSided=true;return m}
function standingSpotMesh(){const s=viewSide*DEPTH_SKEW,P=(x,z)=>vec3(x+s*z,0,z),m=new Mesh();m.addQuad(P(-.45,-.45),P(.45,-.45),P(.45,.45),P(-.45,.45),new Color(1,.79,.2,.34));m.doubleSided=true;return m}
const pomContour=[quadraticSegment([-1,.28],[-1.02,1.15],[0,1.22]),quadraticSegment([0,1.22],[1.02,1.15],[1,.28]),quadraticSegment([1,.28],[.84,-.12],[0,-.12]),quadraticSegment([0,-.12],[-.84,-.12],[-1,.28])].flatMap((segment,index)=>index?segment.slice(1):segment).map(([x,y])=>[x*.5,y*.709-.294]).reverse();
const pomBlob=makeFanMesh(pomContour),pomEye=makeFanMesh(Array.from({length:20},(_,i)=>[Math.cos(i*Math.PI/10)*.5,Math.sin(i*Math.PI/10)*.5]));

function makeGroups(){let seen=new Set;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=mural[y][x],key=x+','+y;if(c==='.'||seen.has(key))continue;const cells=[],q=[[x,y]];seen.add(key);while(q.length){const [a,b]=q.pop();cells.push({x:a,y:b});for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=a+dx,ny=b+dy,k=nx+','+ny;if(nx>=0&&nx<W&&ny>=0&&ny<H&&mural[ny][nx]===c&&!seen.has(k)){seen.add(k);q.push([nx,ny])}}}const g={id:groups.length,color:c,cells,depth:0,objects:[]};groups.push(g);for(const p of cells)byCell[p.y][p.x]=g}}
function cellDepth(x,y){return y===H?0:(byCell[y]?.[x]?.depth??-1)}
function nodesAt(x,y){if(x< -1||x>=W||y<0||y>H)return[];if(y===H){const front=Math.max(0,cellDepth(x,H-1));return Array.from({length:Math.max(0,FLOOR_DEPTH-front)},(_,i)=>({x,y,z:front+i}))}if(x<0)return[];const d=cellDepth(x,y),above=cellDepth(x,y-1);if(d<=0)return[];return Array.from({length:Math.max(0,d-Math.max(0,above))},(_,i)=>({x,y,z:Math.max(0,above)+i}))}
function validNode(x,y,z){return nodesAt(x,y).some(n=>n.z===z)}
function nodeKey(p){return `${p.x},${p.y},${p.z}`}
function neighbors(p){const out=[];for(let dx=-2;dx<=2;dx++)for(let dy=-1;dy<=1;dy++){if(Math.abs(dx)+Math.abs(dy)>2)continue;const x=p.x+dx,y=p.y+dy;for(const n of nodesAt(x,y)){if(Math.abs(dx)+Math.abs(dy)+Math.abs(n.z-p.z)>2)continue;if(Math.abs(dx)===2&&nodesAt(p.x+Math.sign(dx),p.y).some(mid=>mid.z===p.z))continue;if(nodeKey(n)!==nodeKey(p))out.push(n)}}return out}
function findPath(target){const start=nodeKey(player),q=[player],prev=new Map([[start,null]]);while(q.length){const p=q.shift(),k=nodeKey(p);if(k===nodeKey(target)){const path=[];let at=k;while(at){const [x,y,z]=at.split(',').map(Number);path.push({x,y,z});at=prev.get(at)}return path.reverse()}for(const n of neighbors(p)){const nk=nodeKey(n);if(!prev.has(nk)){prev.set(nk,k);q.push(n)}}}return null}
function standableReachable(){const q=[player],seen=new Set([nodeKey(player)]),out=[];while(q.length){const p=q.shift();for(const n of neighbors(p)){const k=nodeKey(n);if(!seen.has(k)){seen.add(k);out.push(n);q.push(n)}}}return out.filter(p=>validNode(p.x,p.y,p.z))}
function reachableTop(target){if(findPath(target))return target;return standableReachable().filter(p=>Math.abs(p.x-target.x)+Math.abs(p.y-target.y)<=1).sort((a,b)=>(Math.abs(a.x-target.x)+Math.abs(a.y-target.y)+Math.abs(a.z-target.z))-(Math.abs(b.x-target.x)+Math.abs(b.y-target.y)+Math.abs(b.z-target.z)))[0]||target}
function canReach(g){if(player.y<H&&byCell[player.y]?.[player.x]===g&&player.z<g.depth)return false;return g.cells.some(c=>{if(player.x===c.x&&player.y===c.y+1&&player.z===g.depth)return true;const dx=player.x-c.x;if(Math.abs(dx)!==1||player.y!==c.y+1)return false;const sideDepth=cellDepth(player.x,c.y);return sideDepth<g.depth&&player.z>=Math.max(0,sideDepth)&&player.z<g.depth})}
function goalNode(){const g=byCell[0][4];return{x:4,y:0,z:Math.max(0,(g?.depth||0)-1)}}
function save(){history.push({player:{...player},depths:groups.map(g=>g.depth),selected:selected?.id??null,won});if(history.length>80)history.shift()}
function safeManipulation(g,next,dir){const old=g.depth;g.depth=next;const safe=validNode(player.x,player.y,player.z+dir);g.depth=old;return safe}

function extrusion(depth){return{x:viewSide*depth*DEPTH_SKEW,z:depth}}
function worldPoint(x,y,z){return vec3(x+viewSide*DEPTH_SKEW*z,y,z)}
function blockPose(c,depth){return{pos:worldPoint(c.x+.5,H-c.y-.5,depth)}}
function tinted(color,amount){return new Color(color.r+(1-color.r)*amount,color.g+(1-color.g)*amount,color.b+(1-color.b)*amount)}
function shaded(color,amount){return new Color(color.r*amount,color.g*amount,color.b*amount)}
function makeSurface(pos,mesh,color){const o=new EngineObject3D(pos,mesh,undefined,color);o.lighting=false;o.emissive=1;o.receiveShadow=false;o.castShadow=false;return o}
function prismMesh(cx,cy,depth,side,color,top=false,start=0){
  const m=new Mesh(),s=side*DEPTH_SKEW,lo=-.5,hi=.5,defaultFace=top?new Color(1):shaded(palette[color]||palette.R,.72);
  const P=(x,y,z)=>vec3(x+s*z,y,z);
  const quad=(a,b,c,d,face=defaultFace)=>m.addQuad(P(...a),P(...b),P(...c),P(...d),face);
  if(top){
    // One subtle texture variation per full standing spot. The screen-space
    // color contrast demarcates each tile without drawing seams on the top.
    const shade=new Color(['G','B','Y'].includes(color) ? .78 : .9),base=new Color(1);
    squareFace(m,(x,z)=>P(x,.5,z),[lo,hi,start,start+1],(cx+start)%2?shade:base,vec3(0,1,0));
  }
  else {
    squareFace(m,(x,y)=>P(x,y,depth),[lo,hi,lo,hi],defaultFace,vec3(0,0,1));
    quad([hi,lo,0],[lo,lo,0],[lo,hi,0],[hi,hi,0]);
    squareFace(m,(x,z)=>P(x,hi,z),[lo,hi,0,depth],topPalette[color],vec3(0,1,0));
    quad([lo,lo,0],[hi,lo,0],[hi,lo,depth],[lo,lo,depth]);
    const sx=side>0?lo:hi;
    squareFace(m,(y,z)=>P(sx,y,z),[lo,hi,0,depth],sidePalette[color],vec3(side,0,0));
    const ox=side>0?hi:lo;
    quad([ox,lo,depth],[ox,lo,0],[ox,hi,0],[ox,hi,depth]);
  }
  m.doubleSided=true;return m;
}
function rebuildBlockMeshes(){for(const o of blockObjects)o.destroy();blockObjects=[];for(const g of groups){g.objects=[];for(const c of g.cells){const p=vec3(c.x+.5,H-c.y-.5,0),o=makeSurface(p,frontTileMesh(),colors[g.color]);g.objects.push(o);blockObjects.push(o)}}syncBlocks()}
function syncExtrusions(){for(const o of [...extrusionObjects,...extrusionOutlines,...selectionObjects])o.destroy();extrusionObjects=[];extrusionOutlines=[];selectionObjects=[];topObjectInfo.clear();sideObjectInfo.clear();
  for(const g of groups)if(g.depth)for(const c of g.cells){
    const base=vec3(c.x+.5,H-c.y-.5,0),front=worldPoint(base.x,base.y,g.depth).add(vec3(0,0,.025)),dark=makeSurface(base,prismMesh(c.x,c.y,g.depth,viewSide,g.color,false),new Color(1));
    extrusionOutlines.push(dark);sideObjectInfo.set(dark,g);
    const frontFace=makeSurface(front,frontTileMesh(),selected===g?tinted(colors[g.color],.12):colors[g.color]);extrusionObjects.push(frontFace);topObjectInfo.set(frontFace,{x:c.x,y:c.y,z:g.depth-1});sideObjectInfo.set(frontFace,g);
    for(let z=0;z<g.depth;z++){const top=makeSurface(base.add(vec3(0,.003,0)),prismMesh(c.x,c.y,1,viewSide,g.color,true,z),colors[g.color]);top.scale3D=vec3(1,1,1);topObjectInfo.set(top,{x:c.x,y:c.y,z});extrusionObjects.push(top)}
  }
  if(selected)for(const c of selected.cells){const pos=worldPoint(c.x+.5,H-c.y-.5,selected.depth+.055);selectionObjects.push(makeSurface(pos,frontTileMesh(),new Color(1,.79,.2,.38)));selectionObjects.at(-1).transparent=true}
}
function drawMapOutlines(){
  const height=wrap.clientHeight,stroke=1.5*render3D.camera.orthographic/height,bias=render3D.camera.getForward().scale(-.026),seen=new Set,glowing=new Set;
  const pointKey=p=>`${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
  let drawingGroup=null;
  const edge=(a,b)=>{const ka=pointKey(a),kb=pointKey(b),key=ka<kb?`${ka}|${kb}`:`${kb}|${ka}`,aa=a.add(bias),bb=b.add(bias);if(drawingGroup===selected&&!glowing.has(key)){glowing.add(key);render3D.drawLine(aa,bb,10*render3D.camera.orthographic/height,new Color(1,.78,.12,.18));render3D.drawLine(aa,bb,5*render3D.camera.orthographic/height,new Color(1,.78,.12,.5));render3D.drawLine(aa,bb,2*render3D.camera.orthographic/height,new Color(1,.87,.28,.98))}if(seen.has(key))return;seen.add(key);if(drawingGroup!==selected)render3D.drawLine(aa,bb,stroke,inkColor)};
  const sameBlock=(g,x,y)=>byCell[y]?.[x]===g;
  for(const g of groups){drawingGroup=g;for(const c of g.cells){
    const x0=c.x,x1=c.x+1,y1=H-c.y,y0=y1-1,d=g.depth;
    if(!d){const z=.028;
      if(!sameBlock(g,c.x,c.y+1))edge(vec3(x0,y0,z),vec3(x1,y0,z));
      if(!sameBlock(g,c.x+1,c.y))edge(vec3(x1,y0,z),vec3(x1,y1,z));
      if(!sameBlock(g,c.x,c.y-1))edge(vec3(x1,y1,z),vec3(x0,y1,z));
      if(!sameBlock(g,c.x-1,c.y))edge(vec3(x0,y1,z),vec3(x0,y0,z));
      continue}
    const side=viewSide,skew=side*DEPTH_SKEW,P=(x,y,z)=>vec3(x+skew*z,y,z),frontZ=d+.04;
    if(!sameBlock(g,c.x,c.y+1))edge(P(x0,y0,frontZ),P(x1,y0,frontZ));
    if(!sameBlock(g,c.x+1,c.y))edge(P(x1,y0,frontZ),P(x1,y1,frontZ));
    if(!sameBlock(g,c.x,c.y-1))edge(P(x1,y1,frontZ),P(x0,y1,frontZ));
    if(!sameBlock(g,c.x-1,c.y))edge(P(x0,y1,frontZ),P(x0,y0,frontZ));
    // The selected piece gets one glowing outline around its top footprint;
    // per-spot distinctions remain color-only.
    if(g===selected)for(let z=0;z<d;z++){
      const topY=y1+.006,ld=byCell[c.y]?.[c.x-1]?.depth??-1,rd=byCell[c.y]?.[c.x+1]?.depth??-1;
      if(ld<d)edge(P(x0,topY,z),P(x0,topY,z+1));
      if(rd<d)edge(P(x1,topY,z+1),P(x1,topY,z));
      if(z===0)edge(P(x1,topY,z),P(x0,topY,z));
      if(z===d-1)edge(P(x0,topY,z+1),P(x1,topY,z+1));
    }
    const nx=side>0?c.x-1:c.x+1;
    if((byCell[c.y]?.[nx]?.depth??-1)<d){const sx=side>0?x0+.016:x1-.016;for(let z=0;z<d;z++){if(z===0)edge(P(sx,y0,z),P(sx,y1,z));if(z===d-1)edge(P(sx,y1,z+1),P(sx,y0,z+1))}}
  }}
}
function syncFloorGrid(){
  const o=backgroundObjects[backgroundObjects.length-1];if(!o)return;
  const m=new Mesh(),width=wrap.clientWidth,height=wrap.clientHeight,ortho=render3D.camera.orthographic,aspect=width/height,worldWidth=ortho*aspect,line=1.5*ortho/height,gridColor=new Color(1,1,1,.55),floorWash=new Color(1,1,1,.16),size=vec2(width,height);
  render3D.updateMatrices(aspect);
  const toPlane=p=>{const q=render3D.worldToScreen(p,size);return vec2((q.x/width-.5)*worldWidth,(.5-q.y/height)*ortho)};
  const addLine=(a,b)=>{const p=toPlane(a),q=toPlane(b),dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy)||1,nx=-dy/length*line/2,ny=dx/length*line/2;m.addQuad(vec3(p.x+nx,p.y+ny,0),vec3(q.x+nx,q.y+ny,0),vec3(q.x-nx,q.y-ny,0),vec3(p.x-nx,p.y-ny,0),gridColor)};
  const horizon=render3D.worldToScreen(vec3(4,0,0),size),hy=(.5-horizon.y/height)*ortho;
  // Wash the entire scenery below the horizon; the puzzle remains in front
  // because this camera-facing layer sits behind the playfield geometry.
  m.addQuad(vec3(-worldWidth/2,hy,0),vec3(worldWidth/2,hy,0),vec3(worldWidth/2,-ortho/2,0),vec3(-worldWidth/2,-ortho/2,0),new Color(1,1,1,.30));
  const side=viewSide,s=side*DEPTH_SKEW,ground=.035,left=-1,right=W;
  const wash=[toPlane(vec3(left,ground,.025)),toPlane(vec3(right,ground,.025)),toPlane(vec3(right+s*GRID_DEPTH,ground,GRID_DEPTH+.025)),toPlane(vec3(left+s*GRID_DEPTH,ground,GRID_DEPTH+.025))];m.addQuad(...wash.map(p=>vec3(p.x,p.y,0)),floorWash);
  for(let x=left;x<=right;x++)addLine(vec3(x,ground,.025),vec3(x+s*GRID_DEPTH,ground,GRID_DEPTH+.025));
  for(let z=0;z<=GRID_DEPTH;z++)addLine(vec3(left+s*(z+.025),ground,z+.025),vec3(right+s*(z+.025),ground,z+.025));
  const thickness=1.5*ortho/height;
  m.addQuad(vec3(-worldWidth/2,hy+thickness/2,0),vec3(worldWidth/2,hy+thickness/2,0),vec3(worldWidth/2,hy-thickness/2,0),vec3(-worldWidth/2,hy-thickness/2,0),inkColor);
  m.doubleSided=true;o.setMesh(m);o.pos3D=render3D.camera.pos.add(render3D.camera.getForward().scale(89.4));o.rotation3D=render3D.camera.rotation.copy();o.size3D=vec3(worldWidth,ortho,.1);o.color=new Color(1);o.lighting=false;o.transparent=true;
}
function syncBlocks(){for(const g of groups)for(let i=0;i<g.cells.length;i++){const c=g.cells[i],o=g.objects[i],pose=blockPose(c,g.depth),face=selected===g?tinted(colors[g.color],.12):colors[g.color];o.pos3D=vec3(pose.pos.x,pose.pos.y,pose.pos.z+.025);o.color=face}syncExtrusions();syncFloorGrid()}
function worldPosition(n,offset=.5){const top=n.y===H?0:H-n.y;return worldPoint(n.x+.5,top+.22,n.z+offset)}
function syncBackground(){const width=wrap.clientWidth,height=wrap.clientHeight,ratio=width/height,cam=render3D.camera,forward=cam.getForward(),up=cam.getUp(),right=cam.getRight(),ortho=cam.orthographic,worldWidth=ortho*ratio;
  render3D.updateMatrices(ratio);const base=render3D.worldToScreen(vec3(4,0,0),vec2(width,height)),groundQ=base?(height/2-base.y)*ortho/height:-ortho*.28;if(base)wrap.style.setProperty('--horizon-y',`${Math.max(0,Math.min(100,base.y/height*100))}%`);
  const place=(o,distance,x,y,w,h)=>{o.pos3D=cam.pos.add(forward.scale(distance)).add(right.scale(x)).add(up.scale(y));o.scale3D=vec3(w,h,.012)};
  const sky=backgroundObjects[0],meadow=backgroundObjects[1],skyH=ortho*1.15;place(sky,90,0,-ortho/2+skyH/2,skyH*3,skyH);place(meadow,89.7,0,-ortho/2+worldWidth/6+worldWidth*.05,worldWidth,worldWidth/3+worldWidth*.1);meadow.color=new Color(1,1,1,.8);
}
function syncPlayer(){const p=worldPosition(player),top=player.y===H?0:H-player.y;playerObject.pos3D=p;playerObject.rotation3D=render3D.camera.rotation.copy();if(pomShadow)pomShadow.pos3D=worldPoint(player.x+.5,top+.018,player.z+.5)}
function syncFlag(){if(!flagPole||!byCell[0][4])return;const depth=byCell[0][4].depth,d=extrusion(depth),x=4.5+d.x;if(!depth){flagPole.scale3D=vec3(.04,.27,.04);flagCloth.scale3D=vec3(.205,.13,.035);flagPole.pos3D=vec3(x,5.585,.08);flagCloth.pos3D=vec3(x+.105,5.665,.09)}else{flagPole.scale3D=vec3(.05,.68,.05);flagCloth.scale3D=vec3(.38,.24,.045);flagPole.pos3D=vec3(x,6.78,depth+.07);flagCloth.pos3D=vec3(x+.19,6.95,depth+.08)}}
function updateUI(){document.querySelector('#pull').disabled=busy||won||!selected||!canReach(selected)||selected.depth>=3||!safeManipulation(selected,selected.depth+1,1);document.querySelector('#push').disabled=busy||won||!selected||!canReach(selected)||selected.depth<=0||!safeManipulation(selected,selected.depth-1,-1);document.querySelector('#undo').disabled=busy||!history.length;document.querySelector('#reset').disabled=busy;document.querySelector('#selectionHelp').textContent=selected?(canReach(selected)?`Selected ${selected.color} piece · ${selected.depth} step${selected.depth===1?'':'s'} out`:'Move Pom beside this piece to pull or push it.'):'Click a block to select it, or a ledge to move Pom.';document.querySelector('#turnLeft').setAttribute('aria-pressed',String(viewSide<0));document.querySelector('#turnRight').setAttribute('aria-pressed',String(viewSide>0));syncBlocks();syncPlayer();syncFlag()}
function say(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('on'),1500)}
function fitCamera(width,height){const unit=Math.max(28,Math.min(62,Math.min((width-80)/(W+1.5),(height-80)/(H+1.8))));return height/unit}
function positionCameraForView(side){
  // v1 moved the wall origin by two depth steps when turning left. Moving
  // the camera target shifts the entire board, including the flat wall.
  const wallShift=side<0?2*DEPTH_SKEW:0;
  render3D.camera.orbit(vec3(3.8-wallShift,3.1,1),15,0,.53);
}
function gameInit(){
  const bounds=wrap.getBoundingClientRect();setCanvasFixedSize(vec2(Math.max(1,bounds.width),Math.max(1,bounds.height)));
  setDebugWatermark(false);new Render3DPlugin();
  render3D.onRenderTransparent=drawMapOutlines;
  render3D.sunDirection=vec3(-.45,.8,.5);render3D.sunColor=new Color(1,.91,.75);render3D.ambientColor=new Color(.52,.51,.4);render3D.ambientGroundColor=new Color(.35,.4,.3);
  render3D.camera.orthographic=fitCamera(bounds.width,bounds.height);positionCameraForView(viewSide);
  // Keep the horizon on the wall's base line; pulled pieces then extend down
  // toward Pom in the camera projection without moving the scenery.
  render3D.updateMatrices(bounds.width/bounds.height);
  const makeBackdrop=(texture,color)=>{const o=new EngineObject3D(vec3(),box,texture,color);o.rotation3D=render3D.camera.rotation.copy();o.lighting=false;o.receiveShadow=false;o.castShadow=false;o.emissive=1;o.transparent=texture===textureInfos[1];backgroundObjects.push(o);return o};
  makeBackdrop(textureInfos[0],new Color(1));makeBackdrop(textureInfos[1],new Color(1));
  makeBackdrop(undefined,new Color(1));syncFloorGrid();
  syncBackground();
  makeGroups();rebuildBlockMeshes();
  pomShadow=new EngineObject3D(vec3(.5,.018,.5),shadowMesh(),undefined,new Color(1));pomShadow.lighting=false;pomShadow.transparent=true;pomShadow.castShadow=false;pomShadow.receiveShadow=false;
  hoverObject=makeSurface(vec3(0,-100,0),standingSpotMesh(),new Color(1,.79,.2,0));hoverObject.transparent=true;
  playerObject=new EngineObject3D(vec3(.5,.2,.14),pomBlob,undefined,inkColor);playerObject.scale3D=vec3(.72,.56,.018);playerObject.rotation3D=render3D.camera.rotation.copy();playerObject.lighting=false;playerObject.softShadow=0;
  const pomBody=new EngineObject3D(vec3(0,0,1),pomBlob,undefined,new Color(.97,.22,.16));pomBody.scale3D=vec3(.88,.88,1);pomBody.lighting=false;playerObject.addChild(pomBody);
  for(const x of [-.17,.17]){const white=new EngineObject3D(vec3(x,.19,2),pomEye,undefined,new Color(1,.95,.83)),black=new EngineObject3D(vec3(x,.19,2.2),pomEye,undefined,new Color(.12,.1,.09));white.scale3D=vec3(.2,.26,1);black.scale3D=vec3(.085,.13,1);white.lighting=false;black.lighting=false;playerObject.addChild(white);playerObject.addChild(black)}
  flagPole=new EngineObject3D(vec3(4.5,5.57,.08),buildBox(),undefined,new Color(.16,.15,.12));flagPole.scale3D=vec3(.035,.24,.035);
  flagCloth=new EngineObject3D(vec3(4.59,5.64,.09),flagMesh,undefined,new Color(1,.443,.22));flagCloth.scale3D=vec3(.17,.105,.035);flagCloth.lighting=false;
  updateUI();
}
function gameUpdate(){
}
function moveTo(p){if(won||busy)return;const path=findPath(p);if(!path||path.length<2){say('That ledge is out of reach. Pull a block out to make a step.');return}save();busy=true;updateUI();let index=1;function edge(now,from=player,to=path[index],start=now){const duration=to.y!==from.y||Math.abs(to.x-from.x)>1?260:175,t=Math.min(1,(now-start)/duration),smooth=t*t*(3-2*t),a=worldPosition(from),b=worldPosition(to),jump=(to.y!==from.y||Math.abs(to.x-from.x)>1)?Math.sin(Math.PI*t)*.28:0,x=a.x+(b.x-a.x)*smooth,y=a.y+(b.y-a.y)*smooth+jump,z=a.z+(b.z-a.z)*smooth;playerObject.pos3D=vec3(x,y,z);const fromTop=from.y===H?0:H-from.y,toTop=to.y===H?0:H-to.y;if(pomShadow)pomShadow.pos3D=worldPoint(x-viewSide*DEPTH_SKEW*z,(fromTop+(toTop-fromTop)*smooth)+.018,z);if(t<1){requestAnimationFrame(n=>edge(n,from,to,start));return}player={...to};if(index<path.length-1){index++;requestAnimationFrame(n=>edge(n,player,path[index],n));return}busy=false;if(nodeKey(player)===nodeKey(goalNode())){won=true;say('Pom made it to the flag!')}else say('Pom made it to that ledge.');updateUI()}requestAnimationFrame(now=>edge(now))}
function pointOnFloor(ray){if(Math.abs(ray.direction.y)<1e-6)return null;const t=(0-ray.origin.y)/ray.direction.y;if(t<0)return null;return ray.getPosition(t)}
function standableAt(ray){let best=null,bestD=Infinity;if(Math.abs(ray.direction.y)>1e-6)for(const p of standableReachable().filter(p=>p.y<H)){const h=H-p.y,z=p.z+.5,x=p.x+.5+viewSide*DEPTH_SKEW*(p.z+.5),t=(h-ray.origin.y)/ray.direction.y;if(t<0)continue;const q=ray.getPosition(t),d=Math.hypot(q.x-x,q.z-z);if(d<bestD&&d<.72){best=p;bestD=d}}if(best)return best;const floor=pointOnFloor(ray);if(floor){const p=standableReachable().filter(n=>n.y===H).sort((a,b)=>{const pa=worldPosition(a,.5),pb=worldPosition(b,.5);return Math.hypot(pa.x-floor.x,pa.z-floor.z)-Math.hypot(pb.x-floor.x,pb.z-floor.z)})[0];if(p){const q=worldPosition(p,.5);if(Math.hypot(q.x-floor.x,q.z-floor.z)<.9)return p}}return null}
function updateHover(e){if(!hoverObject)return;const rect=wrap.getBoundingClientRect(),ray=render3D.screenToRay(vec2(e.clientX-rect.left,e.clientY-rect.top),vec2(rect.width,rect.height)),p=standableAt(ray);hovered=p;if(!p){hoverObject.color=new Color(1,.79,.2,0);return}const top=p.y===H?0:H-p.y;hoverObject.pos3D=worldPoint(p.x+.5,top+.025,p.z+.5);hoverObject.color=new Color(1,.79,.2,.34)}
function clickBoard(e){if(busy)return;const rect=wrap.getBoundingClientRect(),ray=render3D.screenToRay(vec2(e.clientX-rect.left,e.clientY-rect.top),vec2(rect.width,rect.height));
  // Resolve visible, walkable cube tops before wall faces. The wall can be
  // nearer along the ray even when the pointer is visually on a platform top.
  let best=null,bestD=Infinity;for(const p of standableReachable().filter(p=>p.y<H)){const h=H-p.y,z=p.z+.5,x=p.x+.5+viewSide*DEPTH_SKEW*(p.z+.5);if(Math.abs(ray.direction.y)<1e-6)continue;const t=(h-ray.origin.y)/ray.direction.y;if(t<0)continue;const q=ray.getPosition(t),d=Math.hypot(q.x-x,q.z-z);if(d<bestD&&d<.72){best=p;bestD=d}}if(best){moveTo(best);return}
  const hits=engineObjectsRaycast3D(ray),hit=hits.find(o=>blockObjects.includes(o)||topObjectInfo.has(o)||sideObjectInfo.has(o));if(hit){const top=topObjectInfo.get(hit);if(top){moveTo(reachableTop(top));return}const g=sideObjectInfo.get(hit)||groups.find(g=>g.objects.includes(hit));if(g){selected=g;updateUI();if(canReach(g))say('Piece selected. Pull it out one step.');else say('Move Pom to the front edge to reach this piece.');return}}
  // Match a visible point on the floor plane to the nearest reachable step.
  const floor=pointOnFloor(ray);if(floor){const candidates=standableReachable().filter(p=>p.y===H);const p=candidates.sort((a,b)=>{const pa=worldPosition(a,.5),pb=worldPosition(b,.5);return Math.hypot(pa.x-floor.x,pa.z-floor.z)-Math.hypot(pb.x-floor.x,pb.z-floor.z)})[0];if(p){const q=worldPosition(p,.5);if(Math.hypot(q.x-floor.x,q.z-floor.z)<1.15)moveTo(p)}}
}
function manipulate(dir){const g=selected;if(!g||!canReach(g)||won)return;const next=g.depth+dir;if(next<0||next>3)return;const dest={...player,z:player.z+dir};if(!safeManipulation(g,next,dir)){say('Pom has no safe step to move with this piece.');return}save();g.depth=next;player=dest;updateUI();say(dir>0?'Pulled one step out.':'Pushed one step back.')}
function restore(s){groups.forEach((g,i)=>g.depth=s.depths[i]);player={...s.player};selected=groups.find(g=>g.id===s.selected)||null;won=s.won;updateUI()}
function rotate(side){viewSide=side;positionCameraForView(side);render3D.updateMatrices(wrap.clientWidth/wrap.clientHeight);playerObject.rotation3D=render3D.camera.rotation.copy();syncBackground();updateUI();document.querySelector('#turnLeft').setAttribute('aria-pressed',String(side<0));document.querySelector('#turnRight').setAttribute('aria-pressed',String(side>0))}
wrap.addEventListener('pointermove',updateHover);wrap.addEventListener('pointerleave',()=>{hovered=null;if(hoverObject)hoverObject.color=new Color(1,.79,.2,0)});wrap.addEventListener('pointerdown',clickBoard);document.querySelector('#pull').onclick=()=>manipulate(1);document.querySelector('#push').onclick=()=>manipulate(-1);document.querySelector('#turnLeft').onclick=()=>rotate(-1);document.querySelector('#turnRight').onclick=()=>rotate(1);
document.querySelector('#undo').onclick=()=>busy?null:history.length?restore(history.pop()):say('Nothing to undo yet.');document.querySelector('#reset').onclick=()=>{if(busy)return;groups.forEach(g=>g.depth=0);player={x:0,y:H,z:0};selected=null;history=[];won=false;updateUI();say('Puzzle reset.')};
window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='z'){if(history.length)restore(history.pop())}if(e.key.toLowerCase()==='r')document.querySelector('#reset').click();if(e.key==='ArrowLeft')rotate(-1);if(e.key==='ArrowRight')rotate(1)});
setCanvasPixelRatio(Math.min(window.devicePixelRatio||1,2));
glSetAntialias(true);
await engineInit(gameInit,gameUpdate,undefined,undefined,undefined,[skyBackground,meadowForeground],wrap);
new ResizeObserver(()=>{const r=wrap.getBoundingClientRect();setCanvasFixedSize(vec2(Math.max(1,r.width),Math.max(1,r.height)));if(backgroundObjects.length){render3D.camera.orthographic=fitCamera(r.width,r.height);render3D.updateMatrices(r.width/r.height);syncBackground();syncFloorGrid()}}).observe(wrap);
