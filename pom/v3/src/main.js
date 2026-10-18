import { engineInit, mainCanvas, mainContext, setCanvasFixedSize, setCanvasPixelRatio, setDebugWatermark, setGLEnable, vec2 } from 'littlejsengine';
import { cameraDepth, faceOcclusionPolygon, isSupportTopFace } from './occlusion.js';
import { drawDepthScene } from './depth-renderer.js';
import './style.css';

const wrap = document.querySelector('#canvasWrap');

let canvas,ctx;
// Pixel mural: each connected color region is one movable block piece.
const mural=[['.','.','.','Y','Y','.','.','.'],['.','B','B','B','Y','Y','.','.'],['O','O','B','B','B','O','O','.'],['O','G','G','G','G','O','O','.'],['R','R','G','G','R','R','R','.'],['R','R','R','R','R','R','R','.']];
const palette={R:'#ff7138',O:'#f2a05a',G:'#79a66e',B:'#55a9ae',Y:'#ffdf3f'};const ink='#28251f';const W=mural[0].length,H=mural.length,FLOOR_DEPTH=4;let groups=[],byCell=Array.from({length:H},()=>Array(W).fill(null)),player={x:0,y:H,z:0},selected=null,history=[],won=false,hover=null,hoverNode=null,viewSide=1,timer,busy=false,motion=null,effortMotion=null,celebration=null;
function makeGroups(){let seen=new Set(),id=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++){let c=mural[y][x],key=x+','+y;if(c==='.'||seen.has(key))continue;let cells=[],q=[[x,y]];seen.add(key);while(q.length){let [a,b]=q.pop();cells.push({x:a,y:b});for(let [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){let nx=a+dx,ny=b+dy,k=nx+','+ny;if(nx>=0&&nx<W&&ny>=0&&ny<H&&mural[ny][nx]===c&&!seen.has(k)){seen.add(k);q.push([nx,ny])}}}let g={id:id++,color:c,cells,depth:0};groups.push(g);for(let p of cells)byCell[p.y][p.x]=g;}}
makeGroups();
function cellDepth(x,y){if(y===H)return 0;return byCell[y]?.[x]?.depth??-1}
function renderDepth(g){return effortMotion?.group===g?effortMotion.depth:g.depth}
function renderCellDepth(x,y){const g=byCell[y]?.[x];return g?renderDepth(g):cellDepth(x,y)}
function nodeZ(p){return p.z}
function key(p){return p.x+','+p.y+','+p.z}
function nodesAt(x,y){if(y<0||y>H)return[];if(y===H){if(x<0||x>=W||cellDepth(x,H-1)<0)return[];let frontDepth=Math.max(0,cellDepth(x,H-1));return Array.from({length:Math.max(0,FLOOR_DEPTH-frontDepth)},(_,i)=>({x,y,z:frontDepth+i}))}if(x<0||x>=W)return[];let depth=cellDepth(x,y),above=cellDepth(x,y-1);if(depth<=0)return[];let nodes=[];for(let z=Math.max(0,above);z<depth;z++)nodes.push({x,y,z});return nodes}
function validNode(x,y,z){return nodesAt(x,y).some(p=>p.z===z)}
function goalNode(){const g=byCell[0][4];return{x:4,y:0,z:Math.max(0,(g?.depth??0)-1)}}
function isGoal(p){const g=goalNode();return p.x===g.x&&p.y===g.y&&p.z===g.z}
function neighbors(p){let out=[],pz=nodeZ(p);for(let dx=-2;dx<=2;dx++)for(let dy=-1;dy<=1;dy++){
 if(Math.abs(dx)+Math.abs(dy)>2)continue;
 let x=p.x+dx,y=p.y+dy;
 for(let n of nodesAt(x,y)){
  let dz=nodeZ(n)-pz;if(Math.abs(dx)+Math.abs(dy)+Math.abs(dz)>2)continue;
  // A two-cell jump is only allowed over a gap at this depth and height.
  if(Math.abs(dx)===2&&nodesAt(p.x+Math.sign(dx),p.y).some(mid=>nodeZ(mid)===pz))continue;
  if(key(n)!==key(p))out.push(n)
 }
}return out}
function findPath(target){let q=[[player]],seen=new Set([key(player)]);while(q.length){let route=q.shift(),p=route.at(-1);if(key(p)===key(target))return route;for(let n of neighbors(p)){let k=key(n);if(!seen.has(k)){seen.add(k);q.push([...route,n])}}}return null}
function reachable(){let out=[],q=[player],seen=new Set([key(player)]);while(q.length){let p=q.shift();for(let n of neighbors(p)){let k=key(n);if(!seen.has(k)){seen.add(k);out.push(n);q.push(n)}}}return out}
function standableReachable(){return reachable().filter(p=>validNode(p.x,p.y,p.z))}
function canReachBlock(g){
 const pz=nodeZ(player);
 // A piece cannot be pulled or pushed while it is supporting Pom.
 if(player.y<H&&byCell[player.y]?.[player.x]===g&&pz<g.depth)return false;
 return g.cells.some(c=>{
  // Front access requires standing at the block's front edge, at its height.
  if(player.x===c.x&&player.y===c.y+1&&pz===g.depth)return true;
  // A side grab is possible only where that side face is actually exposed.
  const dx=player.x-c.x;
  if(Math.abs(dx)===1&&player.y===c.y+1){
   const neighborDepth=cellDepth(player.x,c.y);
   const faceStart=Math.max(0,neighborDepth);
   // Side faces occupy [neighborDepth, g.depth). At the outermost edge
   // (pz === g.depth) Pom is in front of the face, not beside it.
   if(neighborDepth<g.depth&&pz>=faceStart&&pz<g.depth)return true;
  }
  return false;
 });
}
function manipulationLanding(g,nextDepth,dir){
 // Pom travels one depth step with every pull or push. Only allow the move
 // when the corresponding standing spot exists after the block moves.
 const destination={...player,z:player.z+dir};
 const oldDepth=g.depth;g.depth=nextDepth;
 const safe=destination.z>=0&&destination.z<FLOOR_DEPTH&&validNode(destination.x,destination.y,destination.z);
 g.depth=oldDepth;
 return{safe,destination};
}
function fit(){if(!canvas?.parentElement)return;const r=canvas.parentElement.getBoundingClientRect();setCanvasFixedSize(vec2(Math.max(1,Math.round(r.width)),Math.max(1,Math.round(r.height))));render()}
function metrics(){let cw=canvas.clientWidth,ch=canvas.clientHeight;let unit=Math.min((cw-80)/(W+1.5),(ch-80)/(H+1.8));unit=Math.max(28,Math.min(62,unit));let dep=unit*.42,wallW=W*unit+4*dep,wallH=H*unit+4*dep;return{cw,ch,u:unit,d:dep,side:viewSide,x:(cw-wallW)/2+(viewSide<0?3*dep:dep)+5,y:(ch-wallH)/2+dep+4}}
function project(x,y,z,m){return{x:m.x+x*m.u+m.side*z*m.d,y:m.y+y*m.u+z*m.d}}
function poly(pts,fill,stroke=ink,lw=1.5){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let p of pts.slice(1))ctx.lineTo(p[0],p[1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}
function gridCellPolygon(p,m){return[[p.x,p.y,p.z],[p.x+1,p.y,p.z],[p.x+1,p.y,p.z+1],[p.x,p.y,p.z+1]].map(([x,y,z])=>{const q=project(x,y,z,m);return[q.x,q.y]})}
function insidePolygon(px,py,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))inside=!inside}return inside}
function solidFaceOps(g,c,m){
 const {u}=m,cx=c.x,cy=c.y,back=0,front=renderDepth(g),ops=[];
 const shade=g.color==='Y'?'#d4b834':g.color==='B'?'#3e8084':g.color==='G'?'#587f50':g.color==='O'?'#bb7644':'#c85632';
 const light=g.color==='Y'?'#fff09b':g.color==='B'?'#82c9ca':g.color==='G'?'#a8ca8f':g.color==='O'?'#ffc078':'#ff9a69';
 const surface=(points,color,kind)=>{
  const pts=points.map(([px,py,pz])=>{const q=project(px,py,pz,m);return[q.x,q.y]});
  // Recover camera-space depth from this oblique projection. Screen-row
  // sorting is not a depth test and makes unrelated fronts cross box tops.
  const k=m.d/m.u,sort=points.reduce((sum,p)=>sum+p[2]-m.side*k*p[0]-k*p[1],0)/points.length;
  ops.push({sort,layer:0,kind,block:g,cell:c,world:points,fill:color,draw:()=>{
   poly(pts,color,color,0);
   ctx.strokeStyle=ink;ctx.lineWidth=1.15;
   for(const i of [0,2]){ctx.beginPath();ctx.moveTo(pts[i][0],pts[i][1]);ctx.lineTo(pts[(i+1)%4][0],pts[(i+1)%4][1]);ctx.stroke()}
  }});
 };
 // Model the tile as one prism: its body begins just behind the wall and
 // ends at the current pull depth. Each exposed edge is a single continuous face.
 const topDepth=renderCellDepth(cx,cy-1),leftDepth=renderCellDepth(cx-1,cy),rightDepth=renderCellDepth(cx+1,cy);
 // At depth zero the piece is flush with the wall: show only its flat front
 // tile. The top and side faces appear only after it is pulled out.
 if(front>0&&topDepth<front){const start=Math.max(back,topDepth);surface([[cx,cy,start],[cx+1,cy,start],[cx+1,cy,front],[cx,cy,front]],light,'top')}
 // This view looks down onto the top and toward the front. Only one x-side
 // faces the camera; drawing the opposite side or underside creates wedges
 // that incorrectly cover visible top/front faces.
 if(front>0&&m.side>0&&leftDepth<front){const start=Math.max(back,leftDepth);surface([[cx,cy,start],[cx,cy+1,start],[cx,cy+1,front],[cx,cy,front]],shade,'side')}
 if(front>0&&m.side<0&&rightDepth<front){const start=Math.max(back,rightDepth);surface([[cx+1,cy,start],[cx+1,cy+1,start],[cx+1,cy+1,front],[cx+1,cy,front]],shade,'side')}
 const k=m.d/m.u,frontSort=front-m.side*k*(cx+.5)-k*(cy+.5);
 ops.push({sort:frontSort,layer:1,kind:'front',block:g,cell:c,world:[[cx,cy,front],[cx+1,cy,front],[cx+1,cy+1,front],[cx,cy+1,front]],draw:()=>drawFront(g,c,m)});
 return ops;
}
function drawFront(g,c,m){
 const {u}=m,{x:fx,y:fy}=project(c.x,c.y,renderDepth(g),m);
 const highlighted=g===selected||canReachBlock(g);
 if(highlighted){ctx.save();ctx.shadowColor='#ff7138';ctx.shadowBlur=5}
 const faceColor=canReachBlock(g)?mixColor(palette[g.color],'#fff0a6',.14):palette[g.color];
 poly([[fx,fy],[fx+u,fy],[fx+u,fy+u],[fx,fy+u]],faceColor,ink,highlighted?2:1.5);
 if(highlighted){ctx.restore();ctx.save();ctx.setLineDash([4,3]);ctx.lineWidth=g===selected?1.6:1.35;ctx.strokeStyle=g===selected?ink:'#fff0d8';ctx.strokeRect(fx+3,fy+3,u-6,u-6);ctx.restore()}
 ctx.fillStyle='#28251f35';ctx.beginPath();ctx.arc(fx+u*.82,fy+u*.18,1.15,0,Math.PI*2);ctx.fill();
}
function mixColor(a,b,t){const hex=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const aa=hex(a),bb=hex(b);return'#'+aa.map((v,i)=>Math.round(v*(1-t)+bb[i]*t).toString(16).padStart(2,'0')).join('')}
function point(p,m){
 // z identifies a specific one-block landing cell along a platform's depth.
 const z=p.z;
 const offset=z+.5;
 return{x:m.x+p.x*m.u+m.u/2+m.side*offset*m.d,y:m.y+p.y*m.u+offset*m.d}
}
function mascotPath(pt,u){const x=pt.x,y=pt.y,s=u*.32,path=new Path2D();path.moveTo(x-s,y-s*.28);path.quadraticCurveTo(x-s*1.02,y-s*1.15,x,y-s*1.22);path.quadraticCurveTo(x+s*1.02,y-s*1.15,x+s,y-s*.28);path.quadraticCurveTo(x+s*.84,y+s*.12,x,y+s*.12);path.quadraticCurveTo(x-s*.84,y+s*.12,x-s,y-s*.28);path.closePath();return path}
function drawMascot(pt,u,strain=0,direction=1){const x=pt.x,y=pt.y,s=u*.32,path=mascotPath(pt,u);ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.translate(x,y);ctx.rotate(direction*strain*.07);ctx.scale(1+strain*.08,1-strain*.11);ctx.translate(-x,-y);ctx.lineWidth=Math.max(1.5,u*.035);ctx.strokeStyle=ink;ctx.fillStyle='#ef5941';ctx.fill(path);ctx.stroke(path);ctx.fillStyle='#fff0d8';ctx.beginPath();ctx.arc(x-s*.34,y-s*.68,s*.19,0,Math.PI*2);ctx.arc(x+s*.34,y-s*.68,s*.19,0,Math.PI*2);ctx.fill();ctx.fillStyle=ink;ctx.beginPath();ctx.arc(x-s*.34,y-s*.68,s*.09,0,Math.PI*2);ctx.arc(x+s*.34,y-s*.68,s*.09,0,Math.PI*2);ctx.fill();ctx.restore()}
function faceDepthAt(px,py,world,m){
 const v=world.map(([x,y,z])=>{const p=project(x,y,z,m);return{x:p.x,y:p.y,d:cameraDepth(x,y,z,m)}});
 const tri=(a,b,c)=>{const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-7)return null;const w0=((b.y-c.y)*(px-c.x)+(c.x-b.x)*(py-c.y))/den,w1=((c.y-a.y)*(px-c.x)+(a.x-c.x)*(py-c.y))/den,w2=1-w0-w1;if(w0<-.001||w1<-.001||w2<-.001)return null;return w0*a.d+w1*b.d+w2*c.d};
 return tri(v[0],v[1],v[2])??tri(v[0],v[2],v[3]);
}
function isOccluded(p,px,py,m,faces){const supportCell=p.y<H?{x:Math.floor(p.x),y:Math.floor(p.y)}:null,rx=m.u*.09,ry=m.u*.045,samples=[];for(const ax of [-.95,-.5,0,.5,.95])for(const ay of [-.95,-.5,0,.5,.95])if(ax*ax+ay*ay<=1)samples.push([px+ax*rx,py+ay*ry]);for(const [sx,sy]of samples){const d=cameraDepth(p.x+.5+(sx-px)/m.u,p.y-(py-sy)/m.u,p.z+.5,m);for(const f of faces){if(!f.world||isSupportTopFace(f,supportCell))continue;const fd=faceDepthAt(sx,sy,f.world,m);if(fd!==null&&fd>d+.025)return true}}return false}
function visibleStandableReachable(m,faces){const drawnFaces=faces||buildBoxOps(m);return standableReachable().filter(p=>{const pt=point(p,m);return!isOccluded(p,pt.x,pt.y,m,drawnFaces)})}
function drawStandableGridCell(p,m,active=false){
 const corners=gridCellPolygon(p,m);
 ctx.save();ctx.beginPath();ctx.moveTo(...corners[0]);for(const corner of corners.slice(1))ctx.lineTo(...corner);ctx.closePath();ctx.strokeStyle=active?'#ffdf3f':'rgba(40,37,31,.58)';ctx.lineWidth=active?2.2:1.15;ctx.setLineDash(active?[]:[3,3]);ctx.stroke();ctx.restore();
}
function standableSpotAt(mx,my,m,spots){return spots.filter(p=>insidePolygon(mx,my,gridCellPolygon(p,m))).sort((a,b)=>{const pa=point(a,m),pb=point(b,m);return Math.hypot(mx-pa.x,my-pa.y)-Math.hypot(mx-pb.x,my-pb.y)})[0]||null}
function occludingFaceFragments(p,pt,m,faces){
 const supportCell=p.y<H?{x:Math.floor(p.x),y:Math.floor(p.y)}:null,occluders=[];
 for(const face of faces){
  if(!face.world||isSupportTopFace(face,supportCell))continue;
  const polygon=faceOcclusionPolygon(face.world,p,pt,m);
  if(polygon.length>=3)occluders.push({face,polygon});
 }
 return occluders;
}
function goalFlagAnchor(m){const spot=point(goalNode(),m);return{x:spot.x,y:spot.y}}
function drawFlagAt(px,py,u,scale=1,alpha=1){if(alpha<=0)return;ctx.save();ctx.globalAlpha=alpha;ctx.lineWidth=Math.max(1.4,u*.035);ctx.strokeStyle=ink;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py-u*.66*scale);ctx.stroke();poly([[px+1,py-u*.63*scale],[px+u*.38*scale,py-u*.52*scale],[px+1,py-u*.41*scale]],'#ff7138',ink,1.1);ctx.restore()}
function drawFlag(m,alpha=1){const g=byCell[0][4];if(!g)return;const spot=goalFlagAnchor(m);if(g.depth===0){const {x:fx,y:fy}=project(4,0,0,m);drawFlagAt(fx+m.u*.5,fy+m.u*.68,m.u,.42,alpha);return}drawFlagAt(spot.x,spot.y,m.u,1,alpha)}
function drawCarriedFlag(pp,u,from,blend,alpha){const s=u*.32,to={x:pp.x+s*.72,y:pp.y-s*.25},px=from.x+(to.x-from.x)*blend,py=from.y+(to.y-from.y)*blend;drawFlagAt(px,py,u,.72,alpha)}
function drawVictoryIris(cw,ch,center,radius){ctx.save();ctx.beginPath();ctx.rect(0,0,cw,ch);ctx.moveTo(center.x+radius,center.y);ctx.arc(center.x,center.y,radius,0,Math.PI*2);ctx.fillStyle='rgba(40,37,31,.92)';ctx.fill('evenodd');ctx.beginPath();ctx.arc(center.x,center.y,radius,0,Math.PI*2);ctx.strokeStyle='#fff0d8';ctx.lineWidth=3;ctx.stroke();ctx.restore()}
function startCelebration(){celebration={start:performance.now(),t:0};function frame(now){if(!celebration)return;celebration.t=Math.min(1,(now-celebration.start)/2800);render();if(celebration.t<1)requestAnimationFrame(frame)}requestAnimationFrame(frame)}
function buildBoxOps(m){const ops=[];for(let g of groups)for(let c of g.cells)ops.push(...solidFaceOps(g,c,m));ops.sort((a,b)=>a.sort-b.sort||a.layer-b.layer);return ops}
function drawGameFrame(){canvas.style.width='100%';canvas.style.height='100%';let {cw,ch}=metrics();ctx.clearRect(0,0,cw,ch);let m=metrics();let {u,d,x,y}=m;canvas.parentElement.style.setProperty('--ground-line-y',`calc(${(y+H*u)/ch*100}% - 2px)`);const focus=point(motion?motion.to:player,m),vt=celebration?.t??0,smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)},zoom=celebration?1+1.2*smooth((vt-.2)/.8):1;ctx.save();if(celebration){ctx.translate(cw/2,ch/2);ctx.scale(zoom,zoom);ctx.translate(-focus.x,-focus.y)}
// The wall's quiet grid gives the mural a clear face; only colored pieces can move.
ctx.strokeStyle='#28251f22';ctx.lineWidth=1;for(let xx=0;xx<=W;xx++){ctx.beginPath();ctx.moveTo(x+xx*u,y);ctx.lineTo(x+xx*u,y+H*u);ctx.stroke()}for(let yy=0;yy<=H;yy++){ctx.beginPath();ctx.moveTo(x,y+yy*u);ctx.lineTo(x+W*u,y+yy*u);ctx.stroke()}
// Horizon/ground line sits behind the wall and runs across the full playfield.
ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y+H*u);ctx.lineTo(cw,y+H*u);ctx.stroke();
// Resolve every opaque box pixel by camera depth, independent of face order.
const boxOps=buildBoxOps(m),standableSpots=effortMotion?.spots||visibleStandableReachable(m,boxOps);
// Ground cells sit behind the puzzle so their grid never leaks over raised blocks.
for(const p of standableSpots)if(p.y===H)drawStandableGridCell(p,m,hoverNode===key(p));
const boxFaces=boxOps.map(face=>({...face,active:face.kind==='front'&&(face.block===selected||canReachBlock(face.block)),selected:face.block===selected}));
drawDepthScene({canvas,context:ctx,faces:boxFaces,camera:m,width:cw,height:ch,project,depthAt:cameraDepth,fillFor:face=>face.kind==='front'?(canReachBlock(face.block)?mixColor(palette[face.block.color],'#fff0a6',.14):palette[face.block.color]):face.fill,markers:effortMotion?[]:standableSpots.filter(p=>p.y<H),markerActive:p=>hoverNode===key(p)});
const flagFade=celebration?1-smooth((vt-.1)/.2):1;drawFlag(m,flagFade);
// Platform landing markers belong to the platform's resting position. Hide
// them while a piece slides so they cannot look detached from its moving top.
let actor={...player},pp=point(actor,m),strain=0,strainDirection=1;if(effortMotion){const {from,to,t,direction}=effortMotion,step=smooth(t);actor={x:from.x+(to.x-from.x)*step,y:from.y+(to.y-from.y)*step,z:from.z+(to.z-from.z)*step};pp=point(actor,m);strain=Math.sin(Math.PI*t);strainDirection=direction;pp.y+=direction*strain*u*.075}else if(motion){const t=motion.t*(2-motion.t);actor={x:motion.from.x+(motion.to.x-motion.from.x)*t,y:motion.from.y+(motion.to.y-motion.from.y)*t,z:motion.from.z+(motion.to.z-motion.from.z)*t};pp=point(actor,m);if(motion.jump)pp.y-=Math.sin(Math.PI*motion.t)*u*.45;}const jumpT=smooth((vt-.28)/.34),jumpHeight=celebration?Math.sin(Math.PI*jumpT)*u*.9:0;pp.y-=jumpHeight;
ctx.save();ctx.beginPath();ctx.ellipse(pp.x,pp.y+u*.075,u*.23,u*.055,0,0,Math.PI*2);ctx.fillStyle='rgba(52,45,34,.16)';ctx.shadowColor='rgba(52,45,34,.18)';ctx.shadowBlur=u*.045;ctx.fill();ctx.restore();drawMascot(pp,u,strain,strainDirection);
const occluders=occludingFaceFragments(actor,pp,m,boxOps);if(occluders.length){
 // Draw the exact face/actor intersection where the block is closer to camera.
 const shape=mascotPath(pp,u);ctx.save();ctx.clip(shape);
 for(const {face,polygon}of occluders){ctx.save();ctx.beginPath();ctx.moveTo(polygon[0].x,polygon[0].y);for(const p of polygon.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.clip();face.draw();ctx.restore()}
 ctx.restore()
}
if(celebration){const take=smooth((vt-.08)/.24),carryAlpha=smooth((vt-.08)/.16),anchor=goalFlagAnchor(m);drawCarriedFlag(pp,u,anchor,take,carryAlpha)}
ctx.restore();
if(celebration){const close=smooth((vt-.2)/.8),radius=Math.hypot(cw,ch)*(1-close)+Math.max(58,u*1.9)*close,center={x:cw/2+(pp.x-focus.x)*zoom,y:ch/2+(pp.y-focus.y)*zoom};drawVictoryIris(cw,ch,center,radius)}
}
function render(){if(canvas&&ctx)drawGameFrame()}
function say(s){let el=document.querySelector('#toast');el.textContent=s;el.classList.add('on');clearTimeout(timer);timer=setTimeout(()=>el.classList.remove('on'),1400)}
function updatePanel(){if(!selected||!canReachBlock(selected)){selected=groups.find(g=>canReachBlock(g)&&((g.depth<3&&manipulationLanding(g,g.depth+1,1).safe)||(g.depth>0&&manipulationLanding(g,g.depth-1,-1).safe)))||null}let g=selected,near=g&&canReachBlock(g),pullLandingSpot=g&&near&&g.depth<3?manipulationLanding(g,g.depth+1,1):null,pushLandingSpot=g&&near&&g.depth>0?manipulationLanding(g,g.depth-1,-1):null;document.querySelector('#pull').disabled=busy||!g||!near||g.depth>=3||!pullLandingSpot?.safe||won;document.querySelector('#push').disabled=busy||!g||!near||g.depth<=0||!pushLandingSpot?.safe||won}
function setSelected(g){selected=g;updatePanel();render()}
function pull(dir){if(!selected||!canReachBlock(selected)||won||busy)return;const g=selected,old=g.depth,next=Math.max(0,Math.min(3,old+dir));if(next===old){say(dir>0?'This block is all the way out.':'This block is flush with the wall.');return}const landing=manipulationLanding(g,next,dir);if(!landing.safe){say('Pom has no safe standing spot to move with this piece.');return}const m=metrics(),spots=visibleStandableReachable(m,buildBoxOps(m));history.push(snapshot());busy=true;updatePanel();const from={...player},to=landing.destination,start=performance.now(),duration=520;function frame(now){const t=Math.min(1,(now-start)/duration),eased=t*t*(3-2*t);effortMotion={group:g,from,to,t,direction:dir,depth:old+(next-old)*eased,spots};render();if(t<1)requestAnimationFrame(frame);else{g.depth=next;player={...to};effortMotion=null;busy=false;updatePanel();render();say(next>old?`Pulled ${next-old} step${next-old===1?'':'s'} out.`:'Pushed one step back.')}}requestAnimationFrame(frame)}
function snapshot(){return{player:{...player},depths:groups.map(g=>g.depth),selected:selected?.id??null,won}}
function restore(s){celebration=null;player={...s.player};groups.forEach((g,i)=>g.depth=s.depths[i]);selected=groups.find(g=>g.id===s.selected)||null;won=s.won;updatePanel();render()}
function animateEdge(from,to){return new Promise(resolve=>{let start=performance.now(),jump=Math.abs(to.x-from.x)>1||Math.abs(to.y-from.y)>0,duration=jump?270:180;function frame(now){let t=Math.min(1,(now-start)/duration);motion={from,to,t,jump};render();if(t<1)requestAnimationFrame(frame);else{player={...to};motion=null;render();resolve()}}requestAnimationFrame(frame)})}
async function actMove(p){if(busy)return;let path=findPath(p);if(!path||path.length<2){say('That ledge is out of reach. Pull a block out to make a step.');return}history.push(snapshot());busy=true;updatePanel();for(let i=1;i<path.length;i++)await animateEdge(path[i-1],path[i]);busy=false;if(isGoal(p)){won=true;say('Pom made it to the flag!');startCelebration()}else say('Pom made it to that ledge.');updatePanel();render()}
function hitCell(mx,my){
 const m=metrics();let best=null,bd=Infinity;
 function inside(px,py,a){let c=false;for(let i=0,j=a.length-1;i<a.length;j=i++){let xi=a[i][0],yi=a[i][1],xj=a[j][0],yj=a[j][1];if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))c=!c}return c}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  // Flush pieces are still selectable so the player can pull them out.
  const g=byCell[y][x];if(!g)continue;
  const dx=g.depth*m.d*m.side,fx=m.x+x*m.u+dx,fy=m.y+y*m.u+g.depth*m.d;
  const front=mx>=fx&&mx<=fx+m.u&&my>=fy&&my<=fy+m.u;
  // The top face begins at the wall plane and extends exactly as far as pulled.
  const top=[project(x,y,0,m),project(x+1,y,0,m),project(x+1,y,g.depth,m),project(x,y,g.depth,m)].map(p=>[p.x,p.y]);
  let side=false;
  const edges=[
   {a:[x,y],b:[x+1,y],n:cellDepth(x,y-1)},
   {a:[x,y+1],b:[x+1,y+1],n:cellDepth(x,y+1)},
   {a:[x,y+1],b:[x,y],n:cellDepth(x-1,y)},
   {a:[x+1,y],b:[x+1,y+1],n:cellDepth(x+1,y)}
  ];
  for(const e of edges){let start=Math.max(0,e.n);if(start>=g.depth)continue;let ox=start*m.d*m.side,ex=(g.depth-start)*m.d*m.side;
   const quad=[[m.x+e.a[0]*m.u+ox,m.y+e.a[1]*m.u+ox],[m.x+e.b[0]*m.u+ox,m.y+e.b[1]*m.u+ox],[m.x+e.b[0]*m.u+ox+ex,m.y+e.b[1]*m.u+ox+ex],[m.x+e.a[0]*m.u+ox+ex,m.y+e.a[1]*m.u+ox+ex]];
   if(inside(mx,my,quad)){side=true;break}
  }
  const topHit=g.depth>0&&inside(mx,my,top);
  if(front||topHit||side){
   const topZ=topHit?Math.max(0,Math.min(g.depth-1,Math.floor((my-(m.y+y*m.u))/m.d))):null;
   const target=topHit?point({x,y,z:topZ},m):{x:fx+m.u/2,y:fy+m.u/2};
   const dist=(mx-target.x)**2+(my-target.y)**2;
   if(dist<bd){bd=dist;best={x,y,z:topZ,g,topHit,frontHit:front}}
  }
 }
 return best
}
function turnView(side){viewSide=side;hoverNode=null;document.querySelector('#viewName').textContent=side>0?'Viewing right side':'Viewing left side';document.querySelector('#turnView').setAttribute('aria-pressed',String(side<0));document.querySelector('#turnView').setAttribute('aria-label',`Rotate view; currently viewing ${side>0?'right':'left'} side`);render()}
function initializeGame(){
canvas=mainCanvas;ctx=mainContext;canvas.id='board';canvas.setAttribute('aria-label','Interactive pull-and-climb block puzzle');canvas.style.zIndex='2';wrap.insertBefore(canvas,document.querySelector('#toast'));
canvas.addEventListener('click',e=>{if(won||busy)return;let r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,m=metrics();
// Landing spots take priority over block faces, which can overlap in the
// isometric projection. This keeps every visible top marker directly clickable.
const standable=visibleStandableReachable(m),target=standableSpotAt(mx,my,m,standable);if(target){actMove(target);return}
let hit=hitCell(mx,my);if(hit){
 const reachableSpots=visibleStandableReachable(m);
 if(hit.topHit&&reachableSpots.some(p=>key(p)===key(hit))){actMove({x:hit.x,y:hit.y,z:hit.z});return}
 if(hit.frontHit){const frontSpot=reachableSpots.filter(p=>p.x===hit.x&&p.y===hit.y+1).sort((a,b)=>Math.abs(a.z-Math.max(0,hit.g.depth-1))-Math.abs(b.z-Math.max(0,hit.g.depth-1)))[0];if(frontSpot){actMove(frontSpot);return}}
 if(canReachBlock(hit.g)){setSelected(hit.g);say('Block selected. Pull or push it from here.')}else{setSelected(hit.g);say('That block is too far away to reach.')}return
}
if(mx< m.x||mx>m.x+W*m.u)say('Choose a block on the wall or an orange landing spot.')});
canvas.addEventListener('mousemove',e=>{let r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,m=metrics(),hit=hitCell(mx,my),nearest=visibleStandableReachable(m).map(p=>({p,pt:point(p,m)})).map(o=>({...o,dist:Math.hypot(mx-o.pt.x,my-o.pt.y)})).filter(o=>o.dist<m.u*.75).sort((a,b)=>a.dist-b.dist)[0]?.p,next=nearest?key(nearest):null;if(next!==hoverNode){hoverNode=next;render()}canvas.style.cursor=nearest||hit?'pointer':'default'});
document.querySelector('#turnView').onclick=()=>turnView(-viewSide);
document.querySelector('#pull').onclick=()=>pull(1);document.querySelector('#push').onclick=()=>pull(-1);document.querySelector('#undo').onclick=()=>{if(busy)return;if(history.length)restore(history.pop());else say('Nothing to undo yet.')};document.querySelector('#reset').onclick=()=>{if(busy)return;celebration=null;groups.forEach(g=>g.depth=0);player={x:0,y:H,z:0};selected=null;history=[];won=false;updatePanel();render();say('Puzzle reset.')};window.addEventListener('resize',fit);new ResizeObserver(fit).observe(wrap);updatePanel();fit();
}

setGLEnable(false);
setDebugWatermark(false);
setCanvasPixelRatio(Math.min(window.devicePixelRatio||1,2));
wrap.style.background=getComputedStyle(wrap).background;
engineInit(initializeGame,undefined,undefined,drawGameFrame,undefined,[],wrap);
