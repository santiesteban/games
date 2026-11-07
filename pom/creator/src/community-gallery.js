import {validatePuzzle,gameUrl,puzzleLevel} from '../../shared/puzzle.js';
import {deploymentUrls} from '../../shared/deployment.js';
import {userPuzzleThumbnail} from '../../src/puzzle-thumbnail.js';
import './community-gallery.css';

const notice=document.getElementById('notice'),list=document.getElementById('list'),count=document.getElementById('count');
let parentOrigin=null,loadStatus=null;
function reportStatus(){if(parentOrigin&&loadStatus)window.parent.postMessage({type:'little-ledges:gallery-status',status:loadStatus},parentOrigin)}
window.addEventListener('message',event=>{if(window.parent!==window&&event.source===window.parent&&event.data?.type==='little-ledges:gallery-handshake'&&event.origin!=='null'){parentOrigin=event.origin;reportStatus()}});

function puzzleCard(entry){
  const puzzle=validatePuzzle(entry.puzzle),card=document.createElement('article'),art=document.createElement('div'),content=document.createElement('div'),heading=document.createElement('h3'),creator=document.createElement('p'),actions=document.createElement('div'),link=document.createElement('a');
  card.className='puzzle-card';art.className='puzzle-art';content.className='card-content';creator.className='creator';actions.className='card-actions';link.className='neo-button';
  heading.textContent=puzzle.name;creator.textContent=`By ${String(entry.creatorName||'Community creator')}`;art.append(userPuzzleThumbnail(puzzleLevel(puzzle)));
  link.textContent='Add to My Puzzles';link.href=gameUrl(deploymentUrls().share,'puzzle',puzzle);
  link.onclick=event=>{if(parentOrigin){event.preventDefault();window.parent.postMessage({type:'little-ledges:gallery-import',url:link.href},parentOrigin)}};
  actions.append(link);content.append(heading,creator,actions);card.append(art,content);return card;
}

try{
  const preview=import.meta.env.DEV&&new URLSearchParams(location.search).has('preview');
  let entries;
  if(preview){entries=(await import('./gallery-preview.js')).previewPuzzles()}
  else{const galleryUrl=import.meta.env.VITE_COMMUNITY_GALLERY_API||new URL('community-gallery.json',location.href);const response=await fetch(galleryUrl);if(!response.ok)throw new Error('Gallery unavailable.');entries=await response.json()}
  if(!Array.isArray(entries))throw new Error('Gallery data is invalid.');
  for(const entry of entries)list.append(puzzleCard(entry));
  count.hidden=false;count.textContent=`${entries.length} ${entries.length===1?'puzzle':'puzzles'}`;
  notice.textContent=entries.length?'':'No community puzzles have been published yet.';loadStatus='ready';reportStatus();
}catch(error){notice.textContent=error.message||'Gallery unavailable.';loadStatus='error';reportStatus()}
