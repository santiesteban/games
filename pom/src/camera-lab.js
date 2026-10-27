// Temporary, URL-gated study. Values stay in this page and never enter level JSON.
export function createCameraLab({levels,environments,onChange,onLevel}){
  const state={projection:'orthographic',motion:'orbit',truck:0,fov:35,followX:false,followY:false,yaw:20,pitch:25,setting:'stage',backdrop:'turning',holdFraming:true,horizonLock:true,horizonGuide:true,environment:'japan-spring',background:true,foreground:true,props:true,guides:true};
  const panel=document.createElement('aside');panel.className='camera-lab';panel.setAttribute('aria-label','Camera and scenery study');
  panel.innerHTML=`<header><h2>Camera & scenery</h2><button type="button" data-collapse aria-expanded="true">Hide</button></header>
    <output data-horizon-measure class="camera-lab-measure" aria-live="polite"></output>
    <div class="camera-lab-body" tabindex="0" role="region" aria-label="Camera controls scroll area">
      <p class="camera-lab-copy">Compare the same puzzle position. Changes here last only for this visit.</p>
      <label>Puzzle<select data-level aria-label="Puzzle"></select></label>
      <fieldset><legend>Camera</legend><div class="camera-lab-presets">
        <button type="button" data-preset="current">Current oblique</button><button type="button" data-preset="gentle">Gentle ortho</button>
        <button type="button" data-preset="three-quarter">Three-quarter</button><button type="button" data-preset="front">Front artwork</button>
        <button type="button" data-preset="perspective">Perspective + follow</button>
      </div>
      <label>Camera movement<select data-motion aria-label="Camera movement"><option value="orbit">Orbit around puzzle</option><option value="track">Track sideways, fixed direction</option></select></label>
      <label data-fov-field>Field of view <output data-fov-output></output><input data-fov aria-label="Field of view" type="range" min="25" max="60" step="1" value="35"></label>
      <label>Side angle <output data-yaw-output></output><input data-yaw aria-label="Side angle" type="range" min="-40" max="40" step="1" value="20"></label>
      <label data-truck-field>Sideways position <output data-truck-output></output><input data-truck aria-label="Sideways position" type="range" min="-60" max="60" step="1" value="0"></label>
      <div class="camera-lab-orbit"><button type="button" data-orbit="35">Orbit left</button><button type="button" data-orbit="0">Center</button><button type="button" data-orbit="-35">Orbit right</button></div>
      <label class="camera-lab-check"><input type="checkbox" data-holdFraming checked> Keep framing while orbiting</label>
      <label>Downward angle <output data-pitch-output></output><input data-pitch aria-label="Downward angle" type="range" min="0" max="45" step="1" value="25"></label>
      <label class="camera-lab-check"><input type="checkbox" data-followX> Follow Pom horizontally</label>
      <label class="camera-lab-check"><input type="checkbox" data-followY> Follow Pom vertically</label>
      <button type="button" data-center-pom>Center on Pom</button>
      <p class="camera-lab-copy">Side movement holds the downward angle. Track mode moves the camera and target together. Presets and Fit entire puzzle can change framing.</p>
      <p data-camera-note class="camera-lab-copy" aria-live="polite"></p></fieldset>
      <fieldset><legend>Scenery</legend><div class="camera-lab-presets"><button type="button" data-setting="stage">Wall & ground set</button><button type="button" data-setting="landscape">Landscape</button></div>
      <label data-backdrop-field>Set backdrop<select data-backdrop aria-label="Set backdrop"><option value="fixed">Fixed wall</option><option value="turning" selected>Wall turns with the view</option><option value="curved">Curved wall</option></select></label>
      <label class="camera-lab-check"><input type="checkbox" data-horizonLock checked> Hold horizon height during orbit</label>
      <label class="camera-lab-check"><input type="checkbox" data-horizonGuide checked> Horizontal reference line</label>
      <label>Artwork<select data-environment aria-label="Artwork"></select></label>
      <p data-scenery-note class="camera-lab-copy"></p>
      <label class="camera-lab-check"><input type="checkbox" data-background checked> Background</label>
      <label class="camera-lab-check"><input type="checkbox" data-foreground checked> Ground artwork</label>
      <label class="camera-lab-check"><input type="checkbox" data-props checked> Landscape depth elements</label>
      <label class="camera-lab-check"><input type="checkbox" data-guides checked> Playable ground grid</label></fieldset>
      <button type="button" data-fit>Fit entire puzzle</button>
      <p class="camera-lab-copy">Try pulling pieces to depths 1, 2 and 3 and walking behind them. Left/right arrow keys orbit by 5° or track by 5% of the puzzle width. Front artwork is for inspection: its floor is edge-on.</p>
    </div>`;
  const stage=document.querySelector('.stage');stage.append(panel);stage.classList.add('has-camera-lab');
  // LittleJS's document wheel/touch handlers cancel scrolling outside form
  // fields. Keep native panel gestures local without cancelling their defaults.
  for(const type of ['wheel','touchstart','touchmove','touchend','touchcancel','pointerdown','pointermove','pointerup','mousedown','mousemove','mouseup'])panel.addEventListener(type,event=>event.stopPropagation(),{passive:true});
  panel.addEventListener('keydown',event=>event.stopPropagation());
  document.querySelector('#viewController').hidden=true;
  const guide=document.createElement('div');guide.className='camera-horizon-guide';guide.setAttribute('aria-hidden','true');document.querySelector('#canvasWrap').append(guide);
  const levelSelect=panel.querySelector('[data-level]');
  for(const level of levels.filter(level=>level.compatibility.playable&&level.kind==='puzzle'))levelSelect.add(new Option(`${level.number} · ${level.name}`,level.id));
  const environmentSelect=panel.querySelector('[data-environment]');
  for(const environment of environments)environmentSelect.add(new Option(environment.name,environment.id));
  environmentSelect.value=state.environment;
  let activePreset='gentle';
  function refresh(){
    for(const button of panel.querySelectorAll('[data-preset]'))button.setAttribute('aria-pressed',String(button.dataset.preset===activePreset));
    for(const button of panel.querySelectorAll('[data-setting]'))button.setAttribute('aria-pressed',String(button.dataset.setting===state.setting));
    panel.querySelector('[data-yaw-output]').value=state.projection==='oblique'?'Fixed':`${state.yaw}°`;panel.querySelector('[data-pitch-output]').value=state.projection==='oblique'?'Fixed':`${state.pitch}°`;
    for(const id of ['yaw','pitch']){panel.querySelector(`[data-${id}]`).value=state[id];panel.querySelector(`[data-${id}]`).disabled=state.projection==='oblique'}
    const perspective=state.projection==='perspective',tracking=state.motion==='track',original=state.projection==='oblique';
    panel.querySelector('[data-motion]').value=state.motion;panel.querySelector('[data-motion]').disabled=original;
    panel.querySelector('[data-yaw]').disabled=original||tracking;if(tracking&&!original)panel.querySelector('[data-yaw-output]').value='Fixed frontal';
    panel.querySelector('[data-fov-field]').hidden=!perspective;panel.querySelector('[data-fov]').value=state.fov;panel.querySelector('[data-fov-output]').value=`${state.fov}°`;
    panel.querySelector('[data-truck-field]').hidden=!tracking||original;panel.querySelector('[data-truck]').value=state.truck;panel.querySelector('[data-truck-output]').value=`${state.truck}%`;
    for(const id of ['followX','followY']){panel.querySelector(`[data-${id}]`).checked=state[id];panel.querySelector(`[data-${id}]`).disabled=original}
    for(const button of panel.querySelectorAll('[data-orbit]'))button.textContent=Number(button.dataset.orbit)===0?'Center':`${tracking?'Track':'Orbit'} ${Number(button.dataset.orbit)>0?'left':'right'}`;
    panel.querySelector('[data-center-pom]').disabled=original;
    panel.querySelector('[data-camera-note]').textContent=original?'Original sheared geometry and camera angles.':state.pitch===0?'Front inspection view. Raise the downward angle to play.':perspective?'Perspective camera. Field of view changes keep the target at a comparable size. Pan to inspect; a movement tap resumes smooth centered follow. Center on Pom recenters immediately; scenery stays in the world.':'Straight blocks with a rotated orthographic camera.';
    const fixed=state.setting==='stage'&&state.backdrop==='fixed';
    panel.querySelector('[data-backdrop-field]').hidden=state.setting!=='stage';
    panel.querySelector('[data-horizonLock]').disabled=fixed;panel.querySelector('[data-horizonLock]').checked=!fixed&&state.horizonLock;
    panel.querySelector('[data-scenery-note]').textContent=state.setting==='landscape'?'Distant scenery faces the viewing direction. Trees, hills and foreground plants stay in the world.':fixed?'A fixed wall intentionally shows a tilted join during orbit. Use the turning wall for a level join.':state.backdrop==='curved'?'A vertical curved wall meets the ground at 90°. Its join bows on screen; the height lock holds its center, not the entire curve.':'The flat backdrop turns with the viewing direction and meets the ground at 90°. Its join stays horizontal.';
    panel.querySelector('[data-props]').disabled=state.setting!=='landscape';
    for(const button of panel.querySelectorAll('[data-orbit]'))button.disabled=state.projection==='oblique';
  }
  function change(options={}){refresh();onChange(options)}
  function orbitTo(value){if(state.projection==='oblique')return;if(state.motion==='track')state.truck=Math.max(-60,Math.min(60,value));else state.yaw=Math.max(-40,Math.min(40,value));activePreset='custom';change({orbit:true,refit:!state.holdFraming})}
  panel.querySelector('[data-collapse]').onclick=event=>{const collapsed=panel.classList.toggle('is-collapsed');event.target.textContent=collapsed?'Show':'Hide';event.target.setAttribute('aria-expanded',String(!collapsed))};
  levelSelect.onchange=()=>onLevel(levelSelect.value);
  environmentSelect.onchange=()=>{state.environment=environmentSelect.value;change()};
  for(const button of panel.querySelectorAll('[data-preset]'))button.onclick=()=>{
    activePreset=button.dataset.preset;state.projection=activePreset==='current'?'oblique':activePreset==='perspective'?'perspective':'orthographic';
    state.motion=activePreset==='perspective'?'track':'orbit';state.truck=0;state.followX=state.followY=activePreset==='perspective';
    if(activePreset==='perspective'){state.setting='landscape';state.horizonLock=false;state.fov=35}
    [state.yaw,state.pitch]=activePreset==='perspective'?[0,20]:activePreset==='three-quarter'?[35,35]:activePreset==='front'?[0,0]:[20,25];change({refit:true});
  };
  for(const button of panel.querySelectorAll('[data-setting]'))button.onclick=()=>{state.setting=button.dataset.setting;change()};
  panel.querySelector('[data-yaw]').oninput=event=>orbitTo(Number(event.target.value));
  panel.querySelector('[data-truck]').oninput=event=>orbitTo(Number(event.target.value));
  panel.querySelector('[data-fov]').oninput=event=>{state.fov=Number(event.target.value);change()};
  panel.querySelector('[data-motion]').onchange=event=>{state.motion=event.target.value;state.truck=0;change()};
  panel.querySelector('[data-center-pom]').onclick=()=>onChange({centerPom:true});
  panel.querySelector('[data-pitch]').oninput=event=>{state.pitch=Number(event.target.value);activePreset='custom';change()};
  for(const button of panel.querySelectorAll('[data-orbit]'))button.onclick=()=>orbitTo(Number(button.dataset.orbit)*(state.motion==='track'?-1:1));
  panel.querySelector('[data-backdrop]').onchange=event=>{state.backdrop=event.target.value;change()};
  for(const id of ['background','foreground','props','guides','holdFraming','horizonLock','horizonGuide','followX','followY'])panel.querySelector(`[data-${id}]`).onchange=event=>{state[id]=event.target.checked;change()};
  panel.querySelector('[data-fit]').onclick=()=>onChange({refit:true});refresh();
  return{state,panel,orbitBy(delta){orbitTo(state.motion==='track'?state.truck-delta:state.yaw+delta)},setLevel(id){levelSelect.value=id},measure({percent,tilt,curved,unit,cameraHeight}){
    if(!Number.isFinite(percent)){panel.querySelector('[data-horizon-measure]').textContent='Backdrop join is outside the view.';guide.hidden=true;return}
    panel.querySelector('[data-horizon-measure]').textContent=`${curved?'Center of join':'Horizon / join'}: ${percent.toFixed(2)}% from top${curved?' · curved':` · ${(Math.abs(tilt)<.005?0:tilt).toFixed(2)}° tilt`}`;
    guide.hidden=!state.horizonGuide||percent<0||percent>100;guide.style.top=`${percent}%`;
    const wrap=document.querySelector('#canvasWrap');wrap.dataset.horizonPercent=percent.toFixed(5);wrap.dataset.horizonTilt=tilt.toFixed(5);wrap.dataset.orbitAngle=String(state.yaw);wrap.dataset.orbitPitch=String(state.pitch);wrap.dataset.orbitUnit=unit.toFixed(5);wrap.dataset.orbitCameraHeight=cameraHeight.toFixed(5);
  },setBusy(busy){for(const el of panel.querySelectorAll('button,input,select'))if(!el.matches('[data-collapse]'))el.disabled=busy;if(!busy)refresh()}};
}
