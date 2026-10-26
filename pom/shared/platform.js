// Installed shells may expose only this versioned, narrow bridge. No Node API
// or arbitrary file paths are exposed to the renderer or public creator.
function bridge(){const api=globalThis.littleLedgesPlatform;return api?.version===1?api:null}
export async function openExternal(value){
  const url=new URL(value);if(!['https:','http:'].includes(url.protocol))throw new Error('Only website links can be opened.');
  if(bridge()?.openExternal)return bridge().openExternal(url.href);
  const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.click();
}
export async function saveFile(blob,name){
  if(bridge()?.saveFile)return bridge().saveFile({name,type:blob.type,bytes:new Uint8Array(await blob.arrayBuffer())});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function canPickPuzzleFile(){return typeof bridge()?.pickPuzzleFile==='function'}
export async function pickPuzzleFile(){return bridge().pickPuzzleFile()}
export function subscribePuzzleImports(onImport,onError){
  const api=bridge();if(!api)return()=>{};
  const receive=value=>Promise.resolve().then(()=>onImport(value)).catch(onError);
  const unsubscribe=api.onPuzzleImport?.(receive);
  if(api.getLaunchImport)Promise.resolve().then(()=>api.getLaunchImport()).then(value=>{if(value)receive(value)}).catch(onError);
  return()=>unsubscribe?.();
}
