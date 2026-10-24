import { createMovementBoard } from './movement-routes.js';

export const LEVEL_FORMAT='little-ledges';
export const LEVEL_SCHEMA_VERSION=1;
export const DEFAULT_PALETTE={R:[255,113,56],O:[242,160,90],G:[121,166,110],B:[85,169,174],Y:[255,223,63]};
const legacyIssues=new Set([5,6,7,11,15,16,17,18,21,23,24,25,30,32,33,34,35,38,39,40,43]);
const defaultGroups=[
  {id:'basic-lessons',name:'Basic Lessons'},
  {id:'first-challenges',name:'First Challenges'},
  {id:'more-challenges',name:'More Challenges'},
  {id:'murals',name:'Murals'},
  {id:'others',name:'Others',rangeLabel:'Studio & more'},
];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const own=(value,key)=>Object.hasOwn(value,key);
function requireValue(condition,message){if(!condition)throw new Error(`Invalid Little Ledges level data: ${message}`)}
function identifier(value){return typeof value==='string'&&/^[a-z0-9][a-z0-9._:-]*$/i.test(value)}

// Preserve the old authored format for tools that still deliver numeric IDs and text rows.
export function migrateLegacyLevels(levels){
  return{format:LEVEL_FORMAT,schemaVersion:LEVEL_SCHEMA_VERSION,groups:defaultGroups.map(group=>({...group})),levels:levels.map(level=>{
    requireValue(object(level),'legacy levels must be objects');
    requireValue(integer(level.id,1,Number.MAX_SAFE_INTEGER),'legacy levels need positive numeric IDs');
    requireValue(Array.isArray(level.grid)&&level.grid.length>0&&typeof level.grid[0]==='string','legacy levels need text grid rows');
    const group=level.id<=18?'basic-lessons':level.id<=36?'first-challenges':level.id<=54?'more-challenges':'others';
    return{...level,id:`builtin-${String(level.id).padStart(3,'0')}`,legacyId:level.id,number:level.id,group,kind:level.id===55?'movement-studio':'puzzle',knownIssues:legacyIssues.has(level.id),coordinateOrigin:'top-left',emptyCell:'.',width:level.grid[0].length,height:level.grid.length,palette:structuredClone(DEFAULT_PALETTE),start:{...level.start,y:level.start.y??level.grid.length},objects:{switches:[],manholes:[]}};
  })};
}

