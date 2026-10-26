// Temporary, URL-gated study. Values stay in this page and never enter level JSON.
export function createCameraLab({levels,environments,onChange,onLevel}){
  const state={projection:'orthographic',yaw:20,pitch:25,setting:'stage',environment:'japan-spring',background:true,foreground:true,props:true,guides:true};
  const panel=document.createElement('aside');panel.className='camera-lab';panel.setAttribute('aria-label','Camera and scenery study');
  panel.innerHTML=`<header><h2>Camera & scenery</h2><button type="button" data-collapse aria-expanded="true">Hide</button></header>
    <div class="camera-lab-body">
      <p class="camera-lab-copy">Compare the same puzzle position. Changes here last only for this visit.</p>
      <label>Puzzle<select data-level aria-label="Puzzle"></select></label>
      <fieldset><legend>Camera</legend><div class="camera-lab-presets">
        <button type="button" data-preset="current">Current oblique</button><button type="button" data-preset="gentle">Gentle ortho</button>
        <button type="button" data-preset="three-quarter">Three-quarter</button><button type="button" data-preset="front">Front artwork</button>
      </div>
      <label>Side angle <output data-yaw-output></output><input data-yaw aria-label="Side angle" type="range" min="-40" max="40" step="1" value="20"></label>
      <label>Downward angle <output data-pitch-output></output><input data-pitch aria-label="Downward angle" type="range" min="0" max="45" step="1" value="25"></label>
      <p data-camera-note class="camera-lab-copy" aria-live="polite"></p></fieldset>
      <fieldset><legend>Scenery</legend><div class="camera-lab-presets"><button type="button" data-setting="stage">Wall & ground set</button><button type="button" data-setting="landscape">Landscape</button></div>
      <label>Artwork<select data-environment aria-label="Artwork"></select></label>
      <p data-scenery-note class="camera-lab-copy"></p>
      <label class="camera-lab-check"><input type="checkbox" data-background checked> Background</label>
      <label class="camera-lab-check"><input type="checkbox" data-foreground checked> Ground artwork</label>
      <label class="camera-lab-check"><input type="checkbox" data-props checked> Landscape depth elements</label>
      <label class="camera-lab-check"><input type="checkbox" data-guides checked> Playable ground grid</label></fieldset>
      <button type="button" data-fit>Fit entire puzzle</button>
      <p class="camera-lab-copy">Try pulling pieces to depths 1, 2 and 3, walking behind them, and turning the cube. Front artwork is for inspection: its floor is edge-on.</p>
    </div>`;
  const stage=document.querySelector('.stage');stage.append(panel);stage.classList.add('has-camera-lab');
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
    panel.querySelector('[data-camera-note]').textContent=state.projection==='oblique'?'Original sheared geometry and camera angles.':state.pitch===0?'Front inspection view. Raise the downward angle to play.':'Straight blocks with a rotated orthographic camera.';
    panel.querySelector('[data-scenery-note]').textContent=state.setting==='stage'?'The painting is on a vertical wall. The foreground lies on a floor meeting it at 90° behind the puzzle.':'A distant painted backdrop, a continuous ground plane, and simple trees, hills and foreground plants placed at different depths. These are scenery stand-ins.';
    panel.querySelector('[data-props]').disabled=state.setting!=='landscape';
  }
  function change(resetAngle=false){refresh();onChange({resetAngle})}
  panel.querySelector('[data-collapse]').onclick=event=>{const collapsed=panel.classList.toggle('is-collapsed');event.target.textContent=collapsed?'Show':'Hide';event.target.setAttribute('aria-expanded',String(!collapsed))};
  levelSelect.onchange=()=>onLevel(levelSelect.value);
  environmentSelect.onchange=()=>{state.environment=environmentSelect.value;change()};
  for(const button of panel.querySelectorAll('[data-preset]'))button.onclick=()=>{
    activePreset=button.dataset.preset;state.projection=activePreset==='current'?'oblique':'orthographic';
    [state.yaw,state.pitch]=activePreset==='three-quarter'?[35,35]:activePreset==='front'?[0,0]:[20,25];change(true);
  };
  for(const button of panel.querySelectorAll('[data-setting]'))button.onclick=()=>{state.setting=button.dataset.setting;change()};
  for(const id of ['yaw','pitch'])panel.querySelector(`[data-${id}]`).oninput=event=>{state[id]=Number(event.target.value);activePreset='custom';change(true)};
  for(const id of ['background','foreground','props','guides'])panel.querySelector(`[data-${id}]`).onchange=event=>{state[id]=event.target.checked;change()};
  panel.querySelector('[data-fit]').onclick=()=>onChange();refresh();
  return{state,panel,setLevel(id){levelSelect.value=id},setBusy(busy){for(const el of panel.querySelectorAll('button,input,select'))if(!el.matches('[data-collapse]'))el.disabled=busy;if(!busy)refresh()}};
}
