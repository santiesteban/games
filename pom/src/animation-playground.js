import {animationCases} from './animation-cases.js';
const length=4000;
const previews=[...document.querySelectorAll('.preview iframe')];
const play=document.querySelector('#play'),timeline=document.querySelector('#timeline'),speed=document.querySelector('#speed');
const yaw=document.querySelector('#yaw'),pitch=document.querySelector('#pitch');
let time=0,last,playing=true;
function broadcast(){
  const state={type:'animation-playground',time,yaw:Number(yaw.value),pitch:Number(pitch.value)};
  for(const preview of previews)preview.contentWindow?.postMessage(state,location.origin);
  timeline.value=Math.round(time/length*1000);
  document.querySelector('#yaw-value').textContent=`${yaw.value}°`;
  document.querySelector('#pitch-value').textContent=`${pitch.value}°`;
}
function frame(now){if(last!==undefined&&playing)time=(time+(now-last)*Number(speed.value))%length;last=now;broadcast();requestAnimationFrame(frame)}
play.addEventListener('click',()=>{playing=!playing;play.textContent=playing?'Pause':'Play';last=undefined});
document.querySelector('#replay').addEventListener('click',()=>{time=0;last=undefined;broadcast()});
timeline.addEventListener('input',()=>{time=Number(timeline.value)/1000*length;playing=false;play.textContent='Play';last=undefined;broadcast()});
for(const slider of [yaw,pitch])slider.addEventListener('input',broadcast);
document.querySelector('#reset-view').addEventListener('click',()=>{yaw.value=20;pitch.value=20;broadcast()});
requestAnimationFrame(frame);

const scenarioSelect=document.querySelector('#scenario-select'),scenarioGame=document.querySelector('#scenario-game'),scenarioHelp=document.querySelector('#scenario-help');
for(const entry of animationCases){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.label;scenarioSelect.append(option)}
function openScenario(){
  const entry=animationCases.find(item=>item.id===scenarioSelect.value);
  scenarioHelp.textContent=entry.help;
  const url=new URL('./',location.href);url.searchParams.set('animation-case',entry.id);
  scenarioGame.src=url.href;
}
scenarioSelect.addEventListener('change',openScenario);
document.querySelector('#reset-scenario').addEventListener('click',openScenario);
openScenario();
