import { parsePuzzle, validatePuzzle, puzzleLevel, exportJson, newPuzzleId } from '../shared/puzzle.js';
import { stored, storageChannel } from '../shared/storage.js';
import {deploymentUrls} from '../shared/deployment.js';
import {openExternal,canPickPuzzleFile,pickPuzzleFile,subscribePuzzleImports} from '../shared/platform.js';
import {puzzleFromTransfer,puzzleFromLink} from '../shared/puzzle-transfer.js';
import { puzzleThumbnail } from './puzzle-thumbnail.js';
import './my-puzzles.css';

export function createMyPuzzles({play,onChange,creatorUrl}){
  let records=[],deleted,undoTimer,previewPuzzle,ready=false;
  function paintedBounds(grid){
    let left=Infinity,right=-1,top=Infinity,bottom=-1;
    grid.forEach((row,y)=>[...row].forEach((slot,x)=>{if(slot!=='.'){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}));
    return{left,top,width:right-left+1,height:bottom-top+1};
  }
  function thumbnail(level){const svg=puzzleThumbnail(level),bounds=paintedBounds(level.grid);if(bounds.width>0)svg.setAttribute('viewBox',`${bounds.left-.5} ${bounds.top-.5} ${bounds.width+1} ${bounds.height+1}`);return svg}

  const listeners=storageChannel(()=>reload());
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;document.body.append(input);
  const dialog=document.createElement('dialog');dialog.className='puzzle-import';dialog.setAttribute('aria-labelledby','userPuzzleImportTitle');dialog.setAttribute('aria-describedby','userPuzzleImportDetails');
  dialog.innerHTML='<header class="import-header"><h2 id="userPuzzleImportTitle" tabindex="-1">Import user created puzzle</h2><form method="dialog"><button class="btn import-close" aria-label="Close puzzle import">✕</button></form></header><h3 class="import-puzzle-name"></h3><div class="import-art"></div><p class="import-details" id="userPuzzleImportDetails"></p><p class="import-copy"></p><p class="import-existing" hidden></p><p class="import-error" role="status"></p><div class="import-actions"><button class="btn" data-action="copy">Save as a copy</button><button class="btn menu-primary" data-action="add">Add to My Puzzles</button></div>';
  document.body.append(dialog);
  const manager=document.createElement('dialog');manager.className='puzzle-import puzzle-manager';manager.setAttribute('aria-labelledby','puzzleManagerTitle');
  manager.innerHTML='<header class="import-header"><h2 id="puzzleManagerTitle">Manage my puzzles</h2><form method="dialog"><button class="btn import-close" aria-label="Close puzzle manager">✕</button></form></header><div class="puzzle-manager-list"></div>';
  document.body.append(manager);
  const message=document.createElement('div');message.className='puzzle-notice';message.setAttribute('role','status');message.hidden=true;document.body.append(message);
  function notice(text,undo=false){message.replaceChildren(document.createTextNode(text));message.hidden=false;message.classList.toggle('in-manager',manager.open);(manager.open?manager:document.body).append(message);if(undo){const b=document.createElement('button');b.className='btn';b.textContent='Undo';b.onclick=async()=>{if(!deleted)return;try{await stored('puzzles','put',deleted);deleted=null;message.hidden=true;listeners.notify();await reload()}catch(e){notice(e.message)}};message.append(b)}clearTimeout(undoTimer);undoTimer=setTimeout(()=>{message.hidden=true;deleted=null},10000)}
  async function reload(){try{records=(await stored('puzzles','getAll')).sort((a,b)=>b.updatedAt-a.updatedAt);ready=true;if(manager.open)renderManager();onChange()}catch(e){ready=true;notice(e.message)}}
  function preview(puzzle){
    previewPuzzle=validatePuzzle(puzzle);const existing=records.find(r=>r.id===puzzle.id),same=existing?.puzzle.revision===previewPuzzle.revision;
    const bounds=paintedBounds(previewPuzzle.grid);dialog.querySelector('.import-details').textContent=`${bounds.width} × ${bounds.height} cells`;
    dialog.querySelector('.import-puzzle-name').textContent=previewPuzzle.name;dialog.querySelector('.import-art').replaceChildren(thumbnail(puzzleLevel(previewPuzzle)));
    dialog.querySelector('.import-copy').textContent="This puzzle is user-created and we haven't verified if it's solvable. The puzzle will be stored on this device only.";
    const duplicate=dialog.querySelector('.import-existing');duplicate.hidden=!existing;duplicate.textContent=existing?(same?'This puzzle is already in your library. You can open it or save a separate copy.':'A different version is in your library. Replacing its layout clears completion. You can also save a separate copy.'):'';
    dialog.querySelector('.import-error').textContent='';dialog.querySelector('[data-action="add"]').textContent=existing?(same?'Open saved puzzle':'Replace saved version'):'Add to My Puzzles';dialog.querySelector('[data-action="copy"]').hidden=!existing;
    if(!dialog.open){dialog.showModal();dialog.querySelector('#userPuzzleImportTitle').focus({preventScroll:true})}
  }
  async function add(copy=false){try{const p=copy?validatePuzzle({...previewPuzzle,id:newPuzzleId(),revision:undefined}):previewPuzzle,old=records.find(r=>r.id===p.id);await stored('puzzles','put',{id:p.id,puzzle:p,updatedAt:Date.now(),completed:old?.puzzle.revision===p.revision&&old.completed||false});listeners.notify();await reload();dialog.close();play(puzzleLevel(p))}catch(e){dialog.querySelector('.import-error').textContent=`Could not save: ${e.message}`}}
  dialog.querySelector('[data-action="add"]').onclick=()=>add();dialog.querySelector('[data-action="copy"]').onclick=()=>add(true);
  async function importFile(){
    if(!canPickPuzzleFile()){input.click();return}
    try{const text=await pickPuzzleFile();if(text!==null&&text!==undefined){await loaded;preview(parsePuzzle(text))}}catch(error){notice(error.message)}
  }
  input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>65536)throw new Error('Choose a puzzle JSON smaller than 64 KB.');await loaded;preview(parsePuzzle(await file.text()))}catch(e){notice(e.message)}finally{input.value=''}};
  function renderManager(){
    const host=manager.querySelector('.puzzle-manager-list');host.replaceChildren();
    if(!records.length){host.textContent='No saved puzzles.';return}
    for(const record of records){
      const row=document.createElement('div');row.className='puzzle-manager-row';const name=document.createElement('strong');name.textContent=record.puzzle.name;
      const actions=document.createElement('div');actions.className='puzzle-manager-actions';
      const exp=document.createElement('button');exp.type='button';exp.className='btn';exp.textContent='Export JSON';exp.setAttribute('aria-label',`Export ${record.puzzle.name}`);exp.onclick=async()=>{try{await exportJson(record.puzzle)}catch(error){notice(error.message)}};
      const del=document.createElement('button');del.type='button';del.className='btn is-delete';del.textContent='Delete';del.setAttribute('aria-label',`Delete ${record.puzzle.name}`);del.onclick=async()=>{try{await stored('puzzles','delete',record.id);deleted=record;listeners.notify();await reload();notice(`“${record.puzzle.name}” deleted.`,true);(host.querySelector('button')??manager.querySelector('.import-close')).focus()}catch(error){notice(error.message)}};
      actions.append(exp,del);row.append(name,actions);host.append(row);
    }
  }
  manager.addEventListener('close',()=>{if(message.parentElement===manager){document.body.append(message);message.classList.remove('in-manager')}});
  function render(parent,revealLevelId,gridObserver){
    const section=document.createElement('section');section.className='level-group my-puzzles';const head=document.createElement('header');head.className='level-group-header';const heading=document.createElement('h2');heading.textContent='My Puzzles';head.append(heading);
    const actions=document.createElement('div');actions.className='my-puzzles-actions';const create=document.createElement('a');create.href=creatorUrl;create.target='_blank';create.rel='noopener';create.className='btn';create.textContent='＋ Create a puzzle';create.onclick=event=>{event.preventDefault();openExternal(creatorUrl).catch(error=>notice(error.message))};const upload=document.createElement('button');upload.type='button';upload.className='btn';upload.textContent='Import JSON';upload.onclick=importFile;const manage=document.createElement('button');manage.type='button';manage.className='btn';manage.textContent='Manage puzzles';manage.disabled=!records.length;manage.onclick=()=>{renderManager();manager.showModal()};actions.append(create,upload,manage);head.append(actions);section.append(head);
    if(!records.length){const empty=document.createElement('p');empty.className='my-puzzles-empty';empty.textContent=ready?'No puzzles yet. Create a puzzle or import JSON to get started.':'Loading your puzzles…';section.append(empty)}
    const list=document.createElement('div');list.className='level-group-items';
    for(const record of records){
      const level=puzzleLevel(record.puzzle),wrap=document.createElement('article');wrap.className='my-puzzle-card';
      const button=document.createElement('button');button.type='button';button.className='level-card';button.dataset.levelId=level.id;button.setAttribute('aria-label',`Play ${level.name}${record.completed?', completed':''}`);button.onclick=()=>play(level);
      const art=document.createElement('span');art.className='level-preview';art.append(thumbnail(level));
      if(record.completed){const check=document.createElement('span');check.className='completion-mark';check.textContent='✓';check.setAttribute('aria-hidden','true');check.classList.toggle('is-pending',level.id===revealLevelId);art.append(check)}
      const caption=document.createElement('span');caption.className='level-card-caption';const details=document.createElement('span');details.className='level-details';const name=document.createElement('strong');name.textContent=level.name;details.append(name);caption.append(details);button.append(art,caption);wrap.append(button);
      list.append(wrap);
    }
    if(records.length){const frame=document.createElement('div');frame.className='level-grid';const outline=document.createElementNS('http://www.w3.org/2000/svg','svg');outline.setAttribute('class','level-grid-outline');outline.setAttribute('aria-hidden','true');outline.setAttribute('focusable','false');frame.append(list,outline);section.append(frame);gridObserver?.observe(list)}
    parent.append(section);
  }
  async function complete(level){if(level.temporaryPlaytest)return;try{const record=await stored('puzzles','get',level.userPuzzle.id);if(record&&record.puzzle.revision===level.userPuzzle.revision){await stored('puzzles','put',{...record,completed:true});listeners.notify();await reload()}}catch(e){notice(e.message)}}
  let pendingLink,nativeConnected=false;
  const urls=deploymentUrls(),allowedGameUrls=[urls.game,urls.share];
  function readLink(){
    const url=new URL(location.href),hash=new URLSearchParams(url.hash.slice(1));
    if(!hash.has('puzzle')&&!url.searchParams.has('puzzle'))return;
    try{pendingLink=puzzleFromLink(url.href,allowedGameUrls)}catch(error){notice(error.message)}
    hash.delete('puzzle');url.hash=hash.toString();url.searchParams.delete('puzzle');history.replaceState(null,'',url);
  }
  readLink();
  const loaded=reload();
  async function openPending(){
    await loaded;
    if(!nativeConnected){nativeConnected=true;subscribePuzzleImports(async transfer=>{await loaded;preview(puzzleFromTransfer(transfer,allowedGameUrls))},error=>notice(error.message))}
    if(pendingLink){preview(pendingLink);pendingLink=null}
  }
  window.addEventListener('hashchange',()=>{readLink();openPending()});
  return {render,complete,openPending,preview};
}
