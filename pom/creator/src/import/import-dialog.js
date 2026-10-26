import {readLevelText} from './level-data.js';
import {createMovementBoard} from '../../../shared/movement-routes.js';

const IMAGE_TYPES = /^(image\/(png|jpeg|webp|avif|gif|bmp|x-ms-bmp))$/i;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|avif|gif|bmp)$/i;

export function createLevelImporter({onOpen}) {
  const $ = id => document.getElementById(id);
  const dialog = $('levelImportDialog'), fileInput = $('levelFile'), status = $('levelImportStatus');
  let request = 0, candidate = null, cancelScan = null, opening = false;

  function clearPreview() {
    candidate = null;
    $('levelImportPreview').hidden = true;
    $('createImportedDraft').disabled = true;
  }
  function report(text, error = false) {
    status.textContent = text;
    status.dataset.error = String(error);
  }
  function show(result) {
    candidate = result;
    const {puzzle, source, warnings} = result;
    $('levelImportName').textContent = puzzle.name;
    $('levelImportDetails').textContent = `${source} · 32 × 32 · ${createMovementBoard(puzzle.grid).groups.length} pieces`;
    const canvas = $('levelImportCanvas'), ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f5f0e5'; ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const slot = puzzle.grid[y][x];
      if (slot === '.') continue;
      ctx.fillStyle = `rgb(${puzzle.palette[slot].join(',')})`; ctx.fillRect(x * 8, y * 8, 8, 8);
    }
    const x = puzzle.goal.x * 8 + 3, y = puzzle.goal.y * 8 + 1;
    ctx.strokeStyle = '#292537'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = '#ff9d1c'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, y + 2); ctx.lineTo(x, y + 4); ctx.fill();
    const list = $('levelImportWarnings'); list.replaceChildren();
    for (const warning of warnings) { const item = document.createElement('li'); item.textContent = warning; list.append(item); }
    list.hidden = !warnings.length;
    $('levelImportPreview').hidden = false;
    $('createImportedDraft').disabled = false;
    report('Level ready. Review it, then create a draft to start editing.');
  }
  async function readImage(file) {
    if (!IMAGE_TYPES.test(file.type) && !IMAGE_EXTENSIONS.test(file.name)) throw new Error('Choose a PNG, JPG, WebP, AVIF, GIF or BMP QR image.');
    if (file.size > 20 * 1024 * 1024) throw new Error('Choose a QR image smaller than 20 MB.');
    const url = URL.createObjectURL(file), image = new Image();
    try {
      image.src = url;
      try { await image.decode(); } catch { throw new Error('This image could not be opened. Try a PNG or JPG copy.'); }
      if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 80000000) throw new Error('Choose an image smaller than 80 megapixels.');
      const scale = Math.min(1, 3072 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext('2d', {willReadFrequently: true});
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } finally { URL.revokeObjectURL(url); }
  }
  function scan(pixels) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./qr.worker.js', import.meta.url), {type: 'module'});
      let settled = false;
      const finish = (error, result) => {
        if (settled) return;
        settled = true; clearTimeout(timer); worker.terminate(); cancelScan = null;
        error ? reject(error) : resolve(result);
      };
      const timer = setTimeout(() => finish(new Error('Reading this QR took too long. Try a closer crop or a sharper image.')), 20000);
      cancelScan = () => finish(new Error('Import cancelled.'));
      worker.onmessage = ({data}) => finish(data.error ? new Error(data.error) : null, data.result);
      worker.onerror = () => finish(new Error('The QR reader could not start. Try opening Little Ledges JSON instead.'));
      worker.postMessage({rgba: pixels.data, width: pixels.width, height: pixels.height}, [pixels.data.buffer]);
    });
  }
  async function read(load) {
    const current = ++request;
    cancelScan?.(); clearPreview(); report('Reading level…');
    try { const result = await load(() => current === request); if (current === request && dialog.open) show(result); }
    catch (error) { if (current === request && dialog.open) report(error.message || 'This level could not be opened.', true); }
  }
  function open() {
    request++; cancelScan?.(); clearPreview(); fileInput.value = ''; $('levelImportLink').value = '';
    report('Your current draft stays in My drafts. Imported levels open as a new draft.'); dialog.showModal();
  }
  $('chooseLevelFile').onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const file = fileInput.files[0]; if (!file) return;
    await read(async active => {
      if (/\.json$/i.test(file.name) || file.type === 'application/json') {
        if (file.size > 65536) throw new Error('Choose a level JSON smaller than 64 KB.');
        return readLevelText(await file.text());
      }
      const pixels = await readImage(file);
      if (!active()) throw new Error('Import cancelled.');
      report('Reading QR code…'); return scan(pixels);
    });
    fileInput.value = '';
  };
  $('readLevelLink').onclick = () => read(() => readLevelText($('levelImportLink').value));
  $('levelImportLink').addEventListener('input', () => { request++; cancelScan?.(); clearPreview(); report('Paste a sharing link, then choose Read link.'); });
  $('createImportedDraft').onclick = async () => {
    if (!candidate || opening) return;
    opening = true;
    const controls = [...dialog.querySelectorAll('button, input')];
    for (const control of controls) control.disabled = true;
    try { await onOpen(candidate); dialog.close(); }
    catch (error) { report(error.message || 'The draft could not be opened.', true); }
    finally { opening = false; for (const control of controls) control.disabled = false; $('createImportedDraft').disabled = !candidate; }
  };
  dialog.addEventListener('cancel', event => { if (opening) event.preventDefault(); });
  dialog.addEventListener('close', () => { request++; cancelScan?.(); clearPreview(); });
  return {open};
}
