import {validatePuzzle,gameUrl,exportJson} from '../../shared/puzzle.js';
import {deploymentUrls} from '../../shared/deployment.js';
const notice=document.getElementById('notice'),list=document.getElementById('list');
try{
 const response=await fetch(new URL('community-gallery.json',location.href));if(!response.ok)throw new Error('Gallery unavailable.');const entries=await response.json();if(!Array.isArray(entries))throw new Error('Gallery data is invalid.');
 for(const entry of entries){const puzzle=validatePuzzle(entry.puzzle),card=document.createElement('article'),heading=document.createElement('h2'),creator=document.createElement('p'),canvas=document.createElement('canvas'),link=document.createElement('a'),download=document.createElement('button');heading.textContent=puzzle.name;creator.textContent=`By ${String(entry.creatorName||'Community creator')}`;canvas.width=32;canvas.height=32;canvas.setAttribute('aria-label',`Preview of ${puzzle.name}`);const ctx=canvas.getContext('2d');for(let y=0;y<32;y++)for(let x=0;x<32;x++){const rgb=puzzle.palette[puzzle.grid[y][x]];if(rgb){ctx.fillStyle=`rgb(${rgb.join(',')})`;ctx.fillRect(x,y,1,1)}}link.textContent='Open in Little Ledges';link.href=gameUrl(deploymentUrls().share,'puzzle',puzzle);download.textContent='Download JSON';download.onclick=()=>exportJson(puzzle);card.append(heading,creator,canvas,document.createElement('br'),link,download);list.append(card)}
 notice.textContent=entries.length?'':'No community puzzles have been published yet.';
}catch(error){notice.textContent=error.message||'Gallery unavailable.'}
