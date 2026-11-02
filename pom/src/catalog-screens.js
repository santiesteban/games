import {collectionCard,updateGridEdges} from './collection-view.js';
import {puzzleThumbnail} from './puzzle-thumbnail.js';

const thumbnails={
  'basic-lessons':new URL('./assets/interface/pack_01_thumb.png',import.meta.url).href,
  'first-challenges':new URL('./assets/interface/pack_02_thumb.png',import.meta.url).href,
  'more-challenges':new URL('./assets/interface/pack_03_thumb.png',import.meta.url).href,
};

export function createCatalogScreens({levels,groups,progress,isAvailable,myPuzzles,thumbnailLevel,open,play}) {
  let collection=groups[0]?.id,ready=false;
  const packList=document.querySelector('#packList');
  const personalList=document.querySelector('#personalPackList');
  const grid=document.querySelector('#collectionGrid');
  const scroller=document.querySelector('#menuScreen');
  const empty=document.querySelector('#collectionEmpty');
  const actions=document.querySelector('#collectionActions');
  new ResizeObserver(()=>updateGridEdges(grid)).observe(grid);

  function groupLevels(id){return levels.filter(level=>level.group===id)}
  // Studio tools remain accessible, but are not completion objectives.
  function progressLevels(id){return groupLevels(id).filter(level=>!['design-playground','background-studio'].includes(level.kind))}
  function count(completed,total){return `${completed} / ${total}`}
  function groupProgress(id){const items=progressLevels(id);return count(items.filter(level=>progress.has(level.id)).length,items.length)}

  function packCard(id,name,progressText,index){
    const item=document.querySelector('#packCardTemplate').content.firstElementChild.cloneNode(true);
    const link=item.querySelector('a');link.href=`#collection=${encodeURIComponent(id)}`;link.dataset.collection=id;
    link.setAttribute('aria-disabled',String(!ready));
    link.addEventListener('click',event=>{
      event.preventDefault();if(!ready)return;
      collection=id;scroller.scrollTop=0;open();
    });
    item.querySelector('.pack-card__title').textContent=name;
    item.querySelector('.pack-card__progress').textContent=progressText;
    const art=item.querySelector('.pack-card__art'),image=art.querySelector('img');
    if(thumbnails[id])image.src=thumbnails[id];
    else{
      image.remove();art.classList.add('pack-card__art-squares',index%2?'pack-card__art-squares--special':'pack-card__art-squares--mind');
      art.setAttribute('aria-hidden','true');art.append(...Array.from({length:3},()=>document.createElement('span')));
    }
    return item;
  }

  function renderHome(){
    packList.replaceChildren(...groups.map((group,index)=>packCard(group.id,group.name,groupProgress(group.id),index)));
    const placeholder=document.createElement('li');
    placeholder.innerHTML=`<article class="pack-card" aria-label="Special Packs, coming soon">
      <span class="pack-card__art pack-card__art-squares pack-card__art-squares--special" aria-hidden="true"><span></span><span></span><span></span></span>
      <span class="pack-card__copy"><span class="pack-card__title">Special Packs</span></span>
      <span class="pack-card__lock" aria-hidden="true"><svg class="pack-card__lock-icon" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.6"/></svg></span>
    </article>`;
    packList.append(placeholder);packList.setAttribute('aria-busy',String(!ready));
    const summary=myPuzzles.summary;
    personalList.replaceChildren(packCard('my-puzzles','My Puzzles',summary.ready?count(summary.completed,summary.total):'Loading…',1));
  }

  function render(revealLevelId){
    const scroll=scroller.scrollTop;
    renderHome();
    grid.replaceChildren();actions.replaceChildren();actions.hidden=true;empty.hidden=true;
    const personal=collection==='my-puzzles';
    const group=groups.find(group=>group.id===collection);
    const title=personal?'My Puzzles':group?.name??'Levels';
    document.querySelector('#collectionTitle').textContent=title;
    grid.setAttribute('aria-label',`${title} levels`);
    document.querySelector('#collectionProgress').textContent=personal?count(myPuzzles.summary.completed,myPuzzles.summary.total):groupProgress(collection);
    if(personal){
      myPuzzles.renderCollection(grid,actions,revealLevelId);
      actions.hidden=false;
      if(!grid.childElementCount){empty.hidden=false;empty.textContent=myPuzzles.summary.ready?'No puzzles yet. Upload a level or open the Level Maker to get started.':'Loading your puzzles…'}
    }else{
      for(const level of groupLevels(collection).filter(level=>level.id===revealLevelId||isAvailable(level))){
        const card=collectionCard(level,{completed:progress.has(level.id),pending:level.id===revealLevelId,play});
        const art=puzzleThumbnail(thumbnailLevel(level));art.classList.add('level-card__art');
        card.querySelector('.level-card__preview').prepend(art);grid.append(card);
      }
      if(!grid.childElementCount){empty.hidden=false;empty.textContent='No levels to show with your current settings.'}
    }
    updateGridEdges(grid);
    scroller.scrollTop=scroll;
  }

  return{
    render,renderHome,
    ready(){ready=true;renderHome()},
    selectForLevel(level){collection=level.userPuzzle?'my-puzzles':level.group},
  };
}
