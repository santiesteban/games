import {
  engineInit, Render3DPlugin, EngineObject3D, Mesh, buildBox, vec2, vec3,
  Color, render3D, textureInfos, setCanvasFixedSize, setCanvasPixelRatio, glSetAntialias, setDebugWatermark, setLoadingScreen, engineObjectsRaycast3D,
} from 'littlejsengine';
import levelData from './data/levels.json';
import skyBackground from '../../sky-background.png';
import meadowForeground from '../../meadow-foreground.png';
import './style.css';

const wrap = document.querySelector('#canvasWrap');
let viewUnit=0,viewTarget,viewReady=false,viewMobile=false,viewTouched=false,introFrame=0,viewWidth=0,viewHeight=0;
const boardPointers=new Map();let boardGesture=null;
const pageUrl=new URL(location.href);if(pageUrl.searchParams.has('style')){pageUrl.searchParams.delete('style');window.history.replaceState(null,'',pageUrl)}
const svgNS='http://www.w3.org/2000/svg';
const irisSvg=document.createElementNS(svgNS,'svg');irisSvg.setAttribute('class','victory-iris');irisSvg.setAttribute('aria-hidden','true');
const irisShade=document.createElementNS(svgNS,'path'),irisRing=document.createElementNS(svgNS,'circle');
// Cut a transparent opening directly into the opaque shade.
irisShade.setAttribute('fill','#28251f');irisShade.setAttribute('fill-rule','evenodd');irisRing.setAttribute('fill','none');irisRing.setAttribute('stroke','#fff0d8');irisRing.setAttribute('stroke-width','3');irisSvg.append(irisShade,irisRing);wrap.append(irisSvg);
const FLOOR_DEPTH=4,GRID_DEPTH=4,DEPTH_SKEW=.16,VIEW_PITCH=.38, ink='#28251f';
const levels=levelData.map(level=>({...level,height:level.grid.length,width:level.grid[0].length}));
let activeLevel=levels.find(level=>level.id===19),W=activeLevel.width,H=activeLevel.height,mural=activeLevel.grid.map(row=>[...row]),goalCell={...activeLevel.goal};
const palette={R:new Color(1,.443,.22),O:new Color(.949,.627,.353),G:new Color(.475,.651,.431),B:new Color(.333,.663,.682),Y:new Color(1,.875,.247)};
let groups=[],byCell=Array.from({length:H},()=>Array(W).fill(null)),player={x:activeLevel.start.x,y:H,z:activeLevel.start.z},selected=null,hovered=null,history=[],won=false,busy=false,falling=false,viewSide=1,toastTimer,blockObjects=[],extrusionObjects=[],extrusionOutlines=[],topObjectInfo=new Map,sideObjectInfo=new Map,playerObject,pomParts=[],pomShadow,hoverObject,flagPole,flagCloth,umbrellaCanopy,umbrellaHandle,umbrellaPanels=[],pomEyes=[],sweatDrops=[],effortFrame=0,backgroundObjects=[],celebration=null,baseCameraHeight=0,gameReady=false;
const box=buildBox(),flagMesh=new Mesh().addStrip([vec3(-.5,.5,0),vec3(-.5,-.5,0),vec3(.5,0,0)],vec3(0,0,1));
const colors=palette,inkColor=new Color(.157,.145,.122);
const topPalette=Object.fromEntries(Object.entries(palette).map(([key,color])=>[key,tinted(color,.035)])),sidePalette=Object.fromEntries(Object.entries(palette).map(([key,color])=>[key,shaded(color,.96)]));
function squareFace(m,map,bounds,color,normal){const [u0,u1,v0,v1]=bounds,pts=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]],center=map((u0+u1)/2,(v0+v1)/2),vertices=[center,...pts.map(([u,v])=>map(u,v))],indices=[];for(let i=1;i<=4;i++)indices.push(0,i,i===4?1:i+1);m.addTriangles(vertices,indices,normal,undefined,color);return m}
function frontTileMesh(){const m=new Mesh();squareFace(m,(x,y)=>vec3(x,y,0),[-.5,.5,-.5,.5],new Color(1),vec3(0,0,1));m.doubleSided=true;return m}
function makeFanMesh(perimeter){const points=[vec3() ,...perimeter.map(([x,y])=>vec3(x,y,0))],indices=[];for(let i=1;i<points.length;i++)indices.push(0,i,i===points.length-1?1:i+1);const mesh=new Mesh().addTriangles(points,indices,vec3(0,0,1));mesh.doubleSided=true;return mesh}
function makeSectorMesh(center,perimeter){const points=[vec3(center[0],center[1],0),...perimeter.map(([x,y])=>vec3(x,y,0))],indices=[];for(let i=1;i<points.length;i++)indices.push(0,i,i===points.length-1?1:i+1);const mesh=new Mesh().addTriangles(points,indices,vec3(0,0,1));mesh.doubleSided=true;return mesh}
function quadraticSegment(a,c,b,steps=8){return Array.from({length:steps+1},(_,i)=>{const t=i/steps,s=1-t;return[s*s*a[0]+2*s*t*c[0]+t*t*b[0],s*s*a[1]+2*s*t*c[1]+t*t*b[1]]})}
function standingSpotMesh(){
  const skew=viewSide*DEPTH_SKEW,points=[],half=.31,radius=.09,m=new Mesh();
  for(const [x,z,start] of [[half-radius,half-radius,0],[-half+radius,half-radius,Math.PI/2],[-half+radius,-half+radius,Math.PI],[half-radius,-half+radius,Math.PI*1.5]])for(let i=0;i<=8;i++){const a=start+i*Math.PI/16,xx=x+radius*Math.cos(a),zz=z+radius*Math.sin(a);points.push(vec3(xx+skew*zz,0,zz))}
  const vertices=[vec3(),...points],indices=[];for(let i=1;i<vertices.length;i++)indices.push(0,i,i===vertices.length-1?1:i+1);m.addTriangles(vertices,indices,vec3(0,1,0),undefined,new Color(1,1,1));m.doubleSided=true;return m;
}
function standingSpotCenter(p){const ground=p.y===H,top=ground?0:H-p.y;return worldPoint(p.x+.5,top+(ground?.005:.006),p.z+.5+(ground?.025:0))}
function syncHoverSpot(){if(!hoverObject)return;hoverObject.setMesh(standingSpotMesh());if(hovered)hoverObject.pos3D=standingSpotCenter(hovered)}
function setUmbrellaVisible(show){if(umbrellaCanopy)umbrellaCanopy.color=new Color(.15,.2,.27,show?1:0);if(umbrellaHandle)umbrellaHandle.color=new Color(.15,.2,.27,show?1:0);for(let i=0;i<umbrellaPanels.length;i++){const color=i%2?new Color(.64,.83,.97):new Color(.98,.99,.96);color.a=show?1:0;umbrellaPanels[i].color=color}}
function positionUmbrella(t=0){const sway=Math.sin(t*Math.PI*2)*.06,y=.84+Math.sin(t*Math.PI*4)*.025;if(umbrellaCanopy)umbrellaCanopy.pos3D=vec3(sway,y,3);if(umbrellaHandle)umbrellaHandle.pos3D=vec3(sway,y,2.96);for(const panel of umbrellaPanels)panel.pos3D=vec3(sway,y,3.035)}
function animateEffort(){
  const frame=++effortFrame,start=performance.now(),duration=440;
  function tick(now){
    if(frame!==effortFrame)return;const elapsed=now-start,t=Math.min(1,elapsed/duration),effort=Math.sin(Math.PI*t);
    playerObject.scale3D=vec3(.72*(1+.025*effort),.56*(1-.04*effort),.018);
    for(let i=0;i<sweatDrops.length;i++){const drop=sweatDrops[i],q=Math.max(0,Math.min(1,(elapsed-i*65)/340)),alpha=Math.sin(Math.PI*q);drop.outline.pos3D=vec3(.48+i*.17+q*.16,.65-i*.20-q*.12,2.8);drop.outline.color=new Color(.157,.145,.122,alpha);drop.fill.color=new Color(.64,.83,.97,alpha)}
    if(t<1)requestAnimationFrame(tick);else{playerObject.scale3D=vec3(.72,.56,.018);for(const drop of sweatDrops){drop.outline.color.a=0;drop.fill.color.a=0}}
  }
  requestAnimationFrame(tick);
}
const pomContour=[quadraticSegment([-1,.28],[-1.02,1.15],[0,1.22]),quadraticSegment([0,1.22],[1.02,1.15],[1,.28]),quadraticSegment([1,.28],[.84,-.12],[0,-.12]),quadraticSegment([0,-.12],[-.84,-.12],[-1,.28])].flatMap((segment,index)=>index?segment.slice(1):segment).map(([x,y])=>[x*.5,y*.709-.294]).reverse();
const pomBlob=makeFanMesh(pomContour),pomEye=makeFanMesh(Array.from({length:20},(_,i)=>[Math.cos(i*Math.PI/10)*.5,Math.sin(i*Math.PI/10)*.5]));

