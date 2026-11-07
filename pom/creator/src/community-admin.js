import {validatePuzzle,gameUrl,exportJson} from '../../shared/puzzle.js';
import {deploymentUrls} from '../../shared/deployment.js';
const $=id=>document.getElementById(id),api=import.meta.env.VITE_COMMUNITY_ADMIN_URL;
if(!api){$('notice').textContent='The review service has not been configured.';$('signIn').removeAttribute('href');$('refresh').disabled=true}
else{
  const base=new URL(api);if(base.protocol!=='https:')throw new Error('Review service must use HTTPS.');
  $('signIn').href=new URL('/auth/start',base).href;$('signIn').removeAttribute('target');
  const fragment=new URLSearchParams(location.hash.slice(1)),incoming=fragment.get('session');if(incoming){if(/^[A-Za-z0-9_-]{43}$/.test(incoming))sessionStorage.setItem('little-ledges-poc-admin',incoming);history.replaceState(null,'',location.pathname+location.search)}
  const authorization=()=>({'Authorization':`Bearer ${sessionStorage.getItem('little-ledges-poc-admin')||''}`});
  async function load(){
    $('notice').textContent='Loading submissions…';$('list').replaceChildren();
    try{
      const url=new URL('submissions',base.href.endsWith('/')?base.href:base.href+'/');url.searchParams.set('status',$('status').value);
      const response=await fetch(url,{headers:authorization()});if(!response.ok)throw new Error('Sign in with your authorized GitHub account, then refresh.');
      const data=await response.json();$('notice').textContent=data.submissions.length?`${data.submissions.length} submissions`:'No submissions in this list.';
      for(const entry of data.submissions){
        const puzzle=validatePuzzle(JSON.parse(entry.puzzle_json)),card=document.createElement('article'),title=document.createElement('h2'),info=document.createElement('p'),description=document.createElement('p'),canvas=document.createElement('canvas'),actions=document.createElement('div');
        title.textContent=puzzle.name;info.textContent=`By ${entry.creator_name} · ${entry.status}${entry.status==='approved'?(entry.published?' · In gallery':' · Not in gallery'):''} · ${new Date(entry.created_at).toLocaleString()}`;description.textContent=entry.description;canvas.width=32;canvas.height=32;canvas.setAttribute('aria-label',`Preview of ${puzzle.name}`);const ctx=canvas.getContext('2d');for(let y=0;y<32;y++)for(let x=0;x<32;x++){const rgb=puzzle.palette[puzzle.grid[y][x]];if(rgb){ctx.fillStyle=`rgb(${rgb.join(',')})`;ctx.fillRect(x,y,1,1)}}actions.className='actions';
        const play=document.createElement('a');play.href=gameUrl(deploymentUrls().playtest,'playtest',puzzle);play.target='_blank';play.rel='noopener noreferrer';play.textContent='Playtest';actions.append(play);
        const download=document.createElement('button');download.textContent='Export puzzle JSON';download.onclick=()=>exportJson(puzzle);actions.append(download);if(entry.status==='approved'){const exportEntry=document.createElement('button');exportEntry.textContent='Export for gallery';exportEntry.onclick=()=>{const blob=new Blob([JSON.stringify({creatorName:entry.creator_name,description:entry.description,puzzle},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`gallery-${entry.id}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};actions.append(exportEntry)}
        if(entry.status==='approved'){const button=document.createElement('button');button.textContent=entry.published?'Remove from gallery':'Publish to gallery';button.onclick=async()=>{button.disabled=true;try{const action=entry.published?'unpublish':'publish',target=new URL(`submissions/${encodeURIComponent(entry.id)}/${action}`,base.href.endsWith('/')?base.href:base.href+'/');const result=await fetch(target,{method:'POST',headers:{...authorization(),'Content-Type':'application/json'},body:'{}'});if(!result.ok)throw new Error('Could not update the gallery.');await load()}catch(e){$('notice').textContent=e.message;button.disabled=false}};actions.append(button)}
        if(entry.status==='pending')for(const [label,action] of [['Approve','approve'],['Reject','reject']]){const button=document.createElement('button');button.textContent=label;button.onclick=async()=>{button.disabled=true;try{const target=new URL(`submissions/${encodeURIComponent(entry.id)}/${action}`,base.href.endsWith('/')?base.href:base.href+'/');const result=await fetch(target,{method:'POST',headers:{...authorization(),'Content-Type':'application/json'},body:'{}'});if(!result.ok)throw new Error('Could not update this submission.');await load()}catch(e){$('notice').textContent=e.message;button.disabled=false}};actions.append(button)}
        card.append(title,info,description,canvas,actions);$('list').append(card);
      }
    }catch(error){$('notice').textContent=error.message||'Could not load submissions.'}
  }
  $('refresh').onclick=load;$('status').onchange=load;
}
