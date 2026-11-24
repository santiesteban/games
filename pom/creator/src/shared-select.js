/* Shared keyboard and pointer behavior for select controls. */
export function setupSelect(picker, onSelect = () => {}) {
  const trigger = picker.querySelector('.palette-picker__trigger');
  const menu = picker.querySelector('[role=listbox]');
  const options = [...menu.querySelectorAll('[role=option]')];
  const setOpen = open => {
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
  };

  trigger.addEventListener('click', () => setOpen(menu.hidden));
  picker.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      event.stopPropagation();
      setOpen(false);
      trigger.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const index = options.indexOf(document.activeElement);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      options[index < 0 ? (step > 0 ? 0 : options.length - 1) : (index + step + options.length) % options.length].focus();
    }
  });
  menu.addEventListener('click', event => {
    const selected = event.target.closest('[role=option]');
    if (!selected || !menu.contains(selected)) return;
    for (const option of options) option.setAttribute('aria-selected', String(option === selected));
    trigger.querySelector('span').textContent = selected.textContent;
    setOpen(false);
    trigger.focus();
    onSelect(selected.textContent, selected);
  });
  document.addEventListener('click', event => {
    if (!picker.contains(event.target)) setOpen(false);
  });
  picker.addEventListener('focusout', event => {
    if (!picker.contains(event.relatedTarget)) setOpen(false);
  });
}


// Enhance a native select while retaining it as the form's source of truth.
export function enhanceSelect(select) {
  const picker=document.createElement('div');
  picker.className='palette-picker';
  picker.innerHTML='<button type="button" class="palette-picker__trigger" aria-haspopup="listbox" aria-expanded="false"><span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="palette-picker__menu" role="listbox" hidden></div>';
  const trigger=picker.querySelector('button'), menu=picker.querySelector('[role=listbox]');
  const label=select.labels?.[0]?.firstChild?.textContent.trim();
  if(label) trigger.setAttribute('aria-label',label);
  for(const option of select.options){
    const item=document.createElement('button');
    item.type='button';item.setAttribute('role','option');item.dataset.value=option.value;item.textContent=option.textContent;item.disabled=option.disabled;menu.append(item);
  }
  select.after(picker);select.hidden=true;
  function sync(){
    trigger.querySelector('span').textContent=select.selectedOptions[0]?.textContent ?? '';
    for(const item of menu.children)item.setAttribute('aria-selected',String(item.dataset.value===select.value));
  }
  setupSelect(picker, (_, item) => {select.value=item.dataset.value;select.dispatchEvent(new Event('change',{bubbles:true}));});
  select.addEventListener('change',sync);sync();
  return sync;
}
