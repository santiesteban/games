// Build a separate preview card for a puzzle.
export function collectionCard(level, {completed=false, pending=false, number=level.number, play, href}) {
  const card=document.querySelector('#levelCardTemplate').content.firstElementChild.cloneNode(true);
  card.dataset.levelId=level.id;
  card.href=href??`#level=${encodeURIComponent(level.id)}`;
  card.setAttribute('aria-label',`${number ? `Level ${number}, ` : ''}${level.name}${completed ? ', completed' : ''}${level.knownIssues ? ', known issues' : ''}`);
  card.querySelector('.level-card__number').textContent=number ? String(number).padStart(2,'0') : '';
  card.querySelector('.level-card__number').hidden=!number;
  card.querySelector('.level-card__title').textContent=level.name;
  if(play)card.addEventListener('click',event=>{event.preventDefault();play(level)});
  if(completed){
    const check=document.createElement('span');
    check.className=`completion-mark preview-card__completed${pending ? ' is-pending' : ''}`;
    check.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg>';
    check.setAttribute('aria-hidden','true');card.append(check);
  }
  if(level.knownIssues){
    const status=document.createElement('span');status.className='collection-issue issue-tag';
    status.textContent='Known issues';card.querySelector('.level-card__preview').append(status);
  }
  return card;
}
