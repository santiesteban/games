// Run locally after reviewing an exported approved submission.
import fs from 'node:fs';
import {validatePuzzle} from '../shared/puzzle.js';
const input=process.argv[2];if(!input)throw new Error('Pass the path to an approved gallery export.');
const entry=JSON.parse(fs.readFileSync(input,'utf8'));
if(typeof entry.creatorName!=='string'||!entry.creatorName.trim())throw new Error('An export must contain a creator name.');
const puzzle=validatePuzzle(entry.puzzle),path=new URL('../creator/public/community-gallery.json',import.meta.url),items=JSON.parse(fs.readFileSync(path,'utf8'));
if(items.some(x=>x.puzzle.id===puzzle.id))throw new Error('A puzzle with this ID is already in the gallery; review updates manually.');
items.push({creatorName:entry.creatorName.trim(),description:typeof entry.description==='string'?entry.description:'',puzzle});fs.writeFileSync(path,JSON.stringify(items,null,2)+'\n');console.log(`Added ${puzzle.name} by ${entry.creatorName}.`);