function makeGroups(){let seen=new Set;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=mural[y][x],key=x+','+y;if(c==='.'||seen.has(key))continue;const cells=[],q=[[x,y]];seen.add(key);while(q.length){const [a,b]=q.pop();cells.push({x:a,y:b});for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=a+dx,ny=b+dy,k=nx+','+ny;if(nx>=0&&nx<W&&ny>=0&&ny<H&&mural[ny][nx]===c&&!seen.has(k)){seen.add(k);q.push([nx,ny])}}}const g={id:groups.length,color:c,cells,depth:0,objects:[]};groups.push(g);for(const p of cells)byCell[p.y][p.x]=g}}
function cellDepth(x,y){return y===H?0:(byCell[y]?.[x]?.depth??-1)}
function nodesAt(x,y){if(x< -1||x>=W||y<0||y>H)return[];if(y===H){const front=Math.max(0,cellDepth(x,H-1));return Array.from({length:Math.max(0,FLOOR_DEPTH-front)},(_,i)=>({x,y,z:front+i}))}if(x<0)return[];const d=cellDepth(x,y),above=cellDepth(x,y-1);if(d<=0)return[];return Array.from({length:Math.max(0,d-Math.max(0,above))},(_,i)=>({x,y,z:Math.max(0,above)+i}))}
function validNode(x,y,z){return nodesAt(x,y).some(n=>n.z===z)}
function nodeKey(p){return `${p.x},${p.y},${p.z}`}
function jumpHeight(from,to){return .5+(to.y===from.y-1&&Math.abs(to.x-from.x)===2?.2:0)}
function jumpPathClear(from,to){
  const a=worldPosition(from),b=worldPosition(to),arc=jumpHeight(from,to),samples=18,halfWidth=.34,halfDown=.205,halfUp=.31;
  for(let i=1;i<samples;i++){
    const t=i/samples,smooth=ease(t),x=a.x+(b.x-a.x)*smooth,y=a.y+(b.y-a.y)*smooth+Math.sin(Math.PI*t)*arc,z=a.z+(b.z-a.z)*smooth,logicalX=x-viewSide*DEPTH_SKEW*z;
    for(const g of groups){if(!g.depth)continue;for(const c of g.cells){
      if(logicalX+halfWidth<=c.x||logicalX-halfWidth>=c.x+1||y-halfDown>=H-c.y+.01||y+halfUp<=H-c.y-1-.01||z+.18<0||z-.18>g.depth)continue;
      return false;
    }}
  }
  return true;
}
function neighbors(p){const out=[];for(let dx=-2;dx<=2;dx++)for(let dy=-1;dy<=H;dy++){const fall=dy>0,upwardHop=dy===-1&&Math.abs(dx)<=2;if(fall?(Math.abs(dx)>1):!(Math.abs(dx)+Math.abs(dy)<=2||upwardHop))continue;const x=p.x+dx,y=p.y+dy;for(const n of nodesAt(x,y)){const depthChange=Math.abs(n.z-p.z);if(fall?depthChange>1:!(Math.abs(dx)+Math.abs(dy)+depthChange<=2||upwardHop&&depthChange<=1))continue;if(dy>1&&Array.from({length:dy-1},(_,i)=>cellDepth(x,p.y+i+1)).some(d=>d>Math.max(p.z,n.z)+.5))continue;if(Math.abs(dx)===2&&dy===0&&nodesAt(p.x+Math.sign(dx),p.y).some(mid=>mid.z===p.z))continue;if((dy!==0||Math.abs(dx)>1)&&!fall&&!jumpPathClear(p,n))continue;if(nodeKey(n)!==nodeKey(p))out.push(n)}}return out}
function findPath(target){const start=nodeKey(player),q=[player],prev=new Map([[start,null]]);while(q.length){const p=q.shift(),k=nodeKey(p);if(k===nodeKey(target)){const path=[];let at=k;while(at){const [x,y,z]=at.split(',').map(Number);path.push({x,y,z});at=prev.get(at)}return path.reverse()}for(const n of neighbors(p)){const nk=nodeKey(n);if(!prev.has(nk)){prev.set(nk,k);q.push(n)}}}return null}
function standableReachable(){const q=[player],seen=new Set([nodeKey(player)]),out=[];while(q.length){const p=q.shift();for(const n of neighbors(p)){const k=nodeKey(n);if(!seen.has(k)){seen.add(k);out.push(n);q.push(n)}}}return out.filter(p=>validNode(p.x,p.y,p.z))}
function reachableTop(target){if(findPath(target))return target;return standableReachable().filter(p=>Math.abs(p.x-target.x)+Math.abs(p.y-target.y)<=1).sort((a,b)=>(Math.abs(a.x-target.x)+Math.abs(a.y-target.y)+Math.abs(a.z-target.z))-(Math.abs(b.x-target.x)+Math.abs(b.y-target.y)+Math.abs(b.z-target.z)))[0]||target}
function canReach(g){if(player.y<H&&byCell[player.y]?.[player.x]===g&&player.z<g.depth)return false;return g.cells.some(c=>{if(player.x===c.x&&player.y===c.y+1&&player.z===g.depth)return true;const dx=player.x-c.x;if(Math.abs(dx)!==1||player.y!==c.y+1)return false;const sideDepth=cellDepth(player.x,c.y);return sideDepth<g.depth&&player.z>=Math.max(0,sideDepth)&&player.z<g.depth})}
function goalNode(){const g=byCell[goalCell.y]?.[goalCell.x];return{x:goalCell.x,y:goalCell.y,z:Math.max(0,(g?.depth||0)-1)}}
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
    // Contrast is tuned by pigment so the orange faces retain their base color.
    const dark=(cx+start)%2===1,contrast={R:.90,O:.90,G:.69,B:.80}[color]??1;
    const shade=color==='Y'?new Color(1,.88,.65):new Color(contrast,contrast,contrast),base=new Color(1);
    squareFace(m,(x,z)=>P(x,.5,z),[lo,hi,start,start+1],dark?shade:base,vec3(0,1,0));
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
function syncExtrusions(){for(const o of [...extrusionObjects,...extrusionOutlines])o.destroy();extrusionObjects=[];extrusionOutlines=[];topObjectInfo.clear();sideObjectInfo.clear();
  for(const g of groups)if(g.depth)for(const c of g.cells){
    const base=vec3(c.x+.5,H-c.y-.5,0),front=worldPoint(base.x,base.y,g.depth).add(vec3(0,0,.025)),dark=makeSurface(base,prismMesh(c.x,c.y,g.depth,viewSide,g.color,false),new Color(1));
    extrusionOutlines.push(dark);sideObjectInfo.set(dark,g);
    const frontFace=makeSurface(front,frontTileMesh(),selected===g?tinted(colors[g.color],.12):colors[g.color]);extrusionObjects.push(frontFace);topObjectInfo.set(frontFace,{x:c.x,y:c.y,z:g.depth-1});sideObjectInfo.set(frontFace,g);
    for(let z=0;z<g.depth;z++){const top=makeSurface(base.add(vec3(0,.003,0)),prismMesh(c.x,c.y,1,viewSide,g.color,true,z),colors[g.color]);top.scale3D=vec3(1,1,1);topObjectInfo.set(top,{x:c.x,y:c.y,z});extrusionObjects.push(top)}
  }
}
function drawMapOutlines(){
  const height=wrap.clientHeight,size=vec2(wrap.clientWidth,height),stroke=2.4*render3D.camera.orthographic/height,bias=render3D.camera.getForward().scale(-.026),seen=new Set;
  const pointKey=p=>{const q=render3D.worldToScreen(p,size);return`${q.x.toFixed(1)},${q.y.toFixed(1)}`};
  const edge=(a,b)=>{const ka=pointKey(a),kb=pointKey(b),key=ka<kb?`${ka}|${kb}`:`${kb}|${ka}`,aa=a.add(bias),bb=b.add(bias);if(seen.has(key))return;seen.add(key);render3D.drawLine(aa,bb,stroke,inkColor)};
  const sameBlock=(g,x,y)=>byCell[y]?.[x]===g;
  for(const g of groups){for(const c of g.cells){
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
    const nx=side>0?c.x-1:c.x+1;
    if((byCell[c.y]?.[nx]?.depth??-1)<d){const sx=side>0?x0+.016:x1-.016;for(let z=0;z<d;z++){if(z===0)edge(P(sx,y0,z),P(sx,y1,z));if(z===d-1)edge(P(sx,y1,z+1),P(sx,y0,z+1))}}
  }}
  if(pomShadow)render3D.drawSoftDisc(pomShadow,.92,new Color(.13,.105,.075,.24),vec3(0,1,0),32);
  drawSelectedOutline();drawHoverSpot();drawPomOcclusionShadow();
}
function roundedInsetLoop(points,offset,radius){if(points.length<3)return[];let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.y-b.x*a.y}const sign=area>=0?1:-1,verts=points.map((v,i)=>{const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length],normal=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return{x:-dy/l*sign,y:dx/l*sign}},n0=normal(prev,v),n1=normal(v,next),sx=n0.x+n1.x,sy=n0.y+n1.y,l=Math.hypot(sx,sy)||1,n={x:sx/l,y:sy/l},k=offset/(n.x*n1.x+n.y*n1.y||1);return{x:v.x+n.x*k,y:v.y+n.y*k}}),result=[];for(let i=0;i<verts.length;i++){const v=verts[i],prev=verts[(i+verts.length-1)%verts.length],next=verts[(i+1)%verts.length],unit=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return{x:dx/l,y:dy/l}},u0=unit(v,prev),u1=unit(v,next),r=Math.min(radius,Math.hypot(v.x-prev.x,v.y-prev.y)/2,Math.hypot(v.x-next.x,v.y-next.y)/2),a={x:v.x+u0.x*r,y:v.y+u0.y*r},b={x:v.x+u1.x*r,y:v.y+u1.y*r};for(let step=0;step<=5;step++){const t=step/5,s=1-t;result.push({x:s*s*a.x+2*s*t*v.x+t*t*b.x,y:s*s*a.y+2*s*t*v.y+t*t*b.y})}}return result}
function drawSelectedOutline(){const g=selected;if(!g)return;const width=wrap.clientWidth,height=wrap.clientHeight,size=vec2(width,height),z=g.depth+.028,offset=5.5,radius=6,dash=6,gap=4,stroke=2.2*render3D.camera.orthographic/height,frontWorld=point=>{const ray=render3D.screenToRay(vec2(point.x,point.y),size),t=(z-ray.origin.z)/ray.direction.z;return ray.getPosition(t)},edges=[],has=(x,y)=>byCell[y]?.[x]===g;for(const c of g.cells){const x=c.x,y0=H-c.y-1,y1=H-c.y;if(!has(c.x,c.y+1))edges.push([[x,y0],[x+1,y0]]);if(!has(c.x+1,c.y))edges.push([[x+1,y0],[x+1,y1]]);if(!has(c.x,c.y-1))edges.push([[x+1,y1],[x,y1]]);if(!has(c.x-1,c.y))edges.push([[x,y1],[x,y0]])}const key=p=>p.join(','),loops=[];while(edges.length){const first=edges.pop(),loop=[first[0],first[1]];while(key(loop.at(-1))!==key(loop[0])){const at=edges.findIndex(e=>key(e[0])===key(loop.at(-1)));if(at<0)break;loop.push(edges.splice(at,1)[0][1])}if(key(loop.at(-1))===key(loop[0])){loop.pop();const screen=loop.map(([x,y])=>render3D.worldToScreen(vec3(x+viewSide*DEPTH_SKEW*z,y,z),size));loops.push(roundedInsetLoop(screen,offset,radius))}}for(const loop of loops){if(loop.length<2)continue;const points=[...loop,loop[0]],period=dash+gap;let traveled=0;for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],length=Math.hypot(b.x-a.x,b.y-a.y)||0;let local=0;while(local<length){const phase=(traveled+local)%period;if(phase<dash){const step=Math.min(length-local,dash-phase),t0=local/length,t1=(local+step)/length,p0={x:a.x+(b.x-a.x)*t0,y:a.y+(b.y-a.y)*t0},p1={x:a.x+(b.x-a.x)*t1,y:a.y+(b.y-a.y)*t1};render3D.drawLine(frontWorld(p0),frontWorld(p1),stroke,inkColor);local+=step}else local+=Math.min(length-local,period-phase)}traveled+=length}}}
function drawHoverSpot(){
  if(!hovered||!hoverObject||hoverObject.color.a===0)return;
  render3D.flushTransparentQueue();render3D.flush();const state={blend:render3D.blend,depthTest:render3D.depthTest,depthWrite:render3D.depthWrite,lighting:render3D.lighting};
  render3D.blend=true;render3D.depthTest=false;render3D.depthWrite=false;render3D.lighting=false;
  render3D.drawMesh(hoverObject.mesh,hoverObject.getMatrix(),undefined,hoverObject.color);render3D.flush();
  render3D.blend=state.blend;render3D.depthTest=state.depthTest;render3D.depthWrite=state.depthWrite;render3D.lighting=state.lighting;
}
function drawPomOcclusionShadow(){if(!playerObject||!pomParts.length)return;render3D.flushTransparentQueue();render3D.flush();const state={blend:render3D.blend,depthWrite:render3D.depthWrite,depthTest:render3D.depthTest,lighting:render3D.lighting};render3D.blend=true;render3D.depthWrite=false;render3D.depthTest=false;render3D.lighting=false;render3D.drawMesh(pomBlob,playerObject.getMatrix(),undefined,new Color(.13,.105,.08,.52));render3D.flush();render3D.depthTest=true;const pose=playerObject.pos3D.copy();playerObject.pos3D=pose.add(render3D.camera.getForward().scale(-.003));playerObject.updateTransforms();const visible=pomParts.map(part=>({mesh:part.mesh,matrix:part.getMatrix().copy(),color:part.color.copy()}));playerObject.pos3D=pose;playerObject.updateTransforms();for(const part of visible)render3D.drawMesh(part.mesh,part.matrix,undefined,part.color);render3D.flush();render3D.blend=state.blend;render3D.depthWrite=state.depthWrite;render3D.depthTest=state.depthTest;render3D.lighting=state.lighting}
function syncFloorGrid(){
  const o=backgroundObjects[backgroundObjects.length-1];if(!o)return;
  const m=new Mesh(),width=wrap.clientWidth,height=wrap.clientHeight,ortho=render3D.camera.orthographic,aspect=width/height,worldWidth=ortho*aspect,line=1.5*ortho/height,gridColor=new Color(1,1,1,.55),floorWash=new Color(1,1,1,.16),size=vec2(width,height);
  render3D.updateMatrices(aspect);
  const toPlane=p=>{const q=render3D.worldToScreen(p,size);return vec2((q.x/width-.5)*worldWidth,(.5-q.y/height)*ortho)};
  const horizon=render3D.worldToScreen(vec3(4,0,0),size),hy=(.5-horizon.y/height)*ortho;
  const addLine=(a,b)=>{const p=toPlane(a),q=toPlane(b),dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy)||1,nx=-dy/length*line/2,ny=dx/length*line/2,limit=hy-line/2;let poly=[vec2(p.x+nx,p.y+ny),vec2(q.x+nx,q.y+ny),vec2(q.x-nx,q.y-ny),vec2(p.x-nx,p.y-ny)],clipped=[];for(let i=0;i<poly.length;i++){const cur=poly[i],prev=poly[(i+poly.length-1)%poly.length],ci=cur.y<=limit,pi=prev.y<=limit;if(ci!==pi){const t=(limit-prev.y)/(cur.y-prev.y);clipped.push(vec2(prev.x+(cur.x-prev.x)*t,limit))}if(ci)clipped.push(cur)}if(clipped.length<3)return;const center=vec2(clipped.reduce((sum,v)=>sum+v.x,0)/clipped.length,clipped.reduce((sum,v)=>sum+v.y,0)/clipped.length),vertices=[vec3(center.x,center.y,0),...clipped.map(v=>vec3(v.x,v.y,0))],indices=[];for(let i=1;i<=clipped.length;i++)indices.push(0,i,i===clipped.length?1:i+1);m.addTriangles(vertices,indices,vec3(0,0,1),undefined,gridColor)};
  // Wash the entire scenery below the horizon; the puzzle remains in front
  // because this camera-facing layer sits behind the playfield geometry.
  m.addQuad(vec3(-worldWidth/2,hy,0),vec3(worldWidth/2,hy,0),vec3(worldWidth/2,-ortho/2,0),vec3(-worldWidth/2,-ortho/2,0),new Color(1,1,1,.30));
  const side=viewSide,s=side*DEPTH_SKEW,ground=.035,left=-1,right=W;
  const wash=[toPlane(vec3(left,ground,.025)),toPlane(vec3(right,ground,.025)),toPlane(vec3(right+s*GRID_DEPTH,ground,GRID_DEPTH+.025)),toPlane(vec3(left+s*GRID_DEPTH,ground,GRID_DEPTH+.025))];m.addQuad(...wash.map(p=>vec3(p.x,p.y,0)),floorWash);
  for(let x=left;x<right;x++)for(let z=0;z<GRID_DEPTH;z++){
    const coverable=!!mural[H-1]?.[x]&&mural[H-1][x]!=='.'&&z<3;
    if(coverable)continue;
    const tint=new Color(.60,.62,.66,.30),gap=0;
    const corners=[[x+gap,z+gap],[x+1-gap,z+gap],[x+1-gap,z+1-gap],[x+gap,z+1-gap]].map(([xx,zz])=>{const p=toPlane(vec3(xx+s*zz,ground,zz));return vec3(p.x,Math.min(p.y,hy-line/2),0)});
    m.addQuad(...corners,tint);
  }
  for(let x=left;x<=right;x++)addLine(vec3(x,ground,.025),vec3(x+s*GRID_DEPTH,ground,GRID_DEPTH+.025));
  for(let z=0;z<=GRID_DEPTH;z++)addLine(vec3(left+s*(z+.025),ground,z+.025),vec3(right+s*(z+.025),ground,z+.025));
  const thickness=2.4*ortho/height;
  m.addQuad(vec3(-worldWidth/2,hy+thickness/2,0),vec3(worldWidth/2,hy+thickness/2,0),vec3(worldWidth/2,hy-thickness/2,0),vec3(-worldWidth/2,hy-thickness/2,0),inkColor);
  m.doubleSided=true;o.setMesh(m);o.pos3D=render3D.camera.pos.add(render3D.camera.getForward().scale(89.4));o.rotation3D=render3D.camera.rotation.copy();o.size3D=vec3(worldWidth,ortho,.1);o.color=new Color(1);o.lighting=false;o.transparent=true;
}
function syncBlocks(){for(const g of groups)for(let i=0;i<g.cells.length;i++){const c=g.cells[i],o=g.objects[i],pose=blockPose(c,g.depth),face=selected===g?tinted(colors[g.color],.12):colors[g.color];o.pos3D=vec3(pose.pos.x,pose.pos.y,pose.pos.z+.025);o.color=face}syncExtrusions();syncFloorGrid()}
function worldPosition(n,offset=.5){const top=n.y===H?0:H-n.y;return worldPoint(n.x+.5,top+.22,n.z+offset)}
function syncBackground(){const width=wrap.clientWidth,height=wrap.clientHeight,ratio=width/height,cam=render3D.camera,forward=cam.getForward(),up=cam.getUp(),right=cam.getRight(),ortho=cam.orthographic,worldWidth=ortho*ratio,sceneHeight=baseCameraHeight||ortho;
  render3D.updateMatrices(ratio);const base=render3D.worldToScreen(vec3(4,0,0),vec2(width,height)),groundQ=base?(height/2-base.y)*ortho/height:-ortho*.28;if(base)wrap.style.setProperty('--horizon-y',`${Math.max(0,Math.min(100,base.y/height*100))}%`);
  const place=(o,distance,x,y,w,h)=>{o.pos3D=cam.pos.add(forward.scale(distance)).add(right.scale(x)).add(up.scale(y));o.scale3D=vec3(w,h,.012)};
  const sky=backgroundObjects[0],meadow=backgroundObjects[1],skyH=sceneHeight*1.15;place(sky,90,0,-ortho/2+skyH/2,skyH*3,skyH);
  // The meadow's center ridge starts 60% down its image. Anchor that ridge
  // to the projected ground, and cover the area below it at every aspect ratio.
  const ridge=.60,groundToBottom=Math.max(0,ortho/2+groundQ),meadowH=Math.max(sceneHeight*1.15,worldWidth/3,groundToBottom/(1-ridge));
  place(meadow,89.7,0,groundQ+(ridge-.5)*meadowH,meadowH*3,meadowH);meadow.color=new Color(1,1,1,.8);
}
function syncPlayer(){const p=worldPosition(player),top=player.y===H?0:H-player.y,jump=celebration?.jump??0;playerObject.pos3D=p.add(vec3(0,jump,0)).add(render3D.camera.getForward().scale(-.045));playerObject.rotation3D=render3D.camera.rotation.copy();playerObject.scale3D=vec3(.72*(1-jump*.2),.56*(1+jump*.2),.018);if(pomShadow)pomShadow=worldPoint(player.x+.5,top+.018,player.z+.5)}
function syncFlag(){const g=byCell[goalCell.y]?.[goalCell.x];if(!flagPole||!g)return;const depth=g.depth,cx=goalCell.x+.5,cy=H-goalCell.y-.5;flagPole.color=new Color(.16,.15,.12);flagCloth.color=new Color(1,.443,.22);flagPole.rotation3D=vec3();flagCloth.rotation3D=vec3();if(!depth){flagPole.scale3D=vec3(.04,.27,.04);flagCloth.scale3D=vec3(.205,.13,.035);flagPole.pos3D=vec3(cx,cy+.085,.08);flagCloth.pos3D=vec3(cx+.105,cy+.165,.09)}else{const base=worldPoint(cx,H-goalCell.y,depth-.5);flagPole.scale3D=vec3(.05,.68,.05);flagCloth.scale3D=vec3(.38,.24,.045);flagPole.pos3D=base.add(vec3(0,.34,0));flagCloth.pos3D=base.add(vec3(.19,.56,.025))}}
function updateUI(){
  document.querySelector('#level-number').textContent=String(activeLevel.id).padStart(2,'0');document.querySelector('#level-title').textContent=activeLevel.name;document.querySelector('#exitLevel').disabled=false;
  document.querySelector('#pull').disabled=busy||won||!selected||!canReach(selected)||selected.depth>=3||!safeManipulation(selected,selected.depth+1,1);
  document.querySelector('#push').disabled=busy||won||!selected||!canReach(selected)||selected.depth<=0||!safeManipulation(selected,selected.depth-1,-1);
  document.querySelector('#undo').disabled=busy||!history.length;
  document.querySelector('#reset').disabled=busy||(!history.length&&!won&&!groups.some(g=>g.depth));
  if(!toastTimer)showHelp(contextHelp());
  const toggle=document.querySelector('#toggleView'),right=viewSide>0;toggle.disabled=busy||won;toggle.setAttribute('aria-checked',String(right));toggle.setAttribute('aria-label',`Looking ${right?'right':'left'}. Switch to look ${right?'left':'right'}`);toggle.querySelector('.view-toggle-label').textContent=`Look ${right?'right':'left'}`;toggle.querySelector('.toggle-thumb').textContent=right?'→':'←';
  const color=selected?tinted(colors[selected.color],.12):null;wrap.style.setProperty('--block-color',color?`rgb(${Math.round(color.r*255)} ${Math.round(color.g*255)} ${Math.round(color.b*255)})`:'#eee8fa');
  syncBlocks();syncPlayer();syncFlag();
}
function contextHelp(){if(won)return 'Pom made it to the flag!';if(busy)return 'Pom is on his way…';if(selected){if(!canReach(selected))return 'Move Pom beside this block to push or pull it.';return `Block pulled ${selected.depth} of 3 steps out. ${selected.depth===3?'Push it in to make a different path.':'Use Push in or Pull out to make a path.'}`}return viewMobile?'Tap a block or walking spot. Drag to pan · pinch to zoom.':'Select a block to pull it. Click a walking spot to move Pom.'}
function showHelp(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('on')}
function say(text){clearTimeout(toastTimer);showHelp(text);toastTimer=setTimeout(()=>{toastTimer=undefined;showHelp(contextHelp())},3200)}
function showMenu(panel='title'){
  const menu=document.querySelector('#menuScreen');menu.hidden=false;menu.classList.toggle('is-levels',panel==='levels');document.querySelector('#titlePanel').hidden=panel!=='title';document.querySelector('#levelsPanel').hidden=panel!=='levels';if(panel==='levels')document.querySelector('#levelList').scrollTop=0;document.querySelector('.stage').classList.remove('is-won');document.querySelector('#victoryActions').hidden=true;document.querySelector('.stage').inert=true;
}
function renderLevelList(){
  const list=document.querySelector('#levelList'),tones=['orange','peach','green','blue','yellow'];list.replaceChildren();
  for(const level of levels){
    const button=document.createElement('button');button.type='button';button.className='level-card';button.dataset.tone=tones[level.id%tones.length];button.setAttribute('aria-label',`Level ${level.id}: ${level.name}`);
    const number=document.createElement('span');number.className='card-number';number.textContent=String(level.id).padStart(2,'0');
    const details=document.createElement('span');details.className='level-details';const name=document.createElement('strong');name.textContent=level.name;details.append(name);
    const status=document.createElement('span');status.className='level-status';status.textContent='Unlocked';button.append(number,details,status);button.addEventListener('click',()=>startLevel(level.id));list.append(button);
  }
}
function resetLevelState(level){
  activeLevel=level;W=level.width;H=level.height;mural=level.grid.map(row=>[...row]);goalCell={...level.goal};
  groups=[];byCell=Array.from({length:H},()=>Array(W).fill(null));makeGroups();player={x:level.start.x,y:H,z:level.start.z};selected=null;hovered=null;history=[];won=false;busy=false;falling=false;viewSide=1;celebration=null;irisSvg.style.opacity='0';
  rebuildBlockMeshes();updateUI();startBoardView();
}
function startLevel(id){if(!gameReady)return;const level=levels.find(item=>item.id===id);if(!level)return;document.querySelector('.stage').classList.remove('is-won');document.querySelector('#victoryActions').hidden=true;resetLevelState(level);document.querySelector('#menuScreen').hidden=true;document.querySelector('.stage').inert=false}
document.querySelector('#openLevels').addEventListener('click',()=>showMenu('levels'));
document.querySelector('#backTitle').addEventListener('click',()=>showMenu('title'));
document.querySelector('#exitLevel').addEventListener('click',()=>showMenu('levels'));
document.querySelector('#nextLevel').addEventListener('click',()=>{if(busy)return;const index=levels.findIndex(level=>level.id===activeLevel.id),next=levels[index+1];if(next)startLevel(next.id)});
document.querySelector('#victoryLevels').addEventListener('click',()=>showMenu('levels'));
const menuScreen=document.querySelector('#menuScreen'),levelList=document.querySelector('#levelList');
window.addEventListener('wheel',e=>{
  if(menuScreen.hidden||!menuScreen.classList.contains('is-levels'))return;
  const unit=e.deltaMode===1?16:e.deltaMode===2?levelList.clientHeight:1;
  if(e.deltaY)levelList.scrollTop+=e.deltaY*unit;
  e.preventDefault();e.stopPropagation();
},{capture:true,passive:false});
renderLevelList();
function sceneFrame(width,height,side=viewSide){
  const pitch=VIEW_PITCH,c=Math.cos(pitch),s=Math.sin(pitch),points=[];
  for(const x of [-1,W])for(const z of [0,GRID_DEPTH])points.push([x+side*DEPTH_SKEW*z,-s*z]);
  for(const x of [0,W-1])for(const y of [0,H+.85])for(const z of [0,3])points.push([x+side*DEPTH_SKEW*z,c*y-s*z]);
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
  const action=document.querySelector('.canvas-actions'),actionHeight=action.getBoundingClientRect().height,buttonBottom=parseFloat(getComputedStyle(action).bottom)||12;
  const top=Math.min(64,height*.16),bottom=Math.min(actionHeight+buttonBottom+22,height*.34),margin=width<600?14:24;
  const unit=Math.max(1,Math.min(80,(width-2*margin)/(maxX-minX),(height-top-bottom)/(maxY-minY)));
  const targetY=(minY+maxY)/2+(top-bottom)/(2*unit);
  return {height:height/unit,target:vec3((minX+maxX)/2,(targetY+s)/c,1),minX,maxX,minY,maxY,top,bottom,margin};
}
function fitCamera(width,height){return sceneFrame(width,height).height}
function positionCameraForView(side,targetOverride){render3D.camera.orbit(targetOverride||sceneFrame(wrap.clientWidth,wrap.clientHeight,side).target,15,0,VIEW_PITCH)}
const mobileBoard=()=>wrap.clientWidth<=780||(matchMedia('(pointer:coarse)').matches&&wrap.clientWidth<=1024);
const tappingUnit=()=>36/Math.sin(VIEW_PITCH);
function stopIntro(){introFrame++;}
function clampBoardView(){
  const width=wrap.clientWidth,height=wrap.clientHeight,f=sceneFrame(width,height),fitUnit=height/f.height;
  viewUnit=Math.max(fitUnit,Math.min(Math.max(tappingUnit(),fitUnit),viewUnit));
  if(viewUnit<=fitUnit*1.001){viewTarget=f.target;return}
  const halfX=(width/2-f.margin)/viewUnit,loX=f.minX+halfX,hiX=f.maxX-halfX;
  viewTarget.x=loX<=hiX?Math.max(loX,Math.min(hiX,viewTarget.x)):(f.minX+f.maxX)/2;
  const loY=f.minY+(height/2-f.bottom)/viewUnit,hiY=f.maxY-(height/2-f.top)/viewUnit,c=Math.cos(VIEW_PITCH),sn=Math.sin(VIEW_PITCH),projected=viewTarget.y*c-viewTarget.z*sn;
  const y=loY<=hiY?Math.max(loY,Math.min(hiY,projected)):(f.target.y*c-f.target.z*sn);
  viewTarget.y=(y+viewTarget.z*sn)/c;
}
function applyBoardView(clamp=true){
  if(!viewReady||celebration)return;if(clamp)clampBoardView();
  render3D.camera.orthographic=wrap.clientHeight/viewUnit;positionCameraForView(viewSide,viewTarget);render3D.updateMatrices(wrap.clientWidth/wrap.clientHeight);
  syncBackground();syncFloorGrid();syncHoverSpot();if(playerObject&&!busy)syncPlayer();
  // Readable, projected dimensions also make responsive checks independent of device pixels.
  wrap.dataset.squareWidth=viewUnit.toFixed(2);wrap.dataset.squareDepth=(viewUnit*Math.sin(VIEW_PITCH)).toFixed(2);wrap.dataset.view=viewUnit<=wrap.clientHeight/fitCamera(wrap.clientWidth,wrap.clientHeight)*1.001?'full':'zoomed';
}
function startBoardView(animate=true){
  stopIntro();viewWidth=wrap.clientWidth;viewHeight=wrap.clientHeight;viewMobile=mobileBoard();viewTouched=false;viewReady=true;showHelp(contextHelp());
  const f=sceneFrame(viewWidth,viewHeight),fitUnit=viewHeight/f.height;viewUnit=fitUnit;viewTarget=f.target.copy();baseCameraHeight=f.height;applyBoardView();
  if(!viewMobile||fitUnit>=tappingUnit())return;
  const token=introFrame,start=performance.now(),from=viewTarget.copy(),unit=tappingUnit(),pom=worldPosition(player),rise=Math.min(1.2,Math.max(0,(viewHeight/2-f.bottom)/unit)/Math.cos(VIEW_PITCH)),target=pom.add(vec3(Math.min(.8,viewWidth/unit*.2),rise,0));
  const duration=animate&&!matchMedia('(prefers-reduced-motion:reduce)').matches?850:0,delay=duration?450:0;
  function tick(now){if(token!==introFrame||celebration)return;const t=duration?Math.min(1,Math.max(0,(now-start-delay)/duration)):1,q=ease(t);viewUnit=fitUnit+(unit-fitUnit)*q;viewTarget=from.lerp(target,q);applyBoardView();if(t<1)requestAnimationFrame(tick)}
  requestAnimationFrame(tick);
}
function panBoard(dx,dy){viewTarget=viewTarget.add(vec3(-dx/viewUnit,dy/(viewUnit*Math.cos(VIEW_PITCH)),0))}
function zoomBoard(unit,x,y){
  const old=viewUnit,f=sceneFrame(wrap.clientWidth,wrap.clientHeight),min=wrap.clientHeight/f.height;viewUnit=Math.max(min,Math.min(Math.max(tappingUnit(),min),unit));
  const scale=1/old-1/viewUnit;viewTarget=viewTarget.add(vec3((x-wrap.clientWidth/2)*scale,(wrap.clientHeight/2-y)*scale/Math.cos(VIEW_PITCH),0));
}
function clearBoardHover(){hovered=null;if(hoverObject)hoverObject.color=new Color(1,1,1,0)}
function boardPoint(e){const r=wrap.getBoundingClientRect();return {x:e.clientX-r.left-wrap.clientLeft,y:e.clientY-r.top-wrap.clientTop}}
function boardDown(e){
  if(won||!viewReady||e.button>0)return;stopIntro();const p=boardPoint(e);boardPointers.set(e.pointerId,p);wrap.setPointerCapture(e.pointerId);
  if(boardPointers.size===1)boardGesture={id:e.pointerId,x:p.x,y:p.y,moved:false,multi:false};else{boardGesture.multi=true;clearBoardHover()}
}
function boardMove(e){
  if(!boardPointers.has(e.pointerId)){if(e.pointerType!=='touch')updateHover(e);return}
  const before=[...boardPointers.values()],old=boardPointers.get(e.pointerId),p=boardPoint(e);boardPointers.set(e.pointerId,p);
  if(boardPointers.size>=2){
    boardGesture.multi=true;boardGesture.moved=true;const after=[...boardPointers.values()],a=before[0],b=before[1],c=after[0],d=after[1],oldDistance=Math.hypot(a.x-b.x,a.y-b.y),distance=Math.hypot(c.x-d.x,c.y-d.y),cx=(c.x+d.x)/2,cy=(c.y+d.y)/2;
    panBoard(cx-(a.x+b.x)/2,cy-(a.y+b.y)/2);if(oldDistance>1)zoomBoard(viewUnit*distance/oldDistance,cx,cy);
  }else{
    if(Math.hypot(p.x-boardGesture.x,p.y-boardGesture.y)>6)boardGesture.moved=true;
    if(!boardGesture.moved)return;panBoard(p.x-old.x,p.y-old.y);
  }
  viewTouched=true;clearBoardHover();applyBoardView();e.preventDefault();
}
function boardUp(e,cancel=false){
  if(!boardPointers.has(e.pointerId))return;boardPointers.delete(e.pointerId);
  const tap=!cancel&&boardPointers.size===0&&boardGesture&&!boardGesture.moved&&!boardGesture.multi;
  if(wrap.hasPointerCapture(e.pointerId))wrap.releasePointerCapture(e.pointerId);
  if(boardPointers.size===0)boardGesture=null;
  if(tap){viewTouched=true;clickBoard(e)}
}
function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
function syncVictoryOverlay(now){
  if(!celebration)return;
  const width=wrap.clientWidth,height=wrap.clientHeight,elapsed=now-celebration.start,progress=Math.min(1,elapsed/2400),zoom=ease(progress),close=ease((progress-.15)/.85),size=vec2(width,height);
  if(progress>=1&&!celebration.finished){celebration.finished=true;document.querySelector('.stage').classList.add('is-won');document.querySelector('#victoryActions').hidden=false;const index=levels.findIndex(level=>level.id===activeLevel.id),next=levels[index+1],button=document.querySelector('#nextLevel');button.disabled=!next;button.textContent=next?'Next level →':'Last level'}
  celebration.zoom=zoom;celebration.jump=Math.abs(Math.sin(elapsed/220))*.14*zoom;
  const anchor=worldPosition(player),focus=anchor.add(vec3(.12,.3,0));
  positionCameraForView(viewSide,celebration.baseTarget.lerp(focus,zoom));render3D.camera.orthographic=celebration.baseHeight*(1-.4*zoom);render3D.updateMatrices(width/height);syncBackground();syncFloorGrid();syncPlayer();
  // Wave the original flag beside Pom; its pole stays against his body.
  const right=render3D.camera.getRight(),up=render3D.camera.getUp(),forward=render3D.camera.getForward(),angle=Math.sin(elapsed/170)*.18,dir=up.scale(Math.cos(angle)).add(right.scale(Math.sin(angle))),base=playerObject.pos3D.add(right.scale(.27)).add(up.scale(-.08)).add(forward.scale(-.09));
  const carry=ease(progress/.35);flagPole.pos3D=celebration.flagStart.lerp(base.add(dir.scale(.34)),carry);flagCloth.pos3D=celebration.clothStart.lerp(base.add(dir.scale(.56)).add(right.scale(.19)).add(forward.scale(-.025)),carry);flagPole.rotation3D=render3D.camera.rotation.add(vec3(0,0,-angle*carry));flagCloth.rotation3D=flagPole.rotation3D.copy();flagPole.scale3D=vec3(.05,.68,.05);flagCloth.scale3D=vec3(.38,.24,.045);
  const center=render3D.worldToScreen(anchor.add(vec3(.12,.28,0)),size),radius=Math.hypot(width,height)*(1-close)+Math.min(height*.37,width*.42)*close;
  irisSvg.setAttribute('viewBox',`0 0 ${width} ${height}`);irisShade.setAttribute('d',`M0 0H${width}V${height}H0Z M${center.x-radius} ${center.y} a${radius} ${radius} 0 1 0 ${radius*2} 0 a${radius} ${radius} 0 1 0 ${-radius*2} 0Z`);irisRing.setAttribute('cx',center.x);irisRing.setAttribute('cy',center.y);irisRing.setAttribute('r',radius);irisSvg.style.opacity='1';requestAnimationFrame(syncVictoryOverlay);
}
function startCelebration(){stopIntro();celebration={start:performance.now(),zoom:0,jump:0,baseHeight:render3D.camera.orthographic,baseTarget:viewTarget.copy(),flagStart:flagPole.pos3D.copy(),clothStart:flagCloth.pos3D.copy()};setUmbrellaVisible(false);requestAnimationFrame(syncVictoryOverlay)}
function gameInit(){
  const bounds=wrap.getBoundingClientRect();setCanvasFixedSize(vec2(Math.max(1,bounds.width),Math.max(1,bounds.height)));
  setDebugWatermark(false);new Render3DPlugin();
  render3D.onRenderTransparent=drawMapOutlines;
  render3D.sunDirection=vec3(-.45,.8,.5);render3D.sunColor=new Color(1,.91,.75);render3D.ambientColor=new Color(.52,.51,.4);render3D.ambientGroundColor=new Color(.35,.4,.3);
  baseCameraHeight=fitCamera(bounds.width,bounds.height);render3D.camera.orthographic=baseCameraHeight;positionCameraForView(viewSide);
  // Keep the horizon on the wall's base line; pulled pieces then extend down
  // toward Pom in the camera projection without moving the scenery.
  render3D.updateMatrices(bounds.width/bounds.height);
  const makeBackdrop=(texture,color)=>{const o=new EngineObject3D(vec3(),box,texture,color);o.rotation3D=render3D.camera.rotation.copy();o.lighting=false;o.receiveShadow=false;o.castShadow=false;o.emissive=1;o.transparent=texture===textureInfos[1];backgroundObjects.push(o);return o};
  makeBackdrop(textureInfos[0],new Color(1));makeBackdrop(textureInfos[1],new Color(1));
  makeBackdrop(undefined,new Color(1));syncFloorGrid();
  syncBackground();
  makeGroups();rebuildBlockMeshes();
  pomShadow=worldPoint(player.x+.5,.018,player.z+.5);
  hoverObject=makeSurface(vec3(0,-100,0),standingSpotMesh(),new Color(1,1,1,0));hoverObject.transparent=true;hoverObject.render3D=()=>{};
  playerObject=new EngineObject3D(vec3(.5,.2,.14),pomBlob,undefined,inkColor);playerObject.scale3D=vec3(.72,.56,.018);playerObject.rotation3D=render3D.camera.rotation.copy();playerObject.lighting=false;playerObject.softShadow=0;pomParts=[playerObject];
  const pomBody=new EngineObject3D(vec3(0,0,1),pomBlob,undefined,new Color(.97,.22,.16));pomBody.scale3D=vec3(.88,.88,1);pomBody.lighting=false;playerObject.addChild(pomBody);pomParts.push(pomBody);
  for(const x of [-.17,.17]){const white=new EngineObject3D(vec3(x,.19,2),pomEye,undefined,new Color(1,.95,.83)),black=new EngineObject3D(vec3(x,.19,2.2),pomEye,undefined,new Color(.12,.1,.09));white.scale3D=vec3(.2,.26,1);black.scale3D=vec3(.085,.13,1);white.lighting=false;black.lighting=false;playerObject.addChild(white);playerObject.addChild(black);pomEyes.push({white,black});pomParts.push(white,black)}
  const sweatContour=[...quadraticSegment([0,.6],[-.65,-.05],[-.35,-.3],10),...quadraticSegment([-.35,-.3],[0,-.7],[.35,-.3],10).slice(1),...quadraticSegment([.35,-.3],[.65,-.05],[0,.6],10).slice(1)],sweatMesh=makeFanMesh(sweatContour);
  for(let i=0;i<2;i++){const outline=new EngineObject3D(vec3(.48+i*.17,.65-i*.2,2.8),sweatMesh,undefined,new Color(.157,.145,.122,0)),fill=new EngineObject3D(vec3(0,0,.2),sweatMesh,undefined,new Color(.64,.83,.97,0));outline.scale3D=vec3(.17,.19,1);fill.scale3D=vec3(.70,.72,1);outline.lighting=fill.lighting=false;outline.transparent=fill.transparent=true;outline.addChild(fill);playerObject.addChild(outline);sweatDrops.push({outline,fill})}
  const umbrellaRim=[...Array.from({length:25},(_,i)=>{const a=-Math.PI/2+i*Math.PI/24;return[.52*Math.sin(a),.54*Math.cos(a)]}),[.39,-.04],[.26,0],[.13,-.04],[0,0],[-.13,-.04],[-.26,0],[-.39,-.04]],umbrellaCenter=[0,0];
  umbrellaCanopy=new EngineObject3D(vec3(0,.84,3),makeFanMesh(umbrellaRim),undefined,new Color(.15,.2,.27,0));umbrellaCanopy.scale3D=vec3(.78,.58,1);umbrellaCanopy.lighting=false;umbrellaCanopy.transparent=true;playerObject.addChild(umbrellaCanopy);
  for(let panel=0;panel<4;panel++){const start=-Math.PI/2+panel*Math.PI/4,end=start+Math.PI/4,arc=Array.from({length:9},(_,i)=>{const a=start+(end-start)*i/8;return[.5*Math.sin(a),.52*Math.cos(a)]}),piece=new EngineObject3D(vec3(0,.84,3.035),makeSectorMesh(umbrellaCenter,arc),undefined,new Color(1));piece.scale3D=vec3(.76,.56,1);piece.lighting=false;piece.transparent=true;playerObject.addChild(piece);umbrellaPanels.push(piece)}
  umbrellaHandle=new EngineObject3D(vec3(0,.84,2.96),makeFanMesh([[-.035,-.02],[.035,-.02],[.035,-.6],[-.035,-.6]]),undefined,new Color(.15,.2,.27,0));umbrellaHandle.lighting=false;umbrellaHandle.transparent=true;playerObject.addChild(umbrellaHandle);setUmbrellaVisible(false);
  flagPole=new EngineObject3D(vec3(4.5,5.57,.08),buildBox(),undefined,new Color(.16,.15,.12));flagPole.scale3D=vec3(.035,.24,.035);
  flagCloth=new EngineObject3D(vec3(4.59,5.64,.09),flagMesh,undefined,new Color(1,.443,.22));flagCloth.scale3D=vec3(.17,.105,.035);flagCloth.lighting=false;
  updateUI();startBoardView();gameReady=true;document.querySelector('#openLevels').disabled=false;document.querySelector('#openLevels').textContent='Choose a level';
}
function gameUpdate(){
}
function fallPlan(from,to){
  const a=worldPosition(from),b=worldPosition(to),depth=byCell[from.y]?.[from.x]?.depth??0,takeoffZ=Math.max(a.z,depth+.12),landingZ=Math.max(b.z,takeoffZ);
  const approach=150,flight=Math.min(950,350+(to.y-from.y)*105),finish=Math.abs(landingZ-b.z)>.01?150:0;
  return {a,b,takeoffZ,landingZ,approach,flight,finish,duration:approach+flight+finish};
}
function fallMotion(from,to,elapsed,plan=fallPlan(from,to)){
  const {a,b,takeoffZ,landingZ,approach,flight,finish}=plan;
  if(elapsed<approach){const t=Math.min(1,elapsed/approach);return {pose:worldPoint(from.x+.5,a.y,a.z+(takeoffZ-a.z)*ease(t)),umbrella:t>.90,flight:0}}
  if(elapsed<approach+flight){const t=Math.min(1,(elapsed-approach)/flight),lift=(a.y-b.y)*.25+.48;return {pose:worldPoint(from.x+.5+(to.x-from.x)*t,a.y+(b.y-a.y)*t+4*lift*t*(1-t),takeoffZ+(landingZ-takeoffZ)*t),umbrella:true,flight:t}}
  const t=finish?ease(Math.min(1,(elapsed-approach-flight)/finish)):1;
  return {pose:worldPoint(to.x+.5,b.y,landingZ+(b.z-landingZ)*t),umbrella:false,flight:1};
}
function moveTo(p){
  if(won||busy)return;const path=findPath(p);if(!path||path.length<2){say('That ledge is out of reach. Pull a block out to make a step.');return}
  save();busy=true;setUmbrellaVisible(false);falling=false;updateUI();let index=1;
  function edge(now,from=player,to=path[index],start=now){
    const isLongFall=to.y-from.y>1,plan=isLongFall?fallPlan(from,to):null,duration=plan?plan.duration:to.y!==from.y||Math.abs(to.x-from.x)>1?260:175,elapsed=Math.min(duration,now-start),t=elapsed/duration,smooth=ease(t),a=worldPosition(from),b=worldPosition(to);
    const jump=!isLongFall&&(to.y!==from.y||Math.abs(to.x-from.x)>1)?Math.sin(Math.PI*t)*jumpHeight(from,to):0;
    const motion=isLongFall?fallMotion(from,to,elapsed,plan):{pose:vec3(a.x+(b.x-a.x)*smooth,a.y+(b.y-a.y)*smooth+jump,a.z+(b.z-a.z)*smooth),umbrella:false,flight:0};
    if(falling!==motion.umbrella){falling=motion.umbrella;setUmbrellaVisible(falling)}
    playerObject.pos3D=motion.pose.add(render3D.camera.getForward().scale(-.045));if(falling)positionUmbrella(motion.flight);
    const fromTop=from.y===H?0:H-from.y,toTop=to.y===H?0:H-to.y;pomShadow=worldPoint(motion.pose.x-viewSide*DEPTH_SKEW*motion.pose.z,fromTop+(toTop-fromTop)*smooth+.018,motion.pose.z);
    if(t<1){requestAnimationFrame(n=>edge(n,from,to,start));return}
    player={...to};falling=false;setUmbrellaVisible(false);
    if(index<path.length-1){index++;requestAnimationFrame(n=>edge(n,player,path[index],n));return}
    busy=false;if(nodeKey(player)===nodeKey(goalNode())){won=true;document.querySelector('.stage').classList.add('is-won');say('Pom made it to the flag!');startCelebration()}else say('Pom made it to that ledge.');updateUI();
  }
  requestAnimationFrame(now=>edge(now));
}
function pointOnFloor(ray){if(Math.abs(ray.direction.y)<1e-6)return null;const t=(0-ray.origin.y)/ray.direction.y;if(t<0)return null;return ray.getPosition(t)}
function standableAt(ray){let best=null,bestD=Infinity;if(Math.abs(ray.direction.y)>1e-6)for(const p of standableReachable().filter(p=>p.y<H)){const h=H-p.y,z=p.z+.5,x=p.x+.5+viewSide*DEPTH_SKEW*(p.z+.5),t=(h-ray.origin.y)/ray.direction.y;if(t<0)continue;const q=ray.getPosition(t),d=Math.hypot(q.x-x,q.z-z);if(d<bestD&&d<.72){best=p;bestD=d}}if(best)return best;const floor=pointOnFloor(ray);if(floor){const p=standableReachable().filter(n=>n.y===H).sort((a,b)=>{const pa=worldPosition(a,.5),pb=worldPosition(b,.5);return Math.hypot(pa.x-floor.x,pa.z-floor.z)-Math.hypot(pb.x-floor.x,pb.z-floor.z)})[0];if(p){const q=worldPosition(p,.5);if(Math.hypot(q.x-floor.x,q.z-floor.z)<.9)return p}}return null}
function updateHover(e){if(!hoverObject)return;const point=boardPoint(e),ray=render3D.screenToRay(vec2(point.x,point.y),vec2(wrap.clientWidth,wrap.clientHeight)),p=standableAt(ray);hovered=p;if(!p){hoverObject.color=new Color(1,1,1,0);return}hoverObject.pos3D=standingSpotCenter(p);hoverObject.color=new Color(1,1,1,.33)}
function clickBoard(e){if(busy||won)return;const point=boardPoint(e),ray=render3D.screenToRay(vec2(point.x,point.y),vec2(wrap.clientWidth,wrap.clientHeight));
  // Resolve visible, walkable cube tops before wall faces. The wall can be
  // nearer along the ray even when the pointer is visually on a platform top.
  let best=null,bestD=Infinity;for(const p of standableReachable().filter(p=>p.y<H)){const h=H-p.y,z=p.z+.5,x=p.x+.5+viewSide*DEPTH_SKEW*(p.z+.5);if(Math.abs(ray.direction.y)<1e-6)continue;const t=(h-ray.origin.y)/ray.direction.y;if(t<0)continue;const q=ray.getPosition(t),d=Math.hypot(q.x-x,q.z-z);if(d<bestD&&d<.72){best=p;bestD=d}}if(best){moveTo(best);return}
  const hits=engineObjectsRaycast3D(ray),hit=hits.find(o=>blockObjects.includes(o)||topObjectInfo.has(o)||sideObjectInfo.has(o));if(hit){const top=topObjectInfo.get(hit);if(top){moveTo(reachableTop(top));return}const g=sideObjectInfo.get(hit)||groups.find(g=>g.objects.includes(hit));if(g){selected=g;updateUI();if(canReach(g))say('Piece selected. Pull it out one step.');else say('Move Pom to the front edge to reach this piece.');return}}
  // Match a visible point on the floor plane to the nearest reachable step.
  const floor=pointOnFloor(ray);if(floor){selected=null;updateUI();const candidates=standableReachable().filter(p=>p.y===H);const p=candidates.sort((a,b)=>{const pa=worldPosition(a,.5),pb=worldPosition(b,.5);return Math.hypot(pa.x-floor.x,pa.z-floor.z)-Math.hypot(pb.x-floor.x,pb.z-floor.z)})[0];if(p){const q=worldPosition(p,.5);if(Math.hypot(q.x-floor.x,q.z-floor.z)<1.15)moveTo(p)}}
}
function manipulate(dir){const g=selected;if(busy||!g||!canReach(g)||won)return;const next=g.depth+dir;if(next<0||next>3)return;const dest={...player,z:player.z+dir};if(!safeManipulation(g,next,dir)){say('Pom has no safe step to move with this piece.');return}save();g.depth=next;player=dest;animateEffort();updateUI();say(dir>0?'Pulled one step out.':'Pushed one step back.')}
function restore(s){celebration=null;irisSvg.style.opacity='0';groups.forEach((g,i)=>g.depth=s.depths[i]);player={...s.player};selected=groups.find(g=>g.id===s.selected)||null;won=s.won;applyBoardView();updateUI()}
function rotate(side){if(busy||won)return;stopIntro();const old=sceneFrame(wrap.clientWidth,wrap.clientHeight,viewSide);viewSide=side;const next=sceneFrame(wrap.clientWidth,wrap.clientHeight,side);viewTarget.x+=next.target.x-old.target.x;applyBoardView();playerObject.rotation3D=render3D.camera.rotation.copy();updateUI()}
wrap.addEventListener('pointerdown',boardDown);wrap.addEventListener('pointermove',boardMove);wrap.addEventListener('pointerup',e=>boardUp(e));wrap.addEventListener('pointercancel',e=>boardUp(e,true));wrap.addEventListener('lostpointercapture',e=>boardUp(e,true));wrap.addEventListener('pointerleave',()=>{if(!boardPointers.size)clearBoardHover()});
wrap.addEventListener('wheel',e=>{if(won||!viewReady)return;e.preventDefault();stopIntro();viewTouched=true;const p=boardPoint(e);zoomBoard(viewUnit*Math.exp(-e.deltaY*(e.ctrlKey?.01:.002)),p.x,p.y);clearBoardHover();applyBoardView()},{passive:false});
// Overlay controls must never select or move a ground spot underneath them.
const canvasActions=document.querySelector('.canvas-actions');for(const event of ['pointerdown','pointermove'])canvasActions.addEventListener(event,e=>e.stopPropagation());canvasActions.addEventListener('pointerenter',()=>{hovered=null;if(hoverObject)hoverObject.color=new Color(1,1,1,0)});
document.querySelector('#pull').onclick=()=>manipulate(1);document.querySelector('#push').onclick=()=>manipulate(-1);document.querySelector('#toggleView').onclick=()=>rotate(-viewSide);
document.querySelector('#undo').onclick=()=>busy?null:history.length?restore(history.pop()):say('Nothing to undo yet.');document.querySelector('#reset').onclick=()=>{if(busy)return;celebration=null;irisSvg.style.opacity='0';groups.forEach(g=>g.depth=0);player={x:0,y:H,z:0};selected=null;history=[];won=false;positionCameraForView(viewSide);render3D.camera.orthographic=baseCameraHeight;render3D.updateMatrices(wrap.clientWidth/wrap.clientHeight);syncBackground();updateUI();startBoardView();say('Puzzle reset.')};
window.addEventListener('keydown',e=>{
  if(!menuScreen.hidden&&menuScreen.classList.contains('is-levels')){
    const step=Math.max(120,levelList.clientHeight*.72);
    if(e.key==='ArrowDown'||e.key==='PageDown'){levelList.scrollBy({top:e.key==='PageDown'?step:48});e.preventDefault()}
    else if(e.key==='ArrowUp'||e.key==='PageUp'){levelList.scrollBy({top:e.key==='PageUp'?-step:-48});e.preventDefault()}
    else if(e.key==='Home'){levelList.scrollTop=0;e.preventDefault()}
    else if(e.key==='End'){levelList.scrollTop=levelList.scrollHeight;e.preventDefault()}
    return;
  }
  if(document.querySelector('.stage').inert||busy)return;
  if(e.key.toLowerCase()==='z'){if(history.length)restore(history.pop())}if(e.key.toLowerCase()==='r')document.querySelector('#reset').click();if(e.key==='ArrowLeft')rotate(-1);if(e.key==='ArrowRight')rotate(1)
});
setCanvasPixelRatio(Math.min(window.devicePixelRatio||1,2));
glSetAntialias(true);
setLoadingScreen(undefined);
await engineInit(gameInit,gameUpdate,undefined,undefined,undefined,[skyBackground,meadowForeground],wrap);
new ResizeObserver(()=>{
  const r={width:wrap.clientWidth,height:wrap.clientHeight};setCanvasFixedSize(vec2(Math.max(1,r.width),Math.max(1,r.height)));if(!backgroundObjects.length)return;
  if(r.width===viewWidth&&r.height===viewHeight)return;
  const mobile=mobileBoard(),changedMode=mobile!==viewMobile;viewWidth=r.width;viewHeight=r.height;baseCameraHeight=fitCamera(r.width,r.height);
  if(celebration){render3D.updateMatrices(r.width/r.height);return}
  if(changedMode){startBoardView();return}
  stopIntro();if(!mobile&&!viewTouched){viewUnit=r.height/baseCameraHeight;viewTarget=sceneFrame(r.width,r.height).target}applyBoardView();
}).observe(wrap);
