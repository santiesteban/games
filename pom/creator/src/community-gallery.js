import {enhanceSelect} from './shared-select.js';
import {validatePuzzle,gameUrl,puzzleLevel} from '../../shared/puzzle.js';
import {deploymentUrls} from '../../shared/deployment.js';
import {userPuzzleThumbnail} from '../../src/puzzle-thumbnail.js';
import QRCode from 'qrcode';
import './shared-tokens.css';
import './shared-buttons.css';
import './shared-navigation-cards.css';
import './shared-gallery-sheet.css';
import './shared-select.css';
import './community-gallery.css';
import './navigation.css';
const notice=document.getElementById('notice'),list=document.getElementById('list'),count=document.getElementById('count'),search=document.getElementById('search'),sort=document.getElementById('sort'),dialog=document.getElementById('qrDialog');
let parentOrigin=null,loadStatus=null,entries=[],unavailable=0,savedPuzzles=new Map();
enhanceSelect(sort);
sort.nextElementSibling.classList.add('gallery-sort');


function reportStatus(){if(parentOrigin&&loadStatus)window.parent.postMessage({type:'little-ledges:gallery-status',status:loadStatus},parentOrigin)}
window.addEventListener('message',event=>{if(window.parent!==window&&event.source===window.parent&&event.data?.type==='little-ledges:gallery-handshake'&&event.origin!=='null'){parentOrigin=event.origin;savedPuzzles=new Map(Array.isArray(event.data.savedPuzzles)?event.data.savedPuzzles.filter(item=>typeof item?.id==='string').map(item=>[item.id,item.revision]):[]);document.body.classList.add('in-app');reportStatus();render()}});
window.addEventListener('message',event=>{if(parentOrigin&&event.source===window.parent&&event.origin===parentOrigin&&event.data?.type==='little-ledges:gallery-import-error'){render();notice.textContent=event.data.message||'Could not add this level.'}});
function dateOf(entry){const raw=entry.publishedAt??entry.published_at??entry.createdAt??entry.created_at;if(!raw)return null;const date=new Date(raw);return Number.isNaN(date.getTime())?null:date}
function puzzleCard(entry){
 const puzzle=entry.validPuzzle,card=document.createElement('article'),art=document.createElement('div'),content=document.createElement('div'),heading=document.createElement('h2'),creator=document.createElement('p'),date=document.createElement('p'),actions=document.createElement('div'),button=document.createElement('button');
 card.className='puzzle-card preview-card preview-card--metadata';art.className='puzzle-art preview-card__visual';content.className='card-content preview-card__body';creator.className='creator preview-card__author';date.className='date preview-card__date';actions.className='card-actions';button.type='button';button.className='gallery-button button button--primary preview-card__add';
 heading.textContent=puzzle.name;creator.textContent=`By ${String(entry.creatorName||entry.creator_name||'Community creator')}`;const published=dateOf(entry);date.textContent=published?new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(published):'Date unavailable';const thumb=userPuzzleThumbnail(puzzleLevel(puzzle));let left=Infinity,right=-1,top=Infinity,bottom=-1;puzzle.grid.forEach((row,y)=>[...row].forEach((slot,x)=>{if(slot!=='.'){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}));if(right>=left){thumb.setAttribute('viewBox',`${left} ${top} ${right-left+1} ${bottom-top+1}`);thumb.setAttribute('preserveAspectRatio','xMidYMax meet')}art.append(thumb);
 const url=gameUrl(deploymentUrls().share,'puzzle',puzzle);
 if(parentOrigin){const state=document.createElement('span');state.className='saved-status preview-card__added';const exists=savedPuzzles.has(puzzle.id),saved=exists&&savedPuzzles.get(puzzle.id)===puzzle.revision;state.textContent=saved?'✓ Added to My Puzzles':exists?'Update available':'';button.textContent=exists?'Review update':'Add to My Puzzles';button.onclick=()=>{button.disabled=true;button.textContent='Adding…';window.parent.postMessage({type:'little-ledges:gallery-import',url},parentOrigin)};content.append(heading,creator,date);if(saved){actions.append(state)}else{if(exists)content.append(state);actions.append(button)}}else{button.textContent='Show level QR';button.onclick=async()=>{document.getElementById('qrName').textContent=puzzle.name;document.getElementById('qrStatus').textContent='';const canvas=document.getElementById('qrCanvas');canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);dialog.showModal();try{await QRCode.toCanvas(canvas,url,{width:256,margin:4,errorCorrectionLevel:'M'})}catch{document.getElementById('qrStatus').textContent='This puzzle is too large to display as a QR code.'}};content.append(heading,creator,date);actions.append(button)}
 content.append(actions);card.append(art,content);return card;
}
function render(){const query=search.value.trim().toLocaleLowerCase();const matching=entries.filter(e=>(e.validPuzzle.name+' '+(e.creatorName||e.creator_name||'')).toLocaleLowerCase().includes(query));matching.sort((a,b)=>{const mode=sort.value;if(mode==='az'||mode==='za'){const n=a.validPuzzle.name.localeCompare(b.validPuzzle.name);return mode==='az'?n:-n}const ad=dateOf(a),bd=dateOf(b);if(!ad||!bd)return ad?-1:bd?1:0;return mode==='new'?bd-ad:ad-bd});list.replaceChildren(...matching.map(puzzleCard));count.hidden=false;count.textContent=`${matching.length} ${matching.length===1?'level':'levels'}`;notice.textContent=unavailable?`${unavailable} ${unavailable===1?'puzzle is':'puzzles are'} unavailable in this version.`:matching.length?'':entries.length?'No levels match your search.':'No community puzzles have been published yet.'}
search.addEventListener('input',render);sort.addEventListener('change',render);document.getElementById('qrClose').onclick=()=>dialog.close();document.getElementById('qrDone').onclick=()=>dialog.close();
try{const preview=import.meta.env.DEV&&new URLSearchParams(location.search).has('preview');let data;if(preview)data=(await import('./gallery-preview.js')).previewPuzzles();else{const galleryUrl=import.meta.env.VITE_COMMUNITY_GALLERY_API||'https://little-ledges-poc-review.community-poc.workers.dev/gallery';const response=await fetch(galleryUrl);if(!response.ok)throw new Error('Gallery unavailable.');data=await response.json()}if(!Array.isArray(data))throw new Error('Gallery data is invalid.');for(const entry of data){try{entries.push({...entry,validPuzzle:validatePuzzle(entry.puzzle)})}catch{unavailable++}}render();loadStatus='ready';reportStatus()}catch(error){notice.textContent=error.message||'Gallery unavailable.';loadStatus='error';reportStatus()}
