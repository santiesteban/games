import {decodePuzzle, parsePuzzle, validatePuzzle} from '../../../shared/puzzle.js';
import {parsePayload} from './vendor/pushmo-decode.js';
import {exportLittleLedges} from './vendor/pushmo-convert.js';

const PUSHMO_JSON_PREFIX = 'PUSHMOJSON1:';
const MAX_TEXT = 65536;

function convertedPushmo(source) {
  const {puzzle, warnings} = exportLittleLedges(source);
  return {puzzle: validatePuzzle(puzzle), source: 'Pushmo', warnings: warnings.map(warning =>
    warning.startsWith('Artwork ends at row')
      ? 'The drawing does not touch the floor. You can align it to the floor in Setup after opening it.'
      : warning === 'Solvability in Little Ledges is unverified.' ? 'Solvability has not been checked in Little Ledges.' : warning)};
}

// Read the existing decoder's compressed JSON QR without its QR-writing dependency.
async function readPushmoJson(text) {
  const body = text.slice(PUSHMO_JSON_PREFIX.length);
  if (body.length > 4096 || body.length % 4 === 1 || !/^[A-Za-z0-9_-]+$/.test(body)) {
    throw new Error('This Pushmo QR contains damaged data. Try the original image.');
  }
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot open converted Pushmo QR codes. Use the original Pushmo QR image or export Little Ledges JSON from the decoder.');
  }
  const base64 = body.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - body.length % 4) % 4);
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_TEXT) {
        await reader.cancel();
        throw new Error('The expanded Pushmo QR is larger than 64 KB.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(result));
}

export async function readLevelText(value) {
  if (typeof value !== 'string' || value.length > MAX_TEXT) throw new Error('Choose a level JSON smaller than 64 KB.');
  const text = value.trim();
  if (text.startsWith('{')) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
    if (data?.schema_version === 1) return convertedPushmo(data);
    return {puzzle: parsePuzzle(text), source: 'Little Ledges', warnings: []};
  }
  if (text.startsWith(PUSHMO_JSON_PREFIX)) return convertedPushmo(await readPushmoJson(text));
  let url;
  try { url = new URL(text); } catch { throw new Error('Choose a level JSON or QR image, or paste a Little Ledges sharing link.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use a Little Ledges sharing link beginning with https:// or http://.');
  const tokens = [...new URLSearchParams(url.hash.slice(1)).getAll('puzzle'), ...url.searchParams.getAll('puzzle')];
  if (tokens.length !== 1 || !tokens[0]) throw new Error('This link does not contain a Little Ledges puzzle. Use the sharing link from a puzzle QR.');
  // Sharing links contain the whole puzzle. Never navigate to or fetch their URL.
  return {puzzle: decodePuzzle(tokens[0]), source: 'Little Ledges', warnings: []};
}

export async function readLevelBytes(input) {
  const bytes = Uint8Array.from(input);
  if (bytes[0] === 0x8d && bytes[1] === 6 && bytes[2] === 0 && bytes[3] === 0) {
    return convertedPushmo(await parsePayload(bytes));
  }
  let text;
  try { text = new TextDecoder('utf-8', {fatal: true}).decode(bytes); }
  catch { throw new Error('This QR is not a supported Little Ledges or Pushmo level.'); }
  return readLevelText(text);
}
