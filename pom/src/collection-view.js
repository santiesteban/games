// Cards and row edges follow collection_static.html in the approved prototype.
export function collectionCard(level, {completed=false, pending=false, number=level.number, play}) {
  const card=document.querySelector('#levelCardTemplate').content.firstElementChild.cloneNode(true);
  card.dataset.levelId=level.id;
  card.href=`#level=${encodeURIComponent(level.id)}`;
  card.setAttribute('aria-label',`${number ? `Level ${number}, ` : ''}${level.name}${completed ? ', completed' : ''}${level.knownIssues ? ', known issues' : ''}`);
  card.querySelector('.level-card__number').textContent=number ? String(number).padStart(2,'0') : '';
  card.querySelector('.level-card__number').hidden=!number;
  card.querySelector('.level-card__title').textContent=level.name;
  card.addEventListener('click',event=>{event.preventDefault();play(level)});
  if(completed){
    const check=document.createElement('span');
    check.className=`completion-mark${pending ? ' is-pending' : ''}`;
    check.textContent='✓';check.setAttribute('aria-hidden','true');card.append(check);
  }
  if(level.knownIssues){
    const status=document.createElement('span');status.className='collection-issue';
    status.textContent='Known issues';card.querySelector('.level-card__preview').append(status);
  }
  return card;
}

export function updateGridEdges(grid) {
  const rows=[];
  for(const card of grid.querySelectorAll('.level-card')){
    const top=card.getBoundingClientRect().top,lastRow=rows.at(-1);
    if(!lastRow||Math.abs(lastRow.top-top)>.5)rows.push({top,cards:[card]});
    else lastRow.cards.push(card);
  }
  rows.forEach((row,rowIndex)=>{
    const firstRow=rowIndex===0,lastRow=rowIndex===rows.length-1,nextRow=rows[rowIndex+1];
    row.cards.forEach((card,columnIndex)=>{
      const firstColumn=columnIndex===0,lastColumn=columnIndex===row.cards.length-1;
      card.classList.toggle('level-card--first-row',firstRow);
      card.classList.toggle('level-card--row-start',firstColumn);
      card.classList.toggle('level-card--top-left',firstRow&&firstColumn);
      card.classList.toggle('level-card--top-right',firstRow&&lastColumn);
      card.classList.toggle('level-card--bottom-left',lastRow&&firstColumn);
      card.classList.toggle('level-card--bottom-right',lastColumn&&(lastRow||nextRow.cards.length<row.cards.length));
    });
  });
  grid.setAttribute('data-grid-ready','');
}
