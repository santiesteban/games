import {validatePuzzle,gameUrl,exportJson} from '../../shared/puzzle.js';
import {deploymentUrls} from '../../shared/deployment.js';
import './community-gallery.css';

const notice=document.getElementById('notice'),list=document.getElementById('list'),count=document.getElementById('count');

function puzzleArt(puzzle){
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Preview of ${puzzle.name}`);
  const cells=[];
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const rgb=puzzle.palette[puzzle.grid[y][x]];if(rgb)cells.push({x,y,rgb})}
  if(!cells.length)return canvas;
  const left=Math.min(...cells.map(cell=>cell.x)),right=Math.max(...cells.map(cell=>cell.x)),top=Math.min(...cells.map(cell=>cell.y)),bottom=Math.max(...cells.map(cell=>cell.y));
  const size=Math.min(20,Math.floor(144/Math.max(right-left+1,bottom-top+1))),offsetX=(160-(right-left+1)*size)/2,offsetY=(160-(bottom-top+1)*size)/2,ctx=canvas.getContext('2d');
  for(const cell of cells){ctx.fillStyle=`rgb(${cell.rgb.join(',')})`;ctx.fillRect(offsetX+(cell.x-left)*size,offsetY+(cell.y-top)*size,size,size)}
  return canvas;
}

function puzzleCard(entry){
  const puzzle=validatePuzzle(entry.puzzle),card=document.createElement('article'),art=document.createElement('div'),content=document.createElement('div'),heading=document.createElement('h3'),creator=document.createElement('p'),actions=document.createElement('div'),link=document.createElement('a'),download=document.createElement('button');
  card.className='puzzle-card';art.className='puzzle-art';content.className='card-content';creator.className='creator';actions.className='card-actions';link.className='neo-button';download.className='download';
  heading.textContent=puzzle.name;creator.textContent=`By ${String(entry.creatorName||'Community creator')}`;art.append(puzzleArt(puzzle));
  link.textContent='Import to My Puzzles';link.href=gameUrl(deploymentUrls().share,'puzzle',puzzle);
  download.type='button';download.textContent='Download JSON';download.onclick=()=>exportJson(puzzle);
  actions.append(link,download);content.append(heading,creator,actions);card.append(art,content);return card;
}

try{
  const preview=import.meta.env.DEV&&new URLSearchParams(location.search).has('preview');
  let entries;
  if(preview){entries=(await import('./gallery-preview.js')).previewPuzzles()}
  else{const galleryUrl=import.meta.env.VITE_COMMUNITY_GALLERY_API||new URL('community-gallery.json',location.href);const response=await fetch(galleryUrl);if(!response.ok)throw new Error('Gallery unavailable.');entries=await response.json()}
  if(!Array.isArray(entries))throw new Error('Gallery data is invalid.');
  for(const entry of entries)list.append(puzzleCard(entry));
  count.hidden=false;count.textContent=`${entries.length} ${entries.length===1?'puzzle':'puzzles'}`;
  notice.textContent=preview?'Example puzzles for this local preview.':entries.length?'':'No community puzzles have been published yet.';
}catch(error){notice.textContent=error.message||'Gallery unavailable.'}
