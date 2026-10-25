const SVG_NS='http://www.w3.org/2000/svg';
const COLORS=['#ff7138','#f2a05a','#79a66e','#55a9ae','#ffdf3f','#c9e9d5'];
const ease=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t)};

// The flag remains fixed at the center of its landing square. Pom finishes on
// the approach side; the flag cloth needs a little more clearance on the right.
export function victoryLandingOffset(from,goal,width){
  const direction=from.x<goal.x?-1:from.x>goal.x?1:goal.x<width/2?1:-1;
  return direction<0?-.60:.80;
}
export function victoryArrival(t,offset,reducedMotion=false){
  const progress=ease((t-.10)/.70);
  return{x:offset*progress,y:reducedMotion?0:.18*Math.sin(Math.PI*progress)};
}

export function createVictoryEffects(app){
  const message=document.createElement('div');message.className='victory-message';message.hidden=true;message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const title=document.createElement('strong'),caption=document.createElement('span');title.textContent='Congratulations!';message.append(title,caption);
  const confetti=document.createElement('canvas');confetti.className='victory-confetti';confetti.hidden=true;confetti.setAttribute('aria-hidden','true');
  const context=confetti.getContext('2d');
  const iris=document.createElementNS(SVG_NS,'svg');iris.classList.add('victory-transition');iris.setAttribute('hidden','');iris.setAttribute('aria-hidden','true');
  const shade=document.createElementNS(SVG_NS,'path'),rim=document.createElementNS(SVG_NS,'circle');
  shade.setAttribute('fill','#292537');shade.setAttribute('fill-rule','evenodd');rim.setAttribute('fill','none');rim.setAttribute('stroke','#fffaf0');rim.setAttribute('stroke-width','2');iris.append(shade,rim);
  document.body.append(confetti,message,iris);
  let particles=[],generation=0,frame=0,finishAnimation,width=0,height=0,pixelRatio=1,reducedMotion=false;

  function resize(){
    const w=window.innerWidth,h=window.innerHeight,ratio=Math.min(devicePixelRatio||1,2);
    if(w===width&&h===height&&ratio===pixelRatio)return;
    width=w;height=h;pixelRatio=ratio;confetti.width=Math.round(w*ratio);confetti.height=Math.round(h*ratio);
  }
  function reset(){
    generation++;cancelAnimationFrame(frame);finishAnimation?.(false);finishAnimation=undefined;
    message.hidden=true;confetti.hidden=true;iris.setAttribute('hidden','');iris.style.opacity='';particles=[];app.inert=false;
    context?.clearRect(0,0,confetti.width,confetti.height);
  }
  function start(name,origin,top){
    reset();resize();reducedMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
    caption.textContent=`${name} complete!`;message.style.top=`${top}px`;message.hidden=false;
    if(reducedMotion||!context)return;
    confetti.hidden=false;
    const scale=Math.min(1,Math.max(.6,width/700));
    particles=Array.from({length:width<600?65:100},(_,i)=>({
      x:(origin.x+(Math.random()-.5)*50)/width,y:origin.y/height,
      vx:(Math.random()-.5)*650*scale,vy:-(190+Math.random()*380)*scale,
      spin:(Math.random()-.5)*12,angle:Math.random()*Math.PI,
      size:5+Math.random()*5,color:COLORS[i%COLORS.length],delay:Math.random()*.15,
    }));
  }
  function update(elapsed,top){
    if(message.hidden)return;resize();message.style.top=`${top}px`;
    if(!context||confetti.hidden)return;
    context.setTransform(pixelRatio,0,0,pixelRatio,0,0);context.clearRect(0,0,width,height);
    for(const particle of particles){
      const t=elapsed/1000-particle.delay;if(t<0)continue;
      const x=particle.x*width+particle.vx*t,y=particle.y*height+particle.vy*t+180*t*t;
      if(y>height+30)continue;
      context.save();context.translate(x,y);context.rotate(particle.angle+particle.spin*t);
      context.globalAlpha=Math.min(1,Math.max(0,(3.2-t)/.5));context.fillStyle=particle.color;
      context.fillRect(-particle.size/2,-particle.size/4,particle.size,particle.size*.5);context.restore();
    }
  }
  function drawIris(center,amount){
    resize();
    const radius=Math.hypot(width,height)*amount,x=center.x,y=center.y;
    iris.setAttribute('viewBox',`0 0 ${width} ${height}`);
    shade.setAttribute('d',`M0 0H${width}V${height}H0Z M${x-radius} ${y}a${radius} ${radius} 0 1 0 ${2*radius} 0a${radius} ${radius} 0 1 0 ${-2*radius} 0Z`);
    rim.setAttribute('cx',x);rim.setAttribute('cy',y);rim.setAttribute('r',radius);rim.style.display=radius>0?'':'none';
  }
  function animate(duration,draw,token){
    return new Promise(resolve=>{
      let start;finishAnimation=resolve;
      function tick(now){
        if(token!==generation){resolve(false);return}
        start??=now;const progress=Math.min(1,(now-start)/duration);draw(ease(progress));
        if(progress<1)frame=requestAnimationFrame(tick);
        else{finishAnimation=undefined;resolve(true)}
      }
      frame=requestAnimationFrame(tick);
    });
  }
  async function transitionTo(origin,reveal){
    const token=generation;app.inert=true;message.hidden=true;confetti.hidden=true;iris.removeAttribute('hidden');
    iris.style.opacity=reducedMotion?'0':'';
    drawIris(origin,reducedMotion?0:1);
    const closed=await animate(reducedMotion?140:850,t=>{
      if(reducedMotion)iris.style.opacity=String(t);else drawIris(origin,1-t);
    },token);
    if(!closed||token!==generation)return null;
    try{
      const card=await reveal();
      if(token!==generation)return null;
      const preview=card?.querySelector('.puzzle-thumbnail')??card,rect=preview?.getBoundingClientRect();
      const center=rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:{x:width/2,y:height/2};
      const opened=await animate(reducedMotion?140:750,t=>{
        if(reducedMotion)iris.style.opacity=String(1-t);else drawIris(center,t);
      },token);
      return opened&&token===generation?card:null;
    }finally{if(token===generation){iris.setAttribute('hidden','');iris.style.opacity='';app.inert=false}}
  }
  return{start,update,reset,transitionTo,get messageHeight(){return message.getBoundingClientRect().height}};
}
