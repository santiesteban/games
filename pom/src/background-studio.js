import {ENVIRONMENT_REVISION,ENVIRONMENT_REVISION_KEY} from './environment-policy.js';
import studioGuide from './environment-studio-guide.md?raw';
import {SCENERY_ROLES,defaultSceneryLayout,normalizeSceneryLayout,cutoutMaterial} from './scenery-layout.js';
import { ENVIRONMENTS, environmentById, environmentCacheKey } from './environments.js';

const DRAFT_KEY='little-ledges:v4:background-studio',APPLIED_KEY='little-ledges:v4:applied-background';

const DEFAULT_CUTOUT={padding:0,paddingColor:'#fffaf0',depth:.08,depthColor:'#6e593d'};
export function createBackgroundStudio(panel,onChange,{onCenterPom=()=>{}}={}){
  const defaultOverlay=()=>({color:'#fffaf0',opacity:0});
  const defaultPreview=()=>({environment:'highway-desert',composition:'auto',layers:'both',showGuides:true,backgroundDistance:null,environmentShadowStrength:1,groundShadowBlur:0,cutoutStyle:{...DEFAULT_CUTOUT},scenicAtmosphere:false,sceneryLayout:defaultSceneryLayout(),overlays:{background:defaultOverlay(),foreground:defaultOverlay()},anchors:{}});
  const validAnchors=new Set(ENVIRONMENTS.flatMap(entry=>[entry.id,...Object.keys(entry.variants??{}).map(variant=>`${entry.id}:${variant}`)]));
  const numeric=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
  function normalize(saved){
    if(!saved||!ENVIRONMENTS.some(entry=>entry.id===saved.environment))return null;
    const result=defaultPreview();result.environment=saved.environment;
    if(['auto','portrait','landscape','legacy'].includes(saved.composition))result.composition=saved.composition;
    if(['both','background','foreground'].includes(saved.layers))result.layers=saved.layers;
    const style=saved.cutoutStyle??{};result.cutoutStyle={padding:numeric(style.padding,0,.5,0),depth:numeric(style.depth,0,.5,.08),paddingColor:/^#[0-9a-f]{6}$/i.test(style.paddingColor??'')?style.paddingColor:DEFAULT_CUTOUT.paddingColor,depthColor:/^#[0-9a-f]{6}$/i.test(style.depthColor??'')?style.depthColor:DEFAULT_CUTOUT.depthColor};
    result.backgroundDistance=numeric(saved.backgroundDistance,.5,80,null);
    result.environmentShadowStrength=numeric(saved.environmentShadowStrength,0,1,1);
    result.groundShadowBlur=numeric(saved.groundShadowBlur,0,2,0);
    result.sceneryLayout=normalizeSceneryLayout(saved.sceneryLayout);
    result.scenicAtmosphere=saved.scenicAtmosphere===true;
    if(typeof saved.showGuides==='boolean')result.showGuides=saved.showGuides;
    for(const id of ['background','foreground']){const input=saved.overlays?.[id];if(/^#[0-9a-f]{6}$/i.test(input?.color??''))result.overlays[id].color=input.color;result.overlays[id].opacity=numeric(input?.opacity,0,1,0)}
    for(const [key,value]of Object.entries(saved.anchors??{}))if(validAnchors.has(key)&&typeof value==='number'&&Number.isFinite(value))result.anchors[key]=numeric(value,.05,.95,.7);
    return result;
  }
  function read(key){try{return normalize(JSON.parse(localStorage.getItem(key)||'null'))}catch{return null}}
  function save(key,value){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  let appliedRevision;try{appliedRevision=localStorage.getItem(ENVIRONMENT_REVISION_KEY)}catch{}
  let applied=read(APPLIED_KEY),values=read(DRAFT_KEY)??structuredClone(applied??defaultPreview()),currentComposition=environmentById(values.environment);
  const anchorFor=(entry,configuration=values)=>configuration?.anchors?.[environmentCacheKey(entry)]??entry.groundAnchorY;
  function changed(){
    const saved=save(DRAFT_KEY,values);onChange();
    applicationStatus.textContent=saved?'Draft saved. Choose Apply to non-Japan levels when ready.':'Preview updated. This browser could not save the draft.';
  }
  for(const event of ['wheel','touchstart','touchmove','touchend','keydown'])panel.addEventListener(event,event=>event.stopPropagation(),{passive:true});
  const header=document.createElement('header');header.className='design-panel-header';
  const title=document.createElement('h2');title.textContent='Environment Studio';
  const collapse=document.createElement('button');collapse.type='button';collapse.className='btn';collapse.textContent='Hide';collapse.setAttribute('aria-expanded','true');collapse.setAttribute('aria-controls','backgroundControlsBody');
  collapse.onclick=()=>{const hidden=panel.classList.toggle('is-collapsed');collapse.textContent=hidden?'Show':'Hide';collapse.setAttribute('aria-expanded',String(!hidden))};header.append(title,collapse);
  const body=document.createElement('div');body.id='backgroundControlsBody';body.className='design-controls-body background-controls-body';body.tabIndex=0;body.setAttribute('role','region');body.setAttribute('aria-label','Environment settings');
  const copy=document.createElement('p');copy.className='design-copy';copy.textContent='Select and drag scenery directly. Save named configurations for comparison, or apply the environment, composition, anchors, layers, overlays and floor guide to non-Japan levels.';body.append(copy);
  const guideLink=document.createElement('a');guideLink.href='#environment-studio-guide';guideLink.textContent='Environment Studio guide';guideLink.className='environment-guide-link';copy.append(document.createElement('br'),guideLink);
  const guideDialog=document.createElement('dialog');guideDialog.id='environment-studio-guide';guideDialog.className='environment-guide-dialog';guideDialog.setAttribute('aria-label','Environment Studio guide');
  const closeGuide=document.createElement('button');closeGuide.type='button';closeGuide.className='btn';closeGuide.textContent='Close guide';closeGuide.onclick=()=>guideDialog.close();guideDialog.append(closeGuide);
  const article=document.createElement('article');
  for(const line of studioGuide.split('\n')){
    if(!line.trim())continue;
    const heading=line.match(/^(#{1,3}) (.*)$/),node=document.createElement(heading?`h${heading[1].length}`:'p');
    node.textContent=(heading?heading[2]:line).replace(/\*\*([^*]+)\*\*/g,'$1').replace(/`([^`]+)`/g,'$1');article.append(node);
  }
  guideDialog.append(article);document.body.append(guideDialog);
  guideDialog.tabIndex=0;
  for(const event of ['wheel','touchmove','keydown'])guideDialog.addEventListener(event,e=>e.stopPropagation(),{passive:true});
  guideLink.onclick=e=>{e.preventDefault();guideDialog.showModal();guideDialog.scrollTop=0;guideDialog.focus({preventScroll:true})};
  guideDialog.addEventListener('click',e=>{if(e.target===guideDialog){const r=guideDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)guideDialog.close()}});
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
  const atmosphere=document.createElement('input');atmosphere.id='scenicAtmosphere';atmosphere.type='checkbox';atmosphere.setAttribute('role','switch');
  const atmosphereRow=field('Extra hanging clouds and fog',atmosphere);atmosphereRow.classList.add('setting-toggle');
  atmosphere.onchange=()=>{values.scenicAtmosphere=atmosphere.checked;changed()};
  const distance=document.createElement('input');distance.id='studioBackgroundDistance';distance.type='number';distance.min=.5;distance.max=80;distance.step=.25;distance.placeholder='Automatic';
  const distanceRow=field('Backdrop distance',distance);distanceRow.classList.add('design-field');
  const automatic=document.createElement('button');automatic.type='button';automatic.className='btn';automatic.textContent='Automatic distance';distanceRow.append(automatic);
  distance.oninput=()=>{if(distance.value===''){values.backgroundDistance=null;changed()}else if(Number.isFinite(distance.valueAsNumber)){values.backgroundDistance=Math.max(.5,Math.min(80,distance.valueAsNumber));changed()}};
  automatic.onclick=()=>{values.backgroundDistance=null;distance.value='';changed()};
  const shadowStrength=document.createElement('input');shadowStrength.id='environmentShadowStrength';shadowStrength.type='range';shadowStrength.min=0;shadowStrength.max=100;shadowStrength.step=1;
  const strengthRow=field('Environment shadow strength',shadowStrength),strengthValue=document.createElement('output');strengthValue.htmlFor=shadowStrength.id;strengthRow.append(strengthValue);
  shadowStrength.oninput=()=>{values.environmentShadowStrength=Number(shadowStrength.value)/100;strengthValue.value=`${shadowStrength.value}%`;changed()};
  const shadowBlur=document.createElement('input');shadowBlur.id='groundShadowBlur';shadowBlur.type='range';shadowBlur.min=0;shadowBlur.max=2;shadowBlur.step=.05;
  const blurRow=field('Ground shadow blur',shadowBlur),blurValue=document.createElement('output');blurValue.htmlFor=shadowBlur.id;blurRow.append(blurValue);
  shadowBlur.oninput=()=>{values.groundShadowBlur=Number(shadowBlur.value);blurValue.value=Number(shadowBlur.value).toFixed(2);changed()};
  const centerPom=document.createElement('button');centerPom.type='button';centerPom.className='btn';centerPom.textContent='Center on Pom';centerPom.onclick=onCenterPom;body.append(centerPom);
  const editor=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent='Scenery elements';editor.append(legend);body.append(editor);
  const selectedElement=document.createElement('select');selectedElement.id='sceneryElement';field('Selected element',selectedElement,editor);
  const roleChoice=document.createElement('select');roleChoice.id='sceneryRole';for(const role of SCENERY_ROLES)roleChoice.add(new Option(role.replaceAll('-',' '),role));field('New element',roleChoice,editor);
  const addElement=document.createElement('button');addElement.type='button';addElement.className='btn';addElement.textContent='Add element';
  const deleteElement=document.createElement('button');deleteElement.type='button';deleteElement.className='btn';deleteElement.textContent='Delete selected';editor.append(addElement,deleteElement);
  const transforms=[];
  for(const [key,label,min,max,step] of [['x','Left / right offset',-40,40,.1],['y','Height offset',-10,30,.1],['z','Forward / back offset',-20,20,.1],['scale','Size',.1,4,.05],['tilt','Tilt toward puzzle (degrees)',-80,80,1]]){
    const input=document.createElement('input');input.type='number';input.id=`scenery-${key}`;input.min=min;input.max=max;input.step=step;field(label,input,editor);transforms.push({key,input});
    input.oninput=()=>{const item=values.sceneryLayout.find(e=>e.id===selectedElement.value);if(!item||!Number.isFinite(input.valueAsNumber))return;item[key]=Math.max(min,Math.min(max,input.valueAsNumber));changed()};
  }
  const elementMaterials=[];
  for(const [key,label,type]of [['padding','Element padding','number'],['paddingColor','Element padding color','color'],['depth','Element depth','number'],['depthColor','Element depth color','color']]){
    const input=document.createElement('input');input.type=type;input.id=`element-${key}`;if(type==='number'){input.min=0;input.max=.5;input.step=.01}field(label,input,editor);elementMaterials.push({key,input});
    input.oninput=()=>{const item=values.sceneryLayout.find(e=>e.id===selectedElement.value);if(!item)return;if(type==='number'&&!Number.isFinite(input.valueAsNumber))return;item.cutout={...cutoutMaterial(item.role,values.cutoutStyle,item.cutout),[key]:type==='number'?Math.max(0,Math.min(.5,input.valueAsNumber)):input.value};changed()};
  }
  const support=document.createElement('input');support.id='elementSupport';support.type='checkbox';support.setAttribute('role','switch');field('Cutout support',support,editor).classList.add('setting-toggle');
  support.onchange=()=>{const item=values.sceneryLayout.find(e=>e.id===selectedElement.value);if(item){item.cutout={...cutoutMaterial(item.role,values.cutoutStyle,item.cutout),support:support.checked};changed()}};
  const resetMaterial=document.createElement('button');resetMaterial.type='button';resetMaterial.className='btn';resetMaterial.textContent='Reset element material';editor.append(resetMaterial);
  resetMaterial.onclick=()=>{const item=values.sceneryLayout.find(e=>e.id===selectedElement.value);if(item){delete item.cutout;syncElements();changed()}};
  function syncElements(){
    editor.hidden=values.environment!=='daisy-meadow';const selected=selectedElement.value;selectedElement.replaceChildren();
    for(const item of values.sceneryLayout)selectedElement.add(new Option(item.id.replaceAll('-',' '),item.id));
    if(values.sceneryLayout.some(e=>e.id===selected))selectedElement.value=selected;
    const item=values.sceneryLayout.find(e=>e.id===selectedElement.value);deleteElement.disabled=!item;
    for(const {key,input}of transforms){input.disabled=!item;input.value=item?.[key]??''}
    support.disabled=!item;support.checked=item?.cutout?.support===true;resetMaterial.disabled=!item;const style=item?cutoutMaterial(item.role,values.cutoutStyle,item.cutout):DEFAULT_CUTOUT;for(const {key,input}of elementMaterials){input.disabled=!item;input.value=style[key]}
  }
  selectedElement.onchange=syncElements;
  addElement.onclick=()=>{if(values.sceneryLayout.length>=48)return;const role=roleChoice.value;let i=2;while(values.sceneryLayout.some(e=>e.id===`${role}-${i}`))i++;const id=`${role}-${i}`;values.sceneryLayout.push({id,role,x:role==='large-arching-cloud'?0:1.2,y:0,z:0,scale:1,tilt:0});if(role.includes('cloud')||role.includes('fog'))values.scenicAtmosphere=true;syncElements();selectedElement.value=id;syncElements();atmosphere.checked=values.scenicAtmosphere;changed()};
  deleteElement.onclick=()=>{values.sceneryLayout=values.sceneryLayout.filter(e=>e.id!==selectedElement.value);syncElements();changed()};
  const material=document.createElement('fieldset');const materialTitle=document.createElement('legend');materialTitle.textContent='Cardboard cutouts';material.append(materialTitle);body.append(material);
  const materialInputs=[];
  for(const [key,label,type]of [['padding','Cutout padding','number'],['paddingColor','Padding color','color'],['depth','Cutout depth','number'],['depthColor','Depth color','color']]){
    const input=document.createElement('input');input.id=`cutout-${key}`;input.type=type;if(type==='number'){input.min=0;input.max=.5;input.step=.01}field(label,input,material);materialInputs.push({key,input});
    input.oninput=()=>{if(type==='color')values.cutoutStyle[key]=input.value;else if(Number.isFinite(input.valueAsNumber))values.cutoutStyle[key]=Math.max(0,Math.min(.5,input.valueAsNumber));changed()};
  }
  const materialHelp=document.createElement('p');materialHelp.className='design-copy';materialHelp.textContent='Default for planted cutouts. Each element can override it. Clouds and fog start with zero padding and depth. Tilt turns an element toward the puzzle.';material.append(materialHelp);
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
    overlayControls.push({id,color,opacity,value,section});body.append(section);
  }
  const instructions=document.createElement('p');instructions.className='design-copy';instructions.textContent='Drag to pan, pinch or scroll to zoom, and use the view cube to compare angles. Transparent areas appear on lavender when viewing the foreground alone.';body.append(instructions);
  const reset=document.createElement('button');reset.type='button';reset.className='btn';reset.textContent='Reset preview';const actions=document.createElement('div');actions.className='design-actions';
  const apply=document.createElement('button');apply.type='button';apply.className='btn';apply.textContent='Apply to non-Japan levels';
  const clear=document.createElement('button');clear.type='button';clear.className='btn';clear.textContent='Use game defaults';clear.hidden=!(applied&&appliedRevision===ENVIRONMENT_REVISION);
  actions.append(apply,reset,clear);body.append(actions);
  const applicationStatus=document.createElement('p');applicationStatus.className='design-save-status';applicationStatus.setAttribute('role','status');applicationStatus.textContent=applied&&appliedRevision===ENVIRONMENT_REVISION?'A custom environment is applied outside Japan.':'Gameplay uses the approved environment. Studio edits remain in this preview until applied.';body.append(applicationStatus);
  apply.onclick=()=>{applied=structuredClone(values);save(DRAFT_KEY,values);const configSaved=save(APPLIED_KEY,applied);appliedRevision=ENVIRONMENT_REVISION;let revisionSaved=true;try{localStorage.setItem(ENVIRONMENT_REVISION_KEY,appliedRevision)}catch{revisionSaved=false}const saved=configSaved&&revisionSaved;clear.hidden=false;onChange();applicationStatus.textContent=saved?'Applied outside Japan and saved on this device. Further edits stay in the studio until you apply again.':'Applied outside Japan for now, but this browser could not save the configuration.'};
  clear.onclick=()=>{applied=null;const saved=save(APPLIED_KEY,null);clear.hidden=true;onChange();applicationStatus.textContent=saved?'Game defaults restored, including Japan’s environment. Your studio draft is kept.':'Using each level’s background for now, but this browser could not save the change.'};
  const libraryKey='little-ledges:v4:environment-configurations';
  function readLibrary(){try{const data=JSON.parse(localStorage.getItem(libraryKey)||'[]');return Array.isArray(data)?data.filter(e=>typeof e.name==='string'&&typeof e.id==='string'&&normalize(e.configuration)).slice(0,100):[]}catch{return []}}
  let library=readLibrary();
  const savedChoice=document.createElement('select');savedChoice.id='savedEnvironmentConfiguration';field('Saved configurations',savedChoice);
  const configName=document.createElement('input');configName.id='environmentConfigurationName';configName.type='text';configName.maxLength=80;field('Configuration name',configName);
  const libraryStatus=document.createElement('p');libraryStatus.className='design-save-status';libraryStatus.setAttribute('role','status');
  function syncLibrary(){const previous=savedChoice.value;savedChoice.replaceChildren(new Option('Choose a configuration',''));for(const entry of library)savedChoice.add(new Option(entry.name,entry.id));savedChoice.value=library.some(e=>e.id===previous)?previous:''}
  const libraryActions=document.createElement('div');libraryActions.className='design-actions';
  function libraryButton(label,fn){const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=label;button.onclick=fn;libraryActions.append(button)}
  libraryButton('Save new configuration',()=>{const name=configName.value.trim();if(!name){libraryStatus.textContent='Enter a configuration name.';return}if(library.length>=100){libraryStatus.textContent='The configuration library is full.';return}const entry={id:crypto.randomUUID(),name,configuration:structuredClone(values)};const next=[...library,entry];if(!save(libraryKey,next)){libraryStatus.textContent='Could not save on this device.';return}library=next;syncLibrary();savedChoice.value=entry.id;libraryStatus.textContent='Configuration saved on this device.'});
  libraryButton('Load configuration',()=>{const entry=library.find(e=>e.id===savedChoice.value);if(!entry)return;values=normalize(entry.configuration);configName.value=entry.name;currentComposition=environmentById(values.environment);sync();changed();libraryStatus.textContent='Loaded into the preview.'});
  libraryButton('Delete configuration',()=>{const next=library.filter(e=>e.id!==savedChoice.value);if(save(libraryKey,next)){library=next;syncLibrary();libraryStatus.textContent='Saved configuration deleted. The current preview is kept.'}});
  libraryButton('Export configuration',()=>{const blob=new Blob([JSON.stringify({version:1,name:configName.value.trim()||'Environment configuration',configuration:values},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='environment-configuration.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
  const importFile=document.createElement('input');importFile.id='importEnvironmentConfiguration';importFile.type='file';importFile.accept='.json,application/json';field('Import configuration',importFile);
  importFile.onchange=async()=>{try{const data=JSON.parse(await importFile.files[0].text()),configuration=normalize(data.configuration);if(!configuration)throw new Error();values=configuration;configName.value=String(data.name??'Imported configuration').slice(0,80);currentComposition=environmentById(values.environment);sync();changed();libraryStatus.textContent='Imported into preview. Save new configuration to keep it in the library.'}catch{libraryStatus.textContent='Could not import this configuration.'}finally{importFile.value=''}};
  body.append(libraryActions,libraryStatus);syncLibrary();
  const status=document.createElement('p');status.className='design-save-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');body.append(status);
  function elementGroup(title,nodes,open=false){const section=document.createElement('details');section.className='environment-element-section';section.open=open;const summary=document.createElement('summary');summary.textContent=title;section.append(summary,...nodes);editor.append(section)}
  elementGroup('Add an element',[roleChoice.parentElement,addElement]);
  elementGroup('Position, size & tilt',transforms.map(c=>c.input.parentElement),true);
  elementGroup('Material & support',[...elementMaterials.map(c=>c.input.parentElement),support.parentElement,resetMaterial]);
  function group(title,nodes,open=false){const section=document.createElement('details');section.className='environment-section';section.open=open;const heading=document.createElement('summary');heading.textContent=title;section.append(heading,...nodes);body.append(section);return section}
  const oldChildren=[...body.children];
  const savedSection=group('Saved configurations',[savedChoice.parentElement,configName.parentElement,libraryActions,importFile.parentElement,libraryStatus],true);
  const sceneSection=group('Scene & camera',[environment.parentElement,info,compositionRow,layers.parentElement,anchorRow,guide.parentElement,atmosphereRow,distanceRow,centerPom]);
  const elementSection=group('Selected element',[editor],true);
  group('Shadows',[strengthRow,blurRow]);
  group('Shared cutout material',[material]);
  group('Layer appearance',overlayControls.map(c=>c.section));
  group('Apply & reset',[actions,applicationStatus]);
  body.prepend(copy,savedSection,sceneSection,elementSection);
  for(const child of oldChildren)if(child.parentElement===body&&child!==copy&&child!==status)child.remove();
  panel.append(header,body);
  function sync(){syncElements();shadowStrength.value=values.environmentShadowStrength*100;strengthValue.value=`${Math.round(values.environmentShadowStrength*100)}%`;shadowBlur.value=values.groundShadowBlur;blurValue.value=values.groundShadowBlur.toFixed(2);material.hidden=values.environment!=='daisy-meadow';for(const {key,input}of materialInputs)input.value=values.cutoutStyle[key];const entry=currentComposition;distance.value=values.backgroundDistance??'';const stageArt=values.environment==='daisy-meadow';distanceRow.hidden=!stageArt;centerPom.hidden=!stageArt;anchorRow.hidden=stageArt;for(const control of overlayControls)control.section.hidden=stageArt;info.textContent=`${entry.variant?`${entry.variant==='portrait'?'Portrait':'Landscape'} · `:''}${entry.width} × ${entry.height} · ${entry.registeredLayers?'Aligned background and foreground':'Independent sky and ground'}`;environment.value=values.environment;composition.value=values.composition;composition.querySelector('option[value=legacy]').textContent=environmentById(values.environment).fallbackName??'Original panorama';compositionRow.hidden=!environmentById(values.environment).variants;layers.value=values.layers;anchor.value=String(anchorFor(entry)*100);output.value=`${Number((anchorFor(entry)*100).toFixed(2))}%`;guide.checked=values.showGuides;atmosphere.checked=values.scenicAtmosphere;atmosphereRow.hidden=values.environment!=='daisy-meadow';for(const control of overlayControls){const overlay=values.overlays[control.id];control.color.value=overlay.color;control.opacity.value=String(Math.round(overlay.opacity*100));control.value.value=`${Math.round(overlay.opacity*100)}%`}}
  environment.onchange=()=>{values.environment=environment.value;values.composition='auto';currentComposition=environmentById(environment.value);sync();changed()};
  composition.onchange=()=>{values.composition=composition.value;sync();changed()};
  layers.onchange=()=>{values.layers=layers.value;changed()};anchor.oninput=()=>{values.anchors[environmentCacheKey(currentComposition)]=Number(anchor.value)/100;sync();changed()};guide.onchange=()=>{values.showGuides=guide.checked;changed()};
  resetAnchor.onclick=()=>{delete values.anchors[environmentCacheKey(currentComposition)];sync();changed()};
  reset.onclick=()=>{values=defaultPreview();currentComposition=environmentById(values.environment);sync();changed()};
  window.addEventListener('storage',event=>{
    if(event.key===libraryKey){library=readLibrary();syncLibrary();return}
    if(event.key!==DRAFT_KEY&&event.key!==APPLIED_KEY&&event.key!==ENVIRONMENT_REVISION_KEY&&event.key!==null)return;
    if(event.key===ENVIRONMENT_REVISION_KEY||event.key===null){try{appliedRevision=localStorage.getItem(ENVIRONMENT_REVISION_KEY)}catch{}}
    if(event.key===APPLIED_KEY||event.key===ENVIRONMENT_REVISION_KEY||event.key===null){applied=read(APPLIED_KEY);clear.hidden=!(applied&&appliedRevision===ENVIRONMENT_REVISION);applicationStatus.textContent=applied&&appliedRevision===ENVIRONMENT_REVISION?'A custom environment is applied outside Japan.':'Gameplay uses the approved environment; Japan keeps its own scenery.'}
    if(event.key===DRAFT_KEY||event.key===null){values=read(DRAFT_KEY)??structuredClone(applied??defaultPreview());currentComposition=environmentById(values.environment);sync()}
    onChange();
  });
  sync();
  return{selectElement(id){if(!values.sceneryLayout.some(e=>e.id===id))return false;selectedElement.value=id;syncElements();elementSection.open=true;return true},moveElement(id,x,y,z){const item=values.sceneryLayout.find(e=>e.id===id);if(!item)return;item.x=Math.max(-40,Math.min(40,x));item.y=Math.max(-10,Math.min(30,y));if(Number.isFinite(z))item.z=Math.max(-20,Math.min(20,z));syncElements();changed()},get values(){return values},get appliedValues(){return applied},get appliedRevision(){return appliedRevision},anchorFor,setComposition(entry){if(environmentCacheKey(entry)!==environmentCacheKey(currentComposition)){currentComposition=entry;sync()}},setStatus(text){status.textContent=text}};
}
