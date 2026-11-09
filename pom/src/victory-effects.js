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

// The full-sized canvas stays allocated while its visible area expands.
export function victoryBoardClip(board,original,progress){
  const remaining=1-Math.max(0,Math.min(1,progress));
  const top=Math.max(0,original.top-board.top)*remaining;
  const right=Math.max(0,board.right-original.right)*remaining;
  const bottom=Math.max(0,board.bottom-original.bottom)*remaining;
  const left=Math.max(0,original.left-board.left)*remaining;
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${original.radius*remaining}px)`;
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
  const defs=document.createElementNS(SVG_NS,'defs'),clip=document.createElementNS(SVG_NS,'clipPath'),clipShape=document.createElementNS(SVG_NS,'path'),rim=document.createElementNS(SVG_NS,'path');
  clip.id='victory-star-clip';clip.setAttribute('clipPathUnits','userSpaceOnUse');clip.append(clipShape);defs.append(clip);
  rim.setAttribute('fill','none');rim.setAttribute('stroke','#111');rim.setAttribute('stroke-width','2');rim.setAttribute('vector-effect','non-scaling-stroke');iris.append(defs,rim);
  stage.append(message);document.body.append(iris);
  let generation=0,frame=0,finishAnimation,reducedMotion=false;
  function reset(){
    generation++;cancelAnimationFrame(frame);finishAnimation?.(false);finishAnimation=undefined;
    message.hidden=true;continueButton.hidden=true;continueButton.disabled=false;continueButton.onclick=null;iris.setAttribute('hidden','');board.style.clipPath='';board.style.opacity='';app.inert=false;
  }
  function start(name){
    reset();reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
    caption.textContent=`${name} complete!`;
    description.textContent="Keep going—there's more to discover.";
  }
  function drawIris(amount,angle=(1-amount)*90){
    const rect=board.getBoundingClientRect();
    const {x,y}=victoryCenter(rect,window.innerWidth,window.innerHeight);
    const finalSize=Math.max(1,Math.min(rect.width*.56,window.innerHeight*.29,1.4*x,1.4*(rect.width-x),1.4*y,1.4*(rect.height-y)));
    const initialSize=Math.max(rect.width,rect.height)*16;
    const size=finalSize*Math.pow(initialSize/finalSize,amount),scale=size/200;
    Object.assign(iris.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
    iris.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
    const transform=`translate(${x} ${y}) rotate(${angle}) scale(${scale}) translate(-100 -100)`;
    clipShape.setAttribute('transform',transform);rim.setAttribute('transform',transform);
    board.style.clipPath='url(#victory-star-clip)';
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
    clipShape.setAttribute('d',shape);rim.setAttribute('d',shape);
    iris.removeAttribute('hidden');drawIris(reducedMotion?0:1);recenter(reducedMotion?1:0);
    const closed=await animate(reducedMotion?1:1050,(t,progress)=>{
      if(!reducedMotion){drawIris(1-t,progress*45*1.05);recenter(t)}
    },token);
    if(!closed||token!==generation)return null;
    if(!reducedMotion){
      let started;
      const spin=now=>{
        if(token!==generation)return;
        started??=now;drawIris(0,45*1.05+(now-started)*.03);
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
        finally{if(token===generation){iris.setAttribute('hidden','');board.style.clipPath='';board.style.opacity='';continueButton.disabled=false}}
      };
    });
  }
  return{start,reset,transitionTo};
}
