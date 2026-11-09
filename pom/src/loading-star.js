import {VICTORY_STARS} from './victory-stars.js';

const SVG_NS='http://www.w3.org/2000/svg';
const SAMPLE_COUNT=128;
const TURN_MS=3500;
const TURNS_PER_SHAPE=5;
const MORPH_MS=450;
const STEP_MS=TURN_MS*TURNS_PER_SHAPE+MORPH_MS;
let initialized=false;

// Match the direction and starting point of adjacent outlines so the shape
// changes continuously instead of twisting as it interpolates.
function align(reference,points){
  let best=points,bestScore=Infinity;
  for(const candidate of [points,[...points].reverse()]){
    for(let offset=0;offset<points.length;offset++){
      let score=0;
      for(let i=0;i<points.length;i++){
        const a=reference[i],b=candidate[(i+offset)%points.length];
        score+=(a.x-b.x)**2+(a.y-b.y)**2;
      }
      if(score<bestScore){bestScore=score;best=points.map((_,i)=>candidate[(i+offset)%points.length])}
    }
  }
  return best;
}

export function initLoadingStar(){
  if(initialized)return;
  const panel=document.querySelector('#levelLoading'),svg=panel?.querySelector('.level-loading__star'),path=svg?.querySelector('path'),message=panel?.querySelector('#levelLoadingMessage');
  if(!panel||!svg||!path||!message)return;
  initialized=true;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,shapes,start,lastIndex=-1;
  function sampleShapes(){
    const measure=document.createElementNS(SVG_NS,'path');svg.append(measure);
    try{
      const sampled=Object.values(VICTORY_STARS).map(d=>{
        measure.setAttribute('d',d);const length=measure.getTotalLength();
        if(!Number.isFinite(length)||length<=0)throw Error('Invalid star outline');
        return Array.from({length:SAMPLE_COUNT},(_,i)=>measure.getPointAtLength(length*i/SAMPLE_COUNT));
      });
      // Use a common reference so the last-to-first transition also lines up.
      return sampled.map((shape,i)=>i?align(sampled[0],shape):shape);
    }finally{measure.remove()}
  }
  function tick(now){
    start??=now;
    const elapsed=now-start,phase=elapsed%STEP_MS,index=Math.floor(elapsed/STEP_MS)%shapes.length;
    const t=Math.max(0,(phase-TURN_MS*TURNS_PER_SHAPE)/MORPH_MS),eased=t*t*(3-2*t);
    if(t>0||index!==lastIndex){
      const from=shapes[index],to=shapes[(index+1)%shapes.length];
      path.setAttribute('d',from.map((point,i)=>`${i?'L':'M'}${(point.x+(to[i].x-point.x)*eased).toFixed(2)} ${(point.y+(to[i].y-point.y)*eased).toFixed(2)}`).join('')+'Z');
      lastIndex=index;
    }
    path.setAttribute('transform',`rotate(${elapsed*360/TURN_MS%360} 100 100)`);
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    const loading=!panel.hidden&&message.textContent.trim()==='Loading puzzle…';
    svg.style.visibility=loading?'':'hidden';
    if(!loading||motion.matches){cancelAnimationFrame(frame);frame=0;start=undefined;lastIndex=-1;return}
    if(frame)return;
    try{shapes??=sampleShapes();frame=requestAnimationFrame(tick)}catch{svg.style.visibility=''}
  }
  new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true,characterData:true});
  motion.addEventListener?.('change',sync);
  sync();
}
