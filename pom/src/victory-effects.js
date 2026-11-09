import { VICTORY_STARS } from './victory-stars.js';

const SVG_NS='http://www.w3.org/2000/svg';
const ease=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t)};

// Keep the star and the camera aimed at the center of the artwork area.
export function victoryCenter(rect,viewportWidth,viewportHeight){
  return {
    x:Math.max(0,Math.min(rect.width,viewportWidth/2-rect.left)),
    y:Math.max(rect.height*.2,Math.min(rect.height*.8,viewportHeight*.29-rect.top)),
  };
}

// Limit Pom's apparent size in the final star while still fitting large puzzles.
export function victoryFrameUnit(width,height,visualWidth,visualHeight){
  const starSize=Math.min(width*.56,height*.29);
  return Math.max(1,Math.min((width-32)/(visualWidth+.8),(height-48)/(visualHeight+1.15),starSize*.32/.72));
}
export function victoryExpandedFov(fov,ratio){
  return 2*Math.atan(Math.tan(fov*Math.PI/360)*ratio)*180/Math.PI;
}

// The full-sized canvas stays allocated while its visible area expands.
export function victoryBoardClip(board,original,progress){
  const {top,right,bottom,left}=victoryBoardInsets(board,original,progress);
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${original.radius}px)`;
}
function victoryBoardInsets(board,original,progress){
  const remaining=1-Math.max(0,Math.min(1,progress));
  const top=Math.max(0,original.top-board.top)*remaining;
  const right=Math.max(0,board.right-original.right)*remaining;
  const bottom=Math.max(0,board.bottom-original.bottom)*remaining;
  const left=Math.max(0,original.left-board.left)*remaining;
  return{top,right,bottom,left};
}
export function victoryBoardBounds(board,original,progress){
  const {top,right,bottom,left}=victoryBoardInsets(board,original,progress);
  return{left:board.left+left,top:board.top+top,width:board.width-left-right,height:board.height-top-bottom};
}
export function victoryMorphPath(rectangle,star,center,size,progress,angle){
  const radians=angle*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians),scale=size/200;
  return star.map((point,i)=>{
    const dx=(point.x-100)*scale,dy=(point.y-100)*scale,targetX=center.x+c*dx-s*dy,targetY=center.y+s*dx+c*dy,initial=rectangle[i];
    return `${i?'L':'M'}${(initial.x+(targetX-initial.x)*progress).toFixed(2)} ${(initial.y+(targetY-initial.y)*progress).toFixed(2)}`;
  }).join('')+'Z';
}

// Celebrate over the goal's supporting square. The collected flag is hidden
// on completion, so no sideways displacement is needed to make room for it.
export function victoryArrival(t,reducedMotion=false){
  const progress=ease((t-.10)/.70);
  return{x:0,y:reducedMotion?0:.18*Math.sin(Math.PI*progress)};
}

export function createVictoryEffects(app){
  const board=app.querySelector('#canvasWrap'),stage=board.closest('.stage');
  const message=document.createElement('div');message.className='victory-message';message.hidden=true;message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const title=document.createElement('strong'),caption=document.createElement('span');title.textContent='Congratulations!';message.append(title,caption);
  const description=document.createElement('p');description.className='victory-description';message.append(description);
  const continueButton=document.createElement('button');continueButton.type='button';continueButton.className='victory-continue';continueButton.textContent='Continue';continueButton.hidden=true;message.append(continueButton);
  const arrow=document.createElementNS(SVG_NS,'svg'),arrowPath=document.createElementNS(SVG_NS,'path');
  arrow.classList.add('victory-continue__arrow');arrow.setAttribute('viewBox','0 0 24 24');arrow.setAttribute('aria-hidden','true');arrowPath.setAttribute('d','M19 12H5M11 6l-6 6 6 6');arrow.append(arrowPath);continueButton.append(arrow);
  const iris=document.createElementNS(SVG_NS,'svg');iris.classList.add('victory-transition');iris.setAttribute('hidden','');iris.setAttribute('aria-hidden','true');
  const expansionOutline=document.createElement('div');expansionOutline.className='victory-expansion-outline';expansionOutline.hidden=true;expansionOutline.setAttribute('aria-hidden','true');
  const defs=document.createElementNS(SVG_NS,'defs'),clip=document.createElementNS(SVG_NS,'clipPath'),clipShape=document.createElementNS(SVG_NS,'path'),rim=document.createElementNS(SVG_NS,'path');
  clip.id='victory-star-clip';clip.setAttribute('clipPathUnits','userSpaceOnUse');clip.append(clipShape);defs.append(clip);
  rim.setAttribute('fill','none');rim.setAttribute('stroke','#111');rim.setAttribute('stroke-width','2.5');rim.setAttribute('stroke-linejoin','round');iris.append(defs,rim);
  stage.append(message);document.body.append(expansionOutline,iris);
  let generation=0,frame=0,finishAnimation,reducedMotion=false,liveMask,usingLiveMask=false,starPoints,rectanglePoints;
  function reset(){
    generation++;cancelAnimationFrame(frame);finishAnimation?.(false);finishAnimation=undefined;
    message.hidden=true;continueButton.hidden=true;continueButton.disabled=false;continueButton.onclick=null;iris.setAttribute('hidden','');rim.removeAttribute('d');expansionOutline.hidden=true;liveMask?.clear();usingLiveMask=false;board.classList.remove('is-victory-masked');board.style.clipPath='';board.style.opacity='';app.inert=false;
  }
  function start(name){
    reset();reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
    caption.textContent=`You completed "${name}"`;
    description.textContent="Keep going—there's more to discover.";
  }
  function setExpansionOutline(original,expanded,progress){
    if(progress>=1){expansionOutline.hidden=true;return}
    const bounds=victoryBoardBounds(expanded,original,progress);
    Object.assign(expansionOutline.style,{
      left:`${bounds.left}px`,top:`${bounds.top}px`,width:`${bounds.width}px`,height:`${bounds.height}px`,
      borderRadius:`${original.radius}px`,
    });
    expansionOutline.hidden=false;
  }
  function samplePath(d,count=256){
    const path=document.createElementNS(SVG_NS,'path');path.setAttribute('d',d);defs.append(path);
    try{const length=path.getTotalLength();return Array.from({length:count},(_,i)=>path.getPointAtLength(length*i/count))}finally{path.remove()}
  }
  function prepareShape(shape){
    const rect=board.getBoundingClientRect(),radius=Math.min(parseFloat(getComputedStyle(board).borderTopLeftRadius)||0,rect.width/2,rect.height/2),left=1.25,top=1.25,right=rect.width-1.25,bottom=rect.height-1.25,r=Math.max(0,radius-1.25);
    rectanglePoints=samplePath(`M${left+r} ${top}H${right-r}Q${right} ${top} ${right} ${top+r}V${bottom-r}Q${right} ${bottom} ${right-r} ${bottom}H${left+r}Q${left} ${bottom} ${left} ${bottom-r}V${top+r}Q${left} ${top} ${left+r} ${top}Z`);
    const source=samplePath(shape),reference=rectanglePoints.map(p=>({x:p.x/rect.width*200,y:p.y/rect.height*200}));let best=source,bestScore=Infinity;
    for(const candidate of [source,[...source].reverse()])for(let offset=0;offset<source.length;offset++){
      let score=0;for(let i=0;i<source.length;i++){const a=reference[i],b=candidate[(i+offset)%source.length];score+=(a.x-b.x)**2+(a.y-b.y)**2}
      if(score<bestScore){bestScore=score;best=source.map((_,i)=>candidate[(i+offset)%source.length])}
    }
    starPoints=best;
  }
  function drawIris(progress,angle=0){
    const rect=board.getBoundingClientRect();
    const {x,y}=victoryCenter(rect,window.innerWidth,window.innerHeight);
    const finalSize=Math.max(1,Math.min(rect.width*.56,window.innerHeight*.29,1.4*x,1.4*(rect.width-x),1.4*y,1.4*(rect.height-y)));
    Object.assign(iris.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
    iris.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
    const d=victoryMorphPath(rectanglePoints,starPoints,{x,y},finalSize,progress,angle);
    if(usingLiveMask){
      if(!rim.hasAttribute('d'))rim.setAttribute('d',d);
      liveMask.setFrame({contentWidth:board.clientWidth,contentHeight:board.clientHeight,insetX:board.clientLeft,insetY:board.clientTop,path:d,onPresented:()=>rim.setAttribute('d',d)});
    }else{clipShape.setAttribute('d',d);rim.setAttribute('d',d);board.style.clipPath='url(#victory-star-clip)'}
  }
  function animate(duration,draw,token){
    return new Promise(resolve=>{
      let start;finishAnimation=resolve;
      function tick(now){
        if(token!==generation){resolve(false);return}
        start??=now;const progress=Math.min(1,(now-start)/duration);draw(ease(progress),progress);
        if(progress<1)frame=requestAnimationFrame(tick);
        else{finishAnimation=undefined;resolve(true)}
      }
      frame=requestAnimationFrame(tick);
    });
  }
  async function transitionTo(recenter,reveal){
    const token=generation;
    const stars=Object.values(VICTORY_STARS),shape=stars[Math.floor(Math.random()*stars.length)];
    iris.removeAttribute('hidden');prepareShape(shape);
    try{if(liveMask){usingLiveMask=true;board.classList.add('is-victory-masked');drawIris(reducedMotion?1:0)}}catch{usingLiveMask=false;liveMask?.clear();board.classList.remove('is-victory-masked')}
    drawIris(reducedMotion?1:0);recenter(reducedMotion?1:0);
    const closed=await animate(reducedMotion?1:1050,(t,progress)=>{
      if(!reducedMotion){drawIris(t,progress*45*1.05);recenter(t)}
    },token);
    if(!closed||token!==generation)return null;
    if(!reducedMotion){
      let started;
      const spin=now=>{
        if(token!==generation)return;
        started??=now;drawIris(1,45*1.05+(now-started)*.03);recenter(1);
        frame=requestAnimationFrame(spin);
      };
      frame=requestAnimationFrame(spin);
    }
    message.hidden=false;continueButton.hidden=false;
    continueButton.focus({preventScroll:true});
    return new Promise(resolve=>{
      finishAnimation=()=>resolve(null);
      continueButton.onclick=async()=>{
        continueButton.disabled=true;message.hidden=true;cancelAnimationFrame(frame);finishAnimation=undefined;
        try{const card=await reveal();resolve(token===generation?card:null)}
        finally{if(token===generation){iris.setAttribute('hidden','');liveMask?.clear();usingLiveMask=false;board.classList.remove('is-victory-masked');board.style.clipPath='';board.style.opacity='';continueButton.disabled=false}}
      };
    });
  }
  return{start,reset,setExpansionOutline,setLiveMask:mask=>{liveMask=mask},transitionTo};
}
