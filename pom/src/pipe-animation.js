// Normal-pipe entry stays still before the lift begins at 450 ms.
export function normalPipeEntryProgress(elapsed){
  const t=Math.max(0,Math.min(1,(elapsed-450)/550));
  return t*t*(3-2*t);
}

// Shared timing and shape for the normal-pipe transition.
export function normalPipeFrame(elapsed,reduced=false){
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
  let size,visibility,mouth,lift,squint;
  if(elapsed<200){size=1;visibility=1;mouth=1;lift=0;squint=0}
  else if(elapsed<450){size=1;visibility=1;mouth=1;lift=0;squint=smooth((elapsed-200)/250)}
  else if(elapsed<1000){const t=smooth((elapsed-450)/550);size=1-.52*t;visibility=1;mouth=1+.12*t;lift=.20*t;squint=1}
  else if(elapsed<1400){const t=smooth((elapsed-1000)/400);size=.48;visibility=t<.96?1:0;mouth=1.12;lift=.20-.52*t;squint=1}
  else if(elapsed<1700){size=.48;visibility=0;mouth=1.12;lift=-.32;squint=1}
  else if(elapsed<2350){
    const progress=(elapsed-1700)/650,growth=Math.min(1,progress/.3);
    size=.48+.52*growth;visibility=1;mouth=1.12-.12*growth;squint=1-growth;
    if(reduced)lift=-.32*(1-smooth(progress));
    else if(progress<.45){const t=progress/.45;lift=-.32+.77*(1-(1-t)**2)}
    else {const t=(progress-.45)/.55;lift=.45*(1-t*t)}
  }else{size=1;visibility=1;mouth=1;lift=0;squint=0}
  return {size,visibility,mouth,lift,squint};
}
export function invertedPipeEntryFrame(elapsed){
  const t=Math.max(0,Math.min(1,elapsed/500)),ease=t*t*(3-2*t);
  return {progress:ease,size:1-.95*ease};
}
export function invertedPipeExitFrame(elapsed,inverted=true){
  const rawProgress=Math.max(0,elapsed/(inverted?500:650)),progress=Math.min(1,rawProgress);
  const burst=progress<.18?0:Math.min(1,((progress-.18)/.62)**2);
  let rise=0;
  if(!inverted){if(progress<.45){const t=progress/.45;rise=.45*(1-(1-t)**2)}else{const t=(progress-.45)/.55;rise=.45*(1-t*t)}}
  const squash=inverted?(progress<.18?.22*(progress/.18):progress<.8?-.22*Math.sin(Math.PI*(progress-.18)/.62):0):0;
  const impact=inverted?.8:1;
  const stepJump=rawProgress>=impact?Math.min(1,.82+(rawProgress-impact)*(inverted?.45:.18*650/250)):null;
  return {progress,burst,rise,size:Math.min(1,.05+progress/(inverted?.18:.3)*.95),squash,stepJump};
}
