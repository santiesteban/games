const STORAGE_KEY='little-ledges:v4:design-playground';
const APPLIED_KEY='little-ledges:v4:applied-design';
export { DEFAULT_DESIGN } from './design-style.js';
import { DEFAULT_DESIGN } from './design-style.js';
const isColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const number=(value,fallback,min,max)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
function normalize(saved){
  const result=structuredClone(DEFAULT_DESIGN);
  for(let i=0;i<3;i++)for(const tone of ['dark','light'])if(isColor(saved?.bands?.[i]?.[tone]))result.bands[i][tone]=saved.bands[i][tone];
  for(const axis of ['horizontal','vertical']){
    const input=saved?.lines?.[axis],line=result.lines[axis];
    line.width=number(input?.width,line.width,0,.12);line.opacity=number(input?.opacity,line.opacity,0,1);
    if(isColor(input?.color))line.color=input.color;
  }
  const shadow=saved?.shadows;
  if(typeof shadow?.enabled==='boolean')result.shadows.enabled=shadow.enabled;
  for(const [name,min,max]of [['strength',0,1],['softness',0,4],['direction',-180,180],['elevation',15,85]])result.shadows[name]=number(shadow?.[name],result.shadows[name],min,max);
  const studs=saved?.studs;
  if(typeof studs?.enabled==='boolean')result.studs.enabled=studs.enabled;
  result.studs.width=number(studs?.width,result.studs.width,0,6);result.studs.opacity=number(studs?.opacity,result.studs.opacity,0,1);
  if(isColor(studs?.color))result.studs.color=studs.color;
  return result;
}