export function loadLevelCatalog(document){
  const catalog=Array.isArray(document)?migrateLegacyLevels(document):document;
  requireValue(object(catalog)&&catalog.format===LEVEL_FORMAT,`expected format "${LEVEL_FORMAT}"`);
  requireValue(catalog.schemaVersion===LEVEL_SCHEMA_VERSION,`unsupported schemaVersion ${catalog.schemaVersion}`);
  requireValue(Array.isArray(catalog.groups)&&catalog.groups.length>0,'groups must be a nonempty array');
  const groupIds=new Set;
  const groups=catalog.groups.map(group=>{
    requireValue(object(group)&&identifier(group.id)&&typeof group.name==='string'&&group.name.trim(),'each group needs an ID and name');
    requireValue(!groupIds.has(group.id),`duplicate group ID ${group.id}`);groupIds.add(group.id);
    requireValue(group.rangeLabel===undefined||typeof group.rangeLabel==='string',`${group.id}: rangeLabel must be text`);
    return{...group};
  });
  requireValue(Array.isArray(catalog.levels)&&catalog.levels.length>0,'levels must be a nonempty array');
  const ids=new Set,numbers=new Set,legacyIds=new Set;
  const levels=catalog.levels.map((input,index)=>{
    requireValue(object(input),`level ${index+1} must be an object`);
    const label=input.id??`level ${index+1}`;
    const check=(condition,message)=>requireValue(condition,`${label}: ${message}`);
    check(identifier(input.id),'id must be a stable string identifier');check(!ids.has(input.id),'duplicate ID');ids.add(input.id);
    check(integer(input.number,1,Number.MAX_SAFE_INTEGER),'number must be a positive display number');check(!numbers.has(input.number),'duplicate display number');numbers.add(input.number);
    if(input.legacyId!==undefined){check(integer(input.legacyId,1,Number.MAX_SAFE_INTEGER)&&!legacyIds.has(input.legacyId),'legacyId must be a unique positive integer');legacyIds.add(input.legacyId)}
    check(groupIds.has(input.group),'unknown group');
    check(typeof input.name==='string'&&input.name.trim(),'name must be nonempty text');
    check(input.description===undefined||typeof input.description==='string','description must be text');
    check(input.coordinateOrigin==='top-left'&&input.emptyCell==='.','expected top-left coordinates and "." empty cells');
    check(integer(input.width,1,32)&&integer(input.height,1,32),'dimensions must be between 1 and 32');
    check(Array.isArray(input.grid)&&input.grid.length===input.height&&input.grid.every(row=>typeof row==='string'&&row.length===input.width),'grid rows must match width and height');
    check(object(input.palette),'palette must map slot symbols to RGB arrays');
    const entries=Object.entries(input.palette);
    check(entries.length>=1&&entries.length<=10,'palette must contain 1–10 slots');
    for(const [slot,rgb]of entries){
      check(/^[A-Za-z0-9]$/.test(slot),'palette slots must be single ASCII letters or digits');
      check(Array.isArray(rgb)&&rgb.length===3&&rgb.every(value=>integer(value,0,255)),`invalid RGB value for slot ${slot}`);
    }
    for(const row of input.grid)for(const slot of row)check(slot==='.'||own(input.palette,slot),`missing palette slot ${slot}`);
    const cell=value=>object(value)&&integer(value.x,0,input.width-1)&&integer(value.y,0,input.height-1);
    check(input.goal===null||cell(input.goal),'goal must be a cell or null');
    check(input.start===null||(object(input.start)&&integer(input.start.x,-1,input.width-1)&&integer(input.start.y,0,input.height)&&integer(input.start.z,0,3)),'start must be a walking position or null');
    check(input.difficulty===undefined||input.difficulty===null||integer(input.difficulty,0,255),'difficulty must be a byte or null');
    check(input.knownIssues===undefined||typeof input.knownIssues==='boolean','knownIssues must be a boolean');
    check(input.kind===undefined||['puzzle','movement-studio','design-playground'].includes(input.kind),'unknown level kind');
    check(input.source===undefined||object(input.source),'source must be an object');
    check(input.flags===undefined||object(input.flags),'flags must be an object');
    if(input.flags){
      check(input.flags.raw===undefined||integer(input.flags.raw,0,0xffffffff),'flags.raw must be an unsigned 32-bit integer');
      for(const flag of ['protected','large','uses_switches','uses_manholes'])check(input.flags[flag]===undefined||typeof input.flags[flag]==='boolean',`flags.${flag} must be a boolean`);
    }
    check(input.warnings===undefined||(Array.isArray(input.warnings)&&input.warnings.every(warning=>typeof warning==='string')),'warnings must be text entries');
    const objects=input.objects??{};
    check(object(objects),'objects must be an object');
    for(const type of ['switches','manholes']){
      const records=objects[type]??[];check(Array.isArray(records)&&records.length<=10,`${type} must contain at most ten records`);
      const slots=new Set;
      for(const record of records){
        check(cell(record),`${type} coordinates must lie inside the grid`);
        check(integer(record.slot,0,9)&&!slots.has(record.slot),`${type} need unique original slots`);slots.add(record.slot);
        for(const key of ['icon','attributes','color'])if(record[key]!==undefined)check(integer(record[key],0,key==='color'?15:255),`invalid ${type} ${key}`);
        check(record.inverted===undefined||typeof record.inverted==='boolean',`invalid ${type} orientation`);
      }
    }
    const board=createMovementBoard(input.grid);
    if(input.initialDepths!==undefined)check(Array.isArray(input.initialDepths)&&input.initialDepths.length===board.groups.length&&input.initialDepths.every(depth=>integer(depth,0,3)),'initialDepths must give each connected piece a depth from 0 to 3');
    if(input.previewMove!==undefined)check(object(input.previewMove)&&integer(input.previewMove.x,-1,input.width-1)&&integer(input.previewMove.y,0,input.height)&&integer(input.previewMove.z,0,3),'invalid previewMove');
    const level={...input,kind:input.kind??'puzzle',knownIssues:input.knownIssues??false,description:input.description??'',grid:[...input.grid],palette:Object.fromEntries(entries.map(([slot,rgb])=>[slot,[...rgb]])),objects:{...objects,switches:structuredClone(objects.switches??[]),manholes:structuredClone(objects.manholes??[])}};
    level.compatibility=levelCompatibility(level);
    return level;
  });
  // Group order is independent of a puzzle's display number and permanent ID.
  const order=new Map(groups.map((group,index)=>[group.id,index]));
  levels.sort((a,b)=>order.get(a.group)-order.get(b.group)||a.number-b.number);
  return{...catalog,groups,levels};
}

export function levelCompatibility(level){
  const reasons=[];
  if(!level.goal)reasons.push('A goal is required.');
  else if(level.grid[level.goal.y][level.goal.x]==='.')reasons.push('The goal must be on a puzzle piece.');
  if(!level.start)reasons.push('A starting position is required.');
  else if(!createMovementBoard(level.grid,level.initialDepths).validNode(level.start))reasons.push('The starting position must be on exposed ground or a platform.');
  const flags=level.flags??{},raw=flags.raw??0;
  if(level.source?.document?.checksum?.valid===false)reasons.push('The original decoder document has an invalid checksum.');
  if(level.objects?.switches?.length||flags.uses_switches||(raw&0x200))reasons.push('Pullout switches are not supported yet.');
  if(level.objects?.manholes?.length||flags.uses_manholes||(raw&0x100))reasons.push('Manholes are not supported yet.');
  for(const type of Object.keys(level.objects??{}))if(!['switches','manholes'].includes(type))reasons.push(`Unsupported object type: ${type}.`);
  return{playable:reasons.length===0,reasons};
}
