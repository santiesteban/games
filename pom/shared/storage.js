// The game keeps its existing database so installed development builds and
// current web saves retain IDs and completion. Creator drafts use their own DB.
const openings=new Map();
function database(name='little-ledges-puzzles',stores=['puzzles','drafts']){
  if(!openings.has(name))openings.set(name,new Promise((resolve,reject)=>{
    const req=indexedDB.open(name,1);
    req.onupgradeneeded=()=>{for(const store of stores)req.result.createObjectStore(store,{keyPath:'id'})};
    req.onsuccess=()=>{req.result.onversionchange=()=>{req.result.close();openings.delete(name)};resolve(req.result)};
    req.onerror=()=>reject(new Error('Local storage is unavailable. Export JSON to keep your puzzle.'));
    req.onblocked=()=>reject(new Error('Close older Little Ledges tabs and try again.'));
  }).catch(error=>{openings.delete(name);throw error}));
  return openings.get(name);
}
function transact(db,store,method,value){return new Promise((resolve,reject)=>{const tx=db.transaction(store,method==='get'||method==='getAll'?'readonly':'readwrite'),req=tx.objectStore(store)[method](value);let result;req.onsuccess=()=>result=req.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Could not save on this device.'))})}
export async function stored(store,method,value){if(store!=='puzzles')throw new Error('The game can only access its puzzle library.');return transact(await database(),store,method,value)}
let creatorReady;
async function creatorDatabase(){
  if(!creatorReady)creatorReady=(async()=>{
    const db=await database('little-ledges-creator',['drafts','metadata']);
    if(!await transact(db,'metadata','get','legacy-drafts-copied')){
      const legacy=await transact(await database(),'drafts','getAll');
      // Copy once, atomically. Original drafts remain untouched for rollback.
      await new Promise((resolve,reject)=>{const tx=db.transaction(['drafts','metadata'],'readwrite'),check=tx.objectStore('metadata').get('legacy-drafts-copied');check.onsuccess=()=>{if(check.result)return;for(const draft of legacy)tx.objectStore('drafts').put(draft);tx.objectStore('metadata').put({id:'legacy-drafts-copied'})};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
    }
    return db;
  })().catch(error=>{creatorReady=null;throw error});
  return creatorReady;
}
export async function creatorStored(store,method,value){if(store!=='drafts')throw new Error('The creator can only access its drafts.');return transact(await creatorDatabase(),store,method,value)}
export function storageChannel(onChange){let channel;try{channel=new BroadcastChannel('little-ledges-puzzles');channel.onmessage=onChange}catch{}return {notify:()=>channel?.postMessage('changed'),close:()=>channel?.close()}}