export function createDesignPlayground(panel,onChange,onApply){
  let applied;try{applied=normalize(JSON.parse(localStorage.getItem(APPLIED_KEY)||'null'))}catch{applied=structuredClone(DEFAULT_DESIGN)}
  let values;try{values=normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'))}catch{values=structuredClone(DEFAULT_DESIGN)}
  let frame=0,fieldId=0;
  function changed(){
    const message=panel.querySelector('.design-save-status');
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(values));message.textContent='Draft saved. Choose Apply to all levels when ready.'}catch{message.textContent='Preview updated. This browser could not save the design.'}
    cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>onChange());
  }
  function field(parent,label,input){
    const row=document.createElement('div');row.className='design-field';input.id=`designSetting${++fieldId}`;
    const text=document.createElement('label');text.htmlFor=input.id;text.textContent=label;row.append(text,input);parent.append(row);return row;
  }
  function resetControl(row,label,reset){
    const button=document.createElement('button');button.type='button';button.className='design-reset';button.textContent='Reset';button.setAttribute('aria-label',`Reset ${label} to default`);button.title='Reset to default';button.onclick=()=>{reset();changed()};row.append(button);
  }
  function color(parent,label,value,set,defaultValue,visibleLabel=label){
    const input=document.createElement('input');input.type='color';input.value=value;input.setAttribute('aria-label',label);
    input.addEventListener('input',()=>{set(input.value);changed()});const row=field(parent,visibleLabel,input);
    resetControl(row,label,()=>{input.value=defaultValue;set(defaultValue)});
  }
  function range(parent,label,value,min,max,step,set,format,defaultValue){
    value=Math.round(value*1000)/1000;
    defaultValue=Math.round(defaultValue*1000)/1000;
    const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;input.setAttribute('aria-label',label);
    const output=document.createElement('output');output.value=format(value);const row=field(parent,label,input);row.append(output);
    input.addEventListener('input',()=>{const n=Number(input.value);output.value=format(n);set(n);changed()});
    resetControl(row,label,()=>{input.value=defaultValue;output.value=format(defaultValue);set(defaultValue)});
  }
  function toggle(parent,label,value,set,defaultValue){
    const input=document.createElement('input');input.type='checkbox';input.checked=value;input.setAttribute('role','switch');input.setAttribute('aria-label',label);
    const row=field(parent,label,input);row.classList.add('setting-toggle');input.onchange=()=>{set(input.checked);changed()};
    resetControl(row,label,()=>{input.checked=defaultValue;set(defaultValue)});
  }
  function section(parent,title,open=true){
    const details=document.createElement('details');details.open=open;const summary=document.createElement('summary');summary.textContent=title;details.append(summary);parent.append(details);return details;
  }
  function render(){
    fieldId=0;
    panel.replaceChildren();
    const header=document.createElement('header');header.className='design-panel-header';
    const title=document.createElement('h2');title.textContent='Design controls';
    const collapse=document.createElement('button');collapse.type='button';collapse.className='btn';collapse.textContent='Hide';collapse.setAttribute('aria-expanded','true');collapse.setAttribute('aria-controls','designControlsBody');
    collapse.onclick=()=>{const hidden=panel.classList.toggle('is-collapsed');collapse.textContent=hidden?'Show':'Hide';collapse.setAttribute('aria-expanded',String(!hidden))};
    header.append(title,collapse);panel.append(header);
    const body=document.createElement('div');body.id='designControlsBody';body.className='design-controls-body';panel.append(body);
    const copy=document.createElement('p');copy.className='design-copy';copy.textContent='Shooting Star, in our standard palette. Adjust the scene live, or turn the view cube.';body.append(copy);
    const bands=section(body,'Band gradients');
    for(const [i,name]of ['Green · front','Yellow · middle','Red · back'].entries()){
      const group=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=name;group.append(legend);
      color(group,`${name} dark`,values.bands[i].dark,value=>values.bands[i].dark=value,DEFAULT_DESIGN.bands[i].dark,'Dark');
      color(group,`${name} light`,values.bands[i].light,value=>values.bands[i].light=value,DEFAULT_DESIGN.bands[i].light,'Light');bands.append(group);
    }
    for(const [axis,title]of [['horizontal','Horizontal lines'],['vertical','Vertical lines']]){
      const group=section(body,title),line=values.lines[axis];
      range(group,`${title} thickness`,line.width*100,0,12,.5,n=>line.width=n/100,n=>`${n}%`,DEFAULT_DESIGN.lines[axis].width*100);
      color(group,`${title} color`,line.color,n=>line.color=n,DEFAULT_DESIGN.lines[axis].color);
      range(group,`${title} opacity`,line.opacity*100,0,100,.5,n=>line.opacity=n/100,n=>`${n}%`,DEFAULT_DESIGN.lines[axis].opacity*100);
    }
    const studs=section(body,'Stud outlines');
    toggle(studs,'Show platform studs',values.studs.enabled,n=>values.studs.enabled=n,DEFAULT_DESIGN.studs.enabled);
    range(studs,'Stud line thickness',values.studs.width,0,6,.1,n=>values.studs.width=n,n=>`${n}px`,DEFAULT_DESIGN.studs.width);
    color(studs,'Stud line color',values.studs.color,n=>values.studs.color=n,DEFAULT_DESIGN.studs.color);
    range(studs,'Stud line opacity',values.studs.opacity*100,0,100,1,n=>values.studs.opacity=n/100,n=>`${n}%`,DEFAULT_DESIGN.studs.opacity*100);
    const shadows=section(body,'Piece shadows');
    toggle(shadows,'Pieces cast shadows',values.shadows.enabled,n=>values.shadows.enabled=n,DEFAULT_DESIGN.shadows.enabled);
    range(shadows,'Shadow strength',values.shadows.strength*100,0,100,1,n=>values.shadows.strength=n/100,n=>`${n}%`,DEFAULT_DESIGN.shadows.strength*100);
    range(shadows,'Shadow softness',values.shadows.softness,0,4,.1,n=>values.shadows.softness=n,n=>String(n),DEFAULT_DESIGN.shadows.softness);
    range(shadows,'Light direction',values.shadows.direction,-180,180,5,n=>values.shadows.direction=n,n=>`${n}°`,DEFAULT_DESIGN.shadows.direction);
    range(shadows,'Light height',values.shadows.elevation,15,85,5,n=>values.shadows.elevation=n,n=>`${n}°`,DEFAULT_DESIGN.shadows.elevation);
    const actions=document.createElement('div');actions.className='design-actions';
    const apply=document.createElement('button');apply.type='button';apply.className='btn';apply.textContent='Apply to all levels';
    apply.onclick=()=>{
      applied=structuredClone(values);let saved=true;
      try{localStorage.setItem(APPLIED_KEY,JSON.stringify(applied))}catch{saved=false}
      const flagsSaved=onApply(applied);onChange();
      panel.querySelector('.design-save-status').textContent=saved&&flagsSaved!==false?'Applied to all levels and saved on this device. Further edits stay in the playground until you apply again.':'Applied to all levels for now, but this browser could not save every setting.';
    };
    const reset=document.createElement('button');reset.type='button';reset.className='btn';reset.textContent='Reset design';reset.onclick=()=>{values=structuredClone(DEFAULT_DESIGN);panel.classList.remove('is-collapsed');render();changed()};
    const download=document.createElement('button');download.type='button';download.className='btn';download.textContent='Download design';download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({format:'little-ledges-design',version:1,...values},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='little-ledges-design.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
    actions.append(apply,reset,download);body.append(actions);
    const message=document.createElement('p');message.className='design-save-status';message.setAttribute('role','status');message.textContent='Preview changes here, then apply them to all levels.';body.append(message);
  }
  window.addEventListener('storage',event=>{
    if(event.key===APPLIED_KEY||event.key===null){
      try{applied=normalize(event.key===null?null:JSON.parse(event.newValue||'null'))}catch{return}
      onChange();if(event.key!==null)return;
    }
    if(event.key!==STORAGE_KEY&&event.key!==null)return;
    const scroll=panel.querySelector('.design-controls-body')?.scrollTop??0,collapsed=panel.classList.contains('is-collapsed');
    try{values=normalize(event.key===null?null:JSON.parse(event.newValue||'null'))}catch{return}
    render();panel.classList.toggle('is-collapsed',collapsed);panel.querySelector('.design-controls-body').scrollTop=scroll;
    const button=panel.querySelector('.design-panel-header button');button.textContent=collapsed?'Show':'Hide';button.setAttribute('aria-expanded',String(!collapsed));onChange();
  });
  render();return{get values(){return values},get appliedValues(){return applied}};
}
