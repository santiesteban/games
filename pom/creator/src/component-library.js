import './shared-foundation.css';
import './shared-tokens.css';
import './shared-buttons.css';
import './shared-fields.css';
import './shared-controls.css';
import './shared-select.css';
import './component-library.css';
import {prototypeIcons} from './prototype-icons.js';

// Reuse examples across layout variants and in the gallery sheet.
const copyExamples = (source, target) => {
  for (const card of source.children) target.append(card.cloneNode(true));
};
copyExamples(document.querySelector('#joinedPreviewExamples'), document.querySelector('#separatePreviewExamples'));
copyExamples(document.querySelector('#joinedNavigationExamples'), document.querySelector('#separateNavigationExamples'));
const galleryGrid = document.querySelector('.gallery-sheet__grid');
copyExamples(document.querySelector('#metadataExamples'), galleryGrid);
for (const button of galleryGrid.querySelectorAll('.preview-card__add')) {
  button.classList.replace('preview-card__add', 'gallery-sheet__add');
}

for (const button of document.querySelectorAll('[data-icon]')) {
  button.insertAdjacentHTML('afterbegin', prototypeIcons[button.dataset.icon] ?? '');
}

// The examples use native controls; changing one never affects a real puzzle.
for (const group of document.querySelectorAll('.library__tools, .canvas-sizes, .library__swatches, .selection-tabs, .action-control')) {
  group.addEventListener('click', event => {
    const selected = event.target.closest('button[aria-pressed]');
    if (!selected || !group.contains(selected)) return;
    for (const button of group.querySelectorAll('button[aria-pressed]')) {
      button.setAttribute('aria-pressed', String(button === selected));
      if (group.classList.contains('library__swatches')) button.textContent = button === selected ? '✓' : '';
    }
  });
}

const range = document.querySelector('#sampleRange');
range.addEventListener('input', () => {
  document.querySelector('#rangeValue').textContent = `${range.value}%`;
});

// Both examples use the Creator's select styling and the same keyboard behavior.
function setupSelect(picker, onSelect = () => {}) {
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
    onSelect(selected.textContent);
  });
  document.addEventListener('click', event => {
    if (!picker.contains(event.target)) setOpen(false);
  });
  picker.addEventListener('focusout', event => {
    if (!picker.contains(event.relatedTarget)) setOpen(false);
  });
}

setupSelect(document.querySelector('#samplePicker'));

for (const [trigger, dialog] of [
  ['#showSubmit', '#sampleSubmit'],
  ['#showConfirm', '#sampleConfirm'],
  ['#showSheet', '#sampleSheet'],
  ['#showPreview', '#samplePreview'],
  ['#showGallerySheet', '#sampleGallerySheet'],
]) {
  document.querySelector(trigger).addEventListener('click', () => document.querySelector(dialog).showModal());
}
for (const button of document.querySelectorAll('dialog [data-close]')) {
  button.addEventListener('click', () => button.closest('dialog').close());
}

document.querySelector('.zoom-control').addEventListener('click', event => {
  const button = event.target.closest('[data-zoom]');
  if (!button) return;
  const input = button.parentElement.querySelector('input');
  input.value = Number(input.value) + Number(button.dataset.zoom) * 10;
  input.dispatchEvent(new Event('input', {bubbles: true}));
});

function showAdded(button) {
  const status = document.createElement('span');
  status.className = 'preview-card__added';
  status.setAttribute('role', 'status');
  status.textContent = '✓ Added to My Puzzles';
  button.replaceWith(status);
}
for (const button of document.querySelectorAll('.preview-card__add, .gallery-sheet__add')) {
  button.addEventListener('click', () => showAdded(button));
}

const gallery = document.querySelector('#sampleGallerySheet');
const search = gallery.querySelector('input[type=search]');
const cards = [...gallery.querySelectorAll('.preview-card--metadata')];
const grid = gallery.querySelector('.gallery-sheet__grid');
let sort = 'Newest first';

function updateGallery() {
  const term = search.value.trim().toLowerCase();
  let count = 0;
  for (const card of cards) {
    const title = card.querySelector('strong').textContent;
    const author = card.querySelector('.preview-card__author').textContent;
    card.hidden = !`${title} ${author}`.toLowerCase().includes(term);
    if (!card.hidden) count++;
  }
  gallery.querySelector('.gallery-sheet__count').textContent = `${count} ${count === 1 ? 'puzzle' : 'puzzles'}`;
  gallery.querySelector('.gallery-sheet__empty').hidden = count > 0;
  const ordered = [...cards].sort((a, b) => {
    if (sort === 'Name A–Z') return a.querySelector('strong').textContent.localeCompare(b.querySelector('strong').textContent);
    const comparison = a.querySelector('time').dateTime.localeCompare(b.querySelector('time').dateTime);
    return sort === 'Oldest first' ? comparison : -comparison;
  });
  grid.append(...ordered);
}

search.addEventListener('input', updateGallery);
setupSelect(gallery.querySelector('.gallery-sheet__sort .palette-picker'), value => {
  sort = value;
  updateGallery();
});
