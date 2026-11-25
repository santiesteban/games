// Opt-in field measurement for manual device testing.
export function installPerformanceReadout(getContext){
  const panel=document.createElement('aside');
  panel.setAttribute('aria-label','Performance test');
  panel.style.cssText='position:fixed;z-index:10000;top:8px;left:8px;max-width:min(290px,80vw);padding:8px;background:#fff;color:#171717;border:2px solid #333;border-radius:8px;font:14px/1.35 system-ui;box-shadow:0 2px 8px #0004';
  const title=document.createElement('strong');title.textContent='⋮⋮ Performance test — drag';
  title.style.cssText='display:block;min-height:28px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none';
  let drag=null;
  function positionPanel(left,top){
    const maxLeft=Math.max(0,window.innerWidth-panel.offsetWidth),maxTop=Math.max(0,window.innerHeight-title.offsetHeight);
    panel.style.left=`${Math.max(0,Math.min(maxLeft,left))}px`;
    panel.style.top=`${Math.max(0,Math.min(maxTop,top))}px`;
  }
  title.addEventListener('pointerdown',event=>{
    if(event.button!==0||drag)return;
    const rect=panel.getBoundingClientRect();drag={pointer:event.pointerId,x:event.clientX-rect.left,y:event.clientY-rect.top};
    title.setPointerCapture(event.pointerId);title.style.cursor='grabbing';event.preventDefault();
  });
  title.addEventListener('pointermove',event=>{
    if(drag?.pointer!==event.pointerId)return;
    positionPanel(event.clientX-drag.x,event.clientY-drag.y);event.preventDefault();
  });
  function endDrag(event){if(drag?.pointer===event.pointerId){drag=null;title.style.cursor='grab'}}
  title.addEventListener('pointerup',endDrag);title.addEventListener('pointercancel',endDrag);title.addEventListener('lostpointercapture',endDrag);
  window.addEventListener('resize',()=>{const rect=panel.getBoundingClientRect();positionPanel(rect.left,rect.top)});
  const output=document.createElement('div');output.textContent='Tap Start, move Pom, then tap Stop.';
  const button=document.createElement('button');button.type='button';button.textContent='Start';
  button.style.cssText='margin:6px 6px 0 0;padding:6px 12px;font:inherit';
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copy result';copy.hidden=true;
  copy.style.cssText='margin-top:6px;padding:6px 12px;font:inherit';
  const details=document.createElement('textarea');details.readOnly=true;details.hidden=true;
  details.setAttribute('aria-label','Performance result to copy');details.style.cssText='width:100%;height:5em;margin-top:6px;font:12px system-ui';
  panel.append(title,output,button,copy,details);document.body.append(panel);
  let running=false,last=null,frames=[],frameId=0,hidden=false,started=0,context;
  let selectionAt=null,pendingSelection=null,moving=false,movementLast=null,movementFrames=[],selectionDelays=[],moves=0,timings={},drawCounts={};
  document.addEventListener('visibilitychange',()=>{if(running&&document.hidden){hidden=true;last=null;movementLast=null}});
  function tick(now){
    if(!running)return;
    if(document.hidden){hidden=true;last=null;movementLast=null}
    else{if(last!==null)frames.push(now-last);last=now;if(moving){if(movementLast!==null)movementFrames.push(now-movementLast);movementLast=now}}
    if(now-started>=120000){stop();return}
    frameId=requestAnimationFrame(tick);
  }
  function stop(){
    running=false;cancelAnimationFrame(frameId);button.textContent='Start';
    const elapsed=(performance.now()-started)/1000,sorted=frames.slice().sort((a,b)=>a-b);
    if(!sorted.length){output.textContent='No frames recorded. Try again.';return}
    const p95=sorted[Math.ceil(sorted.length*.95)-1],worst=sorted.at(-1),slow=sorted.filter(ms=>ms>50).length;
    const motion=movementFrames.slice().sort((a,b)=>a-b),moveWorst=motion.at(-1),moveP95=motion[Math.ceil(motion.length*.95)-1];
    const movement=motion.length?`Moving: ${moves} moves; frames: ${motion.length}; average FPS: ${(motion.length*1000/motion.reduce((a,b)=>a+b,0)).toFixed(1)}; p95: ${moveP95.toFixed(1)}ms; worst: ${moveWorst.toFixed(1)}ms; over 50ms: ${motion.filter(ms=>ms>50).length}`:'Moving: no movement frames captured';
    const selection=selectionDelays.length?`Tap to movement: ${selectionDelays.map(ms=>ms.toFixed(1)).join(', ')}ms`:'Tap to movement: no board-tap movement captured';
    const endContext=getContext();
    const settingsChanged=JSON.stringify(context)!==JSON.stringify(endContext);
    const controls=Object.entries(context.controls).map(([name,value])=>`${name}: ${value}`).join('; ');
    const timingReport=Object.entries(timings).map(([name,values])=>{
      const sorted=values.slice().sort((a,b)=>a-b),average=values.reduce((a,b)=>a+b,0)/values.length;
      return `${name}: ${values.length} calls; avg ${average.toFixed(1)}ms; p95 ${sorted[Math.ceil(sorted.length*.95)-1].toFixed(1)}ms; max ${sorted.at(-1).toFixed(1)}ms`;
    });
    const renderPasses=timings['3D render stages CPU']?.length??0;
    const drawReport=Object.entries(drawCounts).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([kind,count])=>`${kind}: ${count} (${renderPasses?(count/renderPasses).toFixed(1):'?'} per 3D stage)`).join('; ');
    const text=[`Little Ledges performance: ${context.build}`,`Level: ${context.level}; environment: ${context.environment}`,`Shadows: ${context.shadows}; highlight: ${context.highlight}`,`Diagnostic: ${context.diagnostic}`,`Settings: ${controls}`,`Top faces: ${context.topFaceStyle}; marker shape: ${context.markerShape}; Pom eyes: ${context.pomEyeStyle}`,`Level preferences: ${JSON.stringify(context.preferences)}`,`Camera: ${JSON.stringify(context.camera)}; puzzle projection: ${context.projectionBackend}; reduced motion: ${context.reducedMotion}; floor guide: ${context.floorGuideVisible?'on':'off'}`,settingsChanged?`Settings or level changed during recording; end state: ${JSON.stringify(endContext)}`:'Settings and level unchanged during recording.',`Device: ${navigator.userAgent}`,`Screen: ${innerWidth}x${innerHeight} CSS; pixel ratio: ${devicePixelRatio}; canvas: ${context.canvas}`,`Duration: ${elapsed.toFixed(1)}s; frames: ${sorted.length}`,`Average FPS: ${(sorted.length*1000/sorted.reduce((a,b)=>a+b,0)).toFixed(1)}; lowest instant FPS: ${(1000/worst).toFixed(1)}`,`95th percentile frame: ${p95.toFixed(1)}ms; worst frame: ${worst.toFixed(1)}ms; frames over 50ms: ${slow}`,selection,movement,...timingReport,`Draw submissions while moving: ${drawReport||'none recorded'}`,'Draw grouping is by API and vertex/index count; submission counts can include 2D work. Instrumentation adds overhead. CPU timings overlap and omit asynchronous GPU work.',moving?'Movement was still in progress when recording stopped.':'',hidden?'Result interrupted: page was hidden.':'Page remained visible.'].join('\n');
    output.textContent=motion.length?`Moving: ${(motion.length*1000/motion.reduce((a,b)=>a+b,0)).toFixed(1)} FPS · worst: ${moveWorst.toFixed(0)} ms · slow frames: ${motion.filter(ms=>ms>50).length}${hidden?' · interrupted':''}`:'No movement captured. Start again and move Pom.';
    details.value=text;details.hidden=false;copy.hidden=false;
  }
  button.addEventListener('click',()=>{
    if(running){stop();return}
    context=getContext();copy.textContent='Copy result';frames=[];movementFrames=[];selectionDelays=[];selectionAt=null;pendingSelection=null;moving=false;movementLast=null;moves=0;timings={};drawCounts={};last=null;hidden=document.hidden;started=performance.now();running=true;details.hidden=true;copy.hidden=true;
    output.textContent='Recording… Move Pom, then tap Stop.';button.textContent='Stop';frameId=requestAnimationFrame(tick);
  });
  copy.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(details.value);copy.textContent='Copied'}catch{details.focus();details.select();copy.textContent='Select and copy text'}
  });
  return {
    isMeasuring(){return running&&moving},
    recordTiming(name,duration){if(running&&moving)(timings[name]??=[]).push(duration)},
    recordDraw(name,count){if(running&&moving){const key=`${name} (${count} vertices/indices)`;drawCounts[key]=(drawCounts[key]??0)+1}},
    selectionStart(){if(running)selectionAt=performance.now()},
    selectionEnd(){selectionAt=null},
    movementRequested(){if(running)pendingSelection=selectionAt},
    movementStart(){if(!running)return;if(pendingSelection!==null)selectionDelays.push(performance.now()-pendingSelection);pendingSelection=null;moving=true;movementLast=null;moves++},
    movementEnd(){moving=false;movementLast=null},
  };
}
