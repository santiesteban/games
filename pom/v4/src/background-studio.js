import { ENVIRONMENTS, environmentById, environmentCacheKey } from './environments.js';

const DRAFT_KEY='little-ledges:v4:background-studio',APPLIED_KEY='little-ledges:v4:applied-background';

export function createBackgroundStudio(panel,onChange){
  const defaultOverlay=()=>({color:'#fffaf0',opacity:0});
  const defaultPreview=()=>({environment:'highway-desert',composition:'auto',layers:'both',showGuides:true,overlays:{background:defaultOverlay(),foreground:defaultOverlay()},anchors:{}});
  const validAnchors=new Set(ENVIRONMENTS.flatMap(entry=>[entry.id,...Object.keys(entry.variants??{}).map(variant=>`${entry.id}:${variant}`)]));
  const numeric=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
  function normalize(saved){
    if(!saved||!ENVIRONMENTS.some(entry=>entry.id===saved.environment))return null;
    const result=defaultPreview();result.environment=saved.environment;
    if(['auto','portrait','landscape','legacy'].includes(saved.composition))result.composition=saved.composition;
    if(['both','background','foreground'].includes(saved.layers))result.layers=saved.layers;
    if(typeof saved.showGuides==='boolean')result.showGuides=saved.showGuides;
    for(const id of ['background','foreground']){const input=saved.overlays?.[id];if(/^#[0-9a-f]{6}$/i.test(input?.color??''))result.overlays[id].color=input.color;result.overlays[id].opacity=numeric(input?.opacity,0,1,0)}
    for(const [key,value]of Object.entries(saved.anchors??{}))if(validAnchors.has(key)&&typeof value==='number'&&Number.isFinite(value))result.anchors[key]=numeric(value,.05,.95,.7);
    return result;
  }
  function read(key){try{return normalize(JSON.parse(localStorage.getItem(key)||'null'))}catch{return null}}
  function save(key,value){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  let applied=read(APPLIED_KEY),values=read(DRAFT_KEY)??structuredClone(applied??defaultPreview()),currentComposition=environmentById(values.environment);
  const anchorFor=(entry,configuration=values)=>configuration?.anchors?.[environmentCacheKey(entry)]??entry.groundAnchorY;
  function changed(){
    const saved=save(DRAFT_KEY,values);onChange();
    applicationStatus.textContent=saved?'Draft saved. Choose Apply to all levels when ready.':'Preview updated. This browser could not save the draft.';
  }
  for(const event of ['wheel','touchstart','touchmove','touchend','keydown'])panel.addEventListener(event,event=>event.stopPropagation(),{passive:true});
  const header=document.createElement('header');header.className='design-panel-header';
  const title=document.createElement('h2');title.textContent='Background controls';
  const collapse=document.createElement('button');collapse.type='button';collapse.className='btn';collapse.textContent='Hide';collapse.setAttribute('aria-expanded','true');collapse.setAttribute('aria-controls','backgroundControlsBody');
  collapse.onclick=()=>{const hidden=panel.classList.toggle('is-collapsed');collapse.textContent=hidden?'Show':'Hide';collapse.setAttribute('aria-expanded',String(!hidden))};header.append(title,collapse);
  const body=document.createElement('div');body.id='backgroundControlsBody';body.className='design-controls-body background-controls-body';body.tabIndex=0;body.setAttribute('role','region');body.setAttribute('aria-label','Background settings');
  const copy=document.createElement('p');copy.className='design-copy';copy.textContent='Preview scenery here, then apply the environment, composition, anchors, layers, overlays and floor guide to all levels.';body.append(copy);
  function field(label,input,parent=body){const row=document.createElement('div');row.className='design-field';const text=document.createElement('label');text.htmlFor=input.id;text.textContent=label;row.append(text,input);parent.append(row);return row}
  const environment=document.createElement('select');environment.id='backgroundEnvironment';
  for(const entry of ENVIRONMENTS){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.name;environment.append(option)}environment.value=values.environment;field('Environment',environment);
  const composition=document.createElement('select');composition.id='backgroundComposition';
  for(const [id,name]of [['auto','Automatic'],['portrait','Portrait'],['landscape','Landscape'],['legacy','Original panorama']]){const option=document.createElement('option');option.value=id;option.textContent=name;composition.append(option)}const compositionRow=field('Composition',composition);
  const info=document.createElement('p');info.className='design-copy';body.append(info);
  const layers=document.createElement('select');layers.id='backgroundLayers';for(const [id,name]of [['both','Both layers'],['background','Background only'],['foreground','Foreground only']]){const option=document.createElement('option');option.value=id;option.textContent=name;layers.append(option)}field('Show',layers);
  const anchor=document.createElement('input');anchor.id='backgroundAnchor';anchor.type='range';anchor.min='5';anchor.max='95';anchor.step='any';anchor.value='80';
  const anchorRow=field('Ground anchor',anchor),output=document.createElement('output');output.htmlFor=anchor.id;anchorRow.append(output);
  const resetAnchor=document.createElement('button');resetAnchor.type='button';resetAnchor.className='design-reset';resetAnchor.textContent='Reset';resetAnchor.setAttribute('aria-label','Reset ground anchor to environment default');anchorRow.append(resetAnchor);
  const guide=document.createElement('input');guide.id='backgroundGuides';guide.type='checkbox';guide.checked=true;guide.setAttribute('role','switch');field('Show floor guide',guide).classList.add('setting-toggle');
  const overlayControls=[];
  for(const [id,name,region]of [['background','Background','above'],['foreground','Foreground','below']]){
    const section=document.createElement('details');section.open=true;
    const summary=document.createElement('summary');summary.textContent=`${name} overlay`;section.append(summary);
    const help=document.createElement('p');help.className='design-copy';help.textContent=`Tint the scenery ${region} the horizon line. The puzzle and Pom keep their own colors.`;section.append(help);
    const color=document.createElement('input');color.id=`${id}OverlayColor`;color.type='color';field(`${name} overlay color`,color,section);
    const opacity=document.createElement('input');opacity.id=`${id}OverlayOpacity`;opacity.type='range';opacity.min='0';opacity.max='100';opacity.step='1';
    const row=field(`${name} overlay opacity`,opacity,section),value=document.createElement('output');value.htmlFor=opacity.id;row.append(value);
    function resetButton(row,property){const button=document.createElement('button');button.type='button';button.className='design-reset';button.textContent='Reset';button.setAttribute('aria-label',`Reset ${name.toLowerCase()} overlay ${property}`);button.onclick=()=>{values.overlays[id][property]=defaultOverlay()[property];sync();changed()};row.append(button)}
    resetButton(color.parentElement,'color');resetButton(row,'opacity');
    color.oninput=()=>{values.overlays[id].color=color.value;changed()};opacity.oninput=()=>{values.overlays[id].opacity=Number(opacity.value)/100;sync();changed()};
    overlayControls.push({id,color,opacity,value});body.append(section);
  }
  const instructions=document.createElement('p');instructions.className='design-copy';instructions.textContent='Drag to pan, pinch or scroll to zoom, and use the view cube to compare angles. Transparent areas appear on lavender when viewing the foreground alone.';body.append(instructions);
  const reset=document.createElement('button');reset.type='button';reset.className='btn';reset.textContent='Reset preview';const actions=document.createElement('div');actions.className='design-actions';
  const apply=document.createElement('button');apply.type='button';apply.className='btn';apply.textContent='Apply to all levels';
  const clear=document.createElement('button');clear.type='button';clear.className='btn';clear.textContent='Use level backgrounds';clear.hidden=!applied;
  actions.append(apply,reset,clear);body.append(actions);
  const applicationStatus=document.createElement('p');applicationStatus.className='design-save-status';applicationStatus.setAttribute('role','status');applicationStatus.textContent=applied?'A background configuration is applied to all levels.':'Changes preview here until you apply them to all levels.';body.append(applicationStatus);
  apply.onclick=()=>{applied=structuredClone(values);save(DRAFT_KEY,values);const saved=save(APPLIED_KEY,applied);clear.hidden=false;onChange();applicationStatus.textContent=saved?'Applied to all levels and saved on this device. Further edits stay in the studio until you apply again.':'Applied to all levels for now, but this browser could not save the configuration.'};
  clear.onclick=()=>{applied=null;const saved=save(APPLIED_KEY,null);clear.hidden=true;onChange();applicationStatus.textContent=saved?'Each level now uses its own background. Your studio draft is kept.':'Using each level’s background for now, but this browser could not save the change.'};
  const status=document.createElement('p');status.className='design-save-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');body.append(status);
  panel.append(header,body);
  function sync(){const entry=currentComposition;info.textContent=`${entry.variant?`${entry.variant==='portrait'?'Portrait':'Landscape'} · `:''}${entry.width} × ${entry.height} · ${entry.registeredLayers?'Aligned background and foreground':'Independent sky and ground'}`;environment.value=values.environment;composition.value=values.composition;composition.querySelector('option[value=legacy]').textContent=environmentById(values.environment).fallbackName??'Original panorama';compositionRow.hidden=!environmentById(values.environment).variants;layers.value=values.layers;anchor.value=String(anchorFor(entry)*100);output.value=`${Number((anchorFor(entry)*100).toFixed(2))}%`;guide.checked=values.showGuides;for(const control of overlayControls){const overlay=values.overlays[control.id];control.color.value=overlay.color;control.opacity.value=String(Math.round(overlay.opacity*100));control.value.value=`${Math.round(overlay.opacity*100)}%`}}
  environment.onchange=()=>{values.environment=environment.value;values.composition='auto';currentComposition=environmentById(environment.value);sync();changed()};
  composition.onchange=()=>{values.composition=composition.value;sync();changed()};
  layers.onchange=()=>{values.layers=layers.value;changed()};anchor.oninput=()=>{values.anchors[environmentCacheKey(currentComposition)]=Number(anchor.value)/100;sync();changed()};guide.onchange=()=>{values.showGuides=guide.checked;changed()};
  resetAnchor.onclick=()=>{delete values.anchors[environmentCacheKey(currentComposition)];sync();changed()};
  reset.onclick=()=>{values=defaultPreview();currentComposition=environmentById(values.environment);sync();changed()};
  window.addEventListener('storage',event=>{
    if(event.key!==DRAFT_KEY&&event.key!==APPLIED_KEY&&event.key!==null)return;
    if(event.key===APPLIED_KEY||event.key===null){applied=read(APPLIED_KEY);clear.hidden=!applied;applicationStatus.textContent=applied?'A background configuration is applied to all levels.':'Each level uses its own background.'}
    if(event.key===DRAFT_KEY||event.key===null){values=read(DRAFT_KEY)??structuredClone(applied??defaultPreview());currentComposition=environmentById(values.environment);sync()}
    onChange();
  });
  sync();
  return{get values(){return values},get appliedValues(){return applied},anchorFor,setComposition(entry){if(environmentCacheKey(entry)!==environmentCacheKey(currentComposition)){currentComposition=entry;sync()}},setStatus(text){status.textContent=text}};
}
