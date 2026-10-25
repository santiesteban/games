import { ENVIRONMENTS, environmentById, environmentCacheKey } from './environments.js';

export function createBackgroundStudio(panel,onChange){
  const defaultOverlay=()=>({color:'#fffaf0',opacity:0});
  const defaultPreview=()=>({environment:'highway-desert',composition:'auto',layers:'both',showGuides:true,overlays:{background:defaultOverlay(),foreground:defaultOverlay()}});
  let values=defaultPreview(),currentComposition=environmentById('highway-desert');
  const anchors=new Map(),anchorFor=entry=>anchors.get(environmentCacheKey(entry))??entry.groundAnchorY;
  for(const event of ['wheel','touchstart','touchmove','touchend','keydown'])panel.addEventListener(event,event=>event.stopPropagation(),{passive:true});
  const header=document.createElement('header');header.className='design-panel-header';
  const title=document.createElement('h2');title.textContent='Background controls';
  const collapse=document.createElement('button');collapse.type='button';collapse.className='btn';collapse.textContent='Hide';collapse.setAttribute('aria-expanded','true');collapse.setAttribute('aria-controls','backgroundControlsBody');
  collapse.onclick=()=>{const hidden=panel.classList.toggle('is-collapsed');collapse.textContent=hidden?'Show':'Hide';collapse.setAttribute('aria-expanded',String(!hidden))};header.append(title,collapse);
  const body=document.createElement('div');body.id='backgroundControlsBody';body.className='design-controls-body background-controls-body';body.tabIndex=0;body.setAttribute('role','region');body.setAttribute('aria-label','Background settings');
  const copy=document.createElement('p');copy.className='design-copy';copy.textContent='Preview scenery with a playable puzzle. Changes here apply only to Background Studio.';body.append(copy);
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
    function resetButton(row,property){const button=document.createElement('button');button.type='button';button.className='design-reset';button.textContent='Reset';button.setAttribute('aria-label',`Reset ${name.toLowerCase()} overlay ${property}`);button.onclick=()=>{values.overlays[id][property]=defaultOverlay()[property];sync();onChange()};row.append(button)}
    resetButton(color.parentElement,'color');resetButton(row,'opacity');
    color.oninput=()=>{values.overlays[id].color=color.value;onChange()};opacity.oninput=()=>{values.overlays[id].opacity=Number(opacity.value)/100;sync();onChange()};
    overlayControls.push({id,color,opacity,value});body.append(section);
  }
  const instructions=document.createElement('p');instructions.className='design-copy';instructions.textContent='Drag to pan, pinch or scroll to zoom, and use the view cube to compare angles. Transparent areas appear on lavender when viewing the foreground alone.';body.append(instructions);
  const reset=document.createElement('button');reset.type='button';reset.className='btn';reset.textContent='Reset preview';const actions=document.createElement('div');actions.className='design-actions';actions.append(reset);body.append(actions);
  const status=document.createElement('p');status.className='design-save-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');body.append(status);
  panel.append(header,body);
  function sync(){const entry=currentComposition;info.textContent=`${entry.variant?`${entry.variant==='portrait'?'Portrait':'Landscape'} · `:''}${entry.width} × ${entry.height} · ${entry.registeredLayers?'Aligned background and foreground':'Independent sky and ground'}`;environment.value=values.environment;composition.value=values.composition;composition.querySelector('option[value=legacy]').textContent=environmentById(values.environment).fallbackName??'Original panorama';compositionRow.hidden=!environmentById(values.environment).variants;layers.value=values.layers;anchor.value=String(anchorFor(entry)*100);output.value=`${Number((anchorFor(entry)*100).toFixed(2))}%`;guide.checked=values.showGuides;for(const control of overlayControls){const overlay=values.overlays[control.id];control.color.value=overlay.color;control.opacity.value=String(Math.round(overlay.opacity*100));control.value.value=`${Math.round(overlay.opacity*100)}%`}}
  environment.onchange=()=>{values.environment=environment.value;values.composition='auto';currentComposition=environmentById(environment.value);sync();onChange()};
  composition.onchange=()=>{values.composition=composition.value;sync();onChange()};
  layers.onchange=()=>{values.layers=layers.value;onChange()};anchor.oninput=()=>{anchors.set(environmentCacheKey(currentComposition),Number(anchor.value)/100);sync();onChange()};guide.onchange=()=>{values.showGuides=guide.checked;onChange()};
  resetAnchor.onclick=()=>{anchors.delete(environmentCacheKey(currentComposition));sync();onChange()};
  reset.onclick=()=>{values=defaultPreview();anchors.clear();currentComposition=environmentById(values.environment);sync();onChange()};
  sync();
  return{get values(){return values},anchorFor,setComposition(entry){if(environmentCacheKey(entry)!==environmentCacheKey(currentComposition)){currentComposition=entry;sync()}},setStatus(text){status.textContent=text}};
}
