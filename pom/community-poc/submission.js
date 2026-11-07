import {validatePuzzle} from '../shared/puzzle.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = new Set(['format','schemaVersion','rulesVersion','id','name','grid','palette','start','goal','initialDepths','revision']);
const text = (value,max,label) => {
  if (typeof value !== 'string' || value.trim().length === 0 || new TextEncoder().encode(value.trim()).length > max)
    throw new Error(`${label} is required and must be at most ${max} bytes.`);
  return value.trim();
};
export function validateSubmission(value) {
  if (!object(value) || !object(value.puzzle)) throw new Error('A puzzle is required.');
  if (Object.keys(value.puzzle).some(k => !keys.has(k))) throw new Error('Puzzle contains unsupported fields.');
  const creatorName=text(value.creatorName,80,'Creator name');
  const description=value.description === undefined || value.description === '' ? '' : text(value.description,500,'Description');
  if (value.permission !== true) throw new Error('Confirm that you have permission to share this puzzle.');
  return {creatorName,description,puzzle:validatePuzzle(value.puzzle)};
}
