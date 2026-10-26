import {saveFile} from './platform.js';
import { loadLevelCatalog, DEFAULT_PALETTE } from './level-format.js';
import { createMovementBoard } from './movement-routes.js';

export const PUZZLE_FORMAT='little-ledges-puzzle', SCHEMA_VERSION=1, RULES_VERSION=1, SIZE=32;
export { DEFAULT_PALETTE };
const slots='0123456789';
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const assert=(ok,message)=>{if(!ok)throw new Error(message)};
export function checksum(bytes){let n=2166136261;for(const b of bytes)n=Math.imul(n^b,16777619);return (n>>>0).toString(16).padStart(8,'0')}
export function geometryRevision(p){return checksum(encoder.encode(JSON.stringify([RULES_VERSION,p.grid,p.palette,p.start,p.goal,p.initialDepths])))}
export function validatePuzzle(value){
  assert(value&&typeof value==='object'&&!Array.isArray(value),'Choose a Little Ledges puzzle JSON file.');
  assert(value.format===PUZZLE_FORMAT,'This is not a Little Ledges Puzzle Maker file.');
  assert(value.schemaVersion===SCHEMA_VERSION&&value.rulesVersion===RULES_VERSION,'This puzzle uses an unsupported format or rules version. Update Little Ledges, or export it for a compatible app version.');
  assert(typeof value.id==='string'&&/^[a-z0-9-]{1,64}$/i.test(value.id),'The puzzle ID is invalid.');
  assert(typeof value.name==='string'&&value.name.trim().length>0&&encoder.encode(value.name.trim()).length<=128,'Give the puzzle a title of up to 128 bytes.');
  assert(Array.isArray(value.grid)&&value.grid.length===32&&value.grid.every(r=>typeof r==='string'&&r.length===32),'The puzzle must have exactly 32 rows of 32 cells.');
  const input={id:`user:${value.id}`,number:1,group:'my-puzzles',name:value.name.trim(),coordinateOrigin:'top-left',emptyCell:'.',width:32,height:32,grid:value.grid,palette:value.palette,start:value.start,goal:value.goal,initialDepths:value.initialDepths};
  const level=loadLevelCatalog({format:'little-ledges',schemaVersion:1,groups:[{id:'my-puzzles',name:'My Puzzles'}],levels:[input]}).levels[0];
  assert(level.compatibility.playable,level.compatibility.reasons.join(' '));
  assert(new Set(Object.values(level.palette).map(rgb=>rgb.join(','))).size===Object.keys(level.palette).length,'Palette colors must be distinct. Merge matching colors in Puzzle Maker.');
  const count=createMovementBoard(level.grid).groups.length;
  const keys=Object.keys(level.palette),canonicalPalette=Object.fromEntries(keys.map((key,i)=>[slots[i],level.palette[key]])),canonicalGrid=level.grid.map(row=>[...row].map(c=>c==='.'?'.':slots[keys.indexOf(c)]).join(''));
  const p={format:PUZZLE_FORMAT,schemaVersion:SCHEMA_VERSION,rulesVersion:RULES_VERSION,id:value.id,name:level.name,grid:canonicalGrid,palette:canonicalPalette,start:{x:level.start.x,y:level.start.y,z:level.start.z},goal:{x:level.goal.x,y:level.goal.y},initialDepths:level.initialDepths??Array(count).fill(0)};
  p.revision=geometryRevision(p);
  if(value.revision!==undefined)assert(value.revision===p.revision,'The puzzle checksum does not match its contents. Re-export it from Puzzle Maker.');
  return p;
}
export function parsePuzzle(text){assert(typeof text==='string'&&text.length<=65536,'The puzzle file is too large (maximum 64 KB).');try{return validatePuzzle(JSON.parse(text))}catch(error){if(error instanceof SyntaxError)throw new Error('This file is not valid JSON.');throw error}}
export function puzzleLevel(input){const p=validatePuzzle(input);return {id:`user:${p.id}`,number:'★',group:'my-puzzles',kind:'puzzle',name:p.name,description:'A community puzzle',coordinateOrigin:'top-left',emptyCell:'.',width:32,height:32,grid:p.grid,palette:p.palette,goal:p.goal,start:p.start,initialDepths:p.initialDepths,objects:{switches:[],manholes:[]},compatibility:{playable:true,reasons:[]},userPuzzle:p}}
export function newPuzzleId(){return crypto.randomUUID()}
export function defaultStart(grid,depths){const board=createMovementBoard(grid,depths);for(let x=0;x<32;x++)if(grid[31][x]!=='.'){const nodes=board.nodesAt(x,32);if(nodes.length)return nodes[0]}return {x:0,y:32,z:0}}
export function encodePuzzle(input){
  const p=validatePuzzle(input),keys=Object.keys(p.palette),count=p.initialDepths.length;
  const meta=encoder.encode(JSON.stringify([p.id,p.name,keys.map(k=>p.palette[k]),p.start.x,p.start.y,p.start.z,p.goal.x,p.goal.y,count]));
  const bytes=new Uint8Array(3+meta.length+512+Math.ceil(count/4)+4);bytes[0]=1;bytes[1]=meta.length>>8;bytes[2]=meta.length&255;bytes.set(meta,3);
  const offset=3+meta.length;
  for(let i=0;i<1024;i++){const c=p.grid[i>>5][i%32],n=c==='.'?0:keys.indexOf(c)+1;bytes[offset+(i>>1)]|=n<<(i%2?0:4)}
  for(let i=0;i<count;i++)bytes[offset+512+(i>>2)]|=p.initialDepths[i]<<((3-i%4)*2);
  const sum=parseInt(checksum(bytes.subarray(0,-4)),16);new DataView(bytes.buffer).setUint32(bytes.length-4,sum);
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function decodePuzzle(token){
  assert(typeof token==='string'&&token.length<=2400&&/^[\w-]+$/.test(token),'The puzzle link is invalid or too large.');
  const bytes=Uint8Array.from(atob(token.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
  assert(bytes.length>=520&&bytes[0]===1,'Unsupported puzzle link version.');
  assert(parseInt(checksum(bytes.subarray(0,-4)),16)===new DataView(bytes.buffer).getUint32(bytes.length-4),'This puzzle link is damaged or incomplete.');
  const length=bytes[1]*256+bytes[2];assert(length<1024&&3+length+516<=bytes.length,'Invalid puzzle link header.');
  const [id,name,colors,sx,sy,sz,gx,gy,count]=JSON.parse(decoder.decode(bytes.subarray(3,3+length)));
  assert(Array.isArray(colors)&&colors.length>=1&&colors.length<=10&&Number.isInteger(count)&&count>=1&&count<=1024,'Invalid puzzle link data.');
  const offset=3+length;assert(bytes.length===offset+512+Math.ceil(count/4)+4,'Invalid puzzle link size.');
  const grid=Array.from({length:32},(_,y)=>Array.from({length:32},(_,x)=>{const i=y*32+x,n=(bytes[offset+(i>>1)]>>(i%2?0:4))&15;assert(n<=colors.length,'Invalid puzzle color.');return n?slots[n-1]:'.'}).join(''));
  const initialDepths=Array.from({length:count},(_,i)=>(bytes[offset+512+(i>>2)]>>((3-i%4)*2))&3);
  return validatePuzzle({format:PUZZLE_FORMAT,schemaVersion:1,rulesVersion:1,id,name,grid,palette:Object.fromEntries(colors.map((c,i)=>[slots[i],c])),start:{x:sx,y:sy,z:sz},goal:{x:gx,y:gy},initialDepths});
}
export function gameUrl(base,mode,input){const url=new URL(base);url.hash=`${mode}=${encodePuzzle(input)}`;return url.href}
export function downloadBlob(blob,name){return saveFile(blob,name)}
export function exportJson(puzzle){return downloadBlob(new Blob([JSON.stringify(validatePuzzle(puzzle),null,2)],{type:'application/json'}),`${fileName(puzzle.name)}.json`)}
export function fileName(name){return name.normalize('NFKD').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'little-ledges-puzzle'}
