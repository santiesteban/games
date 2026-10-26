// Adapted for Little Ledges from pushmo-qr-decoder (MIT). See NOTICE.md.
import {PALETTE} from './pushmo-palette.js';
export class LittleLedgesError extends Error {}
const requireValue=(ok,message)=>{if(!ok)throw new LittleLedgesError(message);};

export function exportLittleLedges(source) {
  requireValue(source?.schema_version===1 && source.width===32 && source.height===32 &&
    source.coordinate_origin==='top-left' && source.transparent_slot===10,'Unsupported decoded level schema.');
  requireValue(source.checksum?.valid===true,'Little Ledges export requires a valid source checksum.');
  requireValue(Array.isArray(source.switches) && Array.isArray(source.manholes),'Missing source object records.');
  const flags=source.flags;
  requireValue(flags && Number.isInteger(flags.raw) && flags.raw>=0 && flags.raw<=0xffffffff,'Invalid source flags.');
  const reasons=[];
  if(source.switches.length || flags.uses_switches===true || (flags.raw&0x200))reasons.push('Switches are not supported by Little Ledges.');
  if(source.manholes.length || flags.uses_manholes===true || (flags.raw&0x100))reasons.push('Manholes are not supported by Little Ledges.');
  requireValue(!reasons.length,reasons.join(' '));
  requireValue(Array.isArray(source.grid) && source.grid.length===32 && source.grid.every(row=>
    Array.isArray(row) && row.length===32 && row.every(n=>Number.isInteger(n)&&n>=0&&n<=10)),'Invalid source grid.');
  const used=[...new Set(source.grid.flat().filter(n=>n!==10))].sort((a,b)=>a-b);
  requireValue(used.length>0,'The level has no occupied cells.');
  requireValue(Array.isArray(source.palette_indices) && source.palette_indices.length===10,'Invalid source palette.');
  const palette={},rgbSlots=new Map();
  for(const slot of used){
    const index=source.palette_indices[slot];
    requireValue(Number.isInteger(index)&&index>=0&&index<PALETTE.length,'Invalid RGB palette index.');
    const rgb=PALETTE[index],key=rgb.join(',');
    requireValue(!rgbSlots.has(key),`Used slots ${rgbSlots.get(key)} and ${slot} have the same RGB color; Little Ledges rejects duplicate colors.`);
    rgbSlots.set(key,slot);palette[String(slot)]=[...rgb];
  }
  requireValue(Array.isArray(source.goal)&&source.goal.length===1&&source.goal[0]&&typeof source.goal[0]==='object','Little Ledges requires exactly one goal.');
  const {x,y}=source.goal[0];
  requireValue(Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<32&&y>=0&&y<32&&source.grid[y][x]!==10,'The goal must be on an occupied cell.');
  requireValue(typeof source.payload_sha256==='string'&&/^[a-f0-9]{64}$/i.test(source.payload_sha256),'Invalid source payload hash.');
  const name=(typeof source.name==='string'?source.name.trim():'') || 'Untitled Pushmo';
  requireValue(new TextEncoder().encode(name).length<=128,'The title exceeds Little Ledges’ 128-byte limit.');
  const grid=source.grid.map(row=>row.map(n=>n===10?'.':String(n)).join(''));
  // Enumerate same-slot four-neighbor components in row-major discovery order.
  const seen=new Set();let count=0,maxY=-1;
  for(let yy=0;yy<32;yy++)for(let xx=0;xx<32;xx++){
    if(grid[yy][xx]==='.')continue;
    maxY=Math.max(maxY,yy);
    const key=yy*32+xx;if(seen.has(key))continue;
    count++;seen.add(key);const stack=[[xx,yy]],color=grid[yy][xx];
    while(stack.length){const [cx,cy]=stack.pop();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cx+dx,ny=cy+dy,k=ny*32+nx;
      if(nx>=0&&nx<32&&ny>=0&&ny<32&&grid[ny][nx]===color&&!seen.has(k)){seen.add(k);stack.push([nx,ny]);}
    }}
  }
  const floorX=grid[31].search(/[^.]/);
  const puzzle={format:'little-ledges-puzzle',schemaVersion:1,rulesVersion:1,
    id:'pushmo-'+source.payload_sha256.slice(0,56).toLowerCase(),name,grid,palette,
    start:{x:floorX<0?0:floorX,y:32,z:0},goal:{x,y},initialDepths:Array(count).fill(0)};
  const warnings=['Solvability in Little Ledges is unverified.'];
  if(maxY<31)warnings.push(`Artwork ends at row ${maxY}; it does not touch the floor. Coordinates and goal are unchanged.`);
  return {puzzle,warnings};
}
