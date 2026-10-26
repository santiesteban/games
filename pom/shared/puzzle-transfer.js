import {decodePuzzle,parsePuzzle} from './puzzle.js';

// Links carry puzzle data, never executable code or remote asset addresses.
export function puzzleFromLink(value,allowedGameUrls){
  if(typeof value!=='string'||value.length>12000)throw new Error('The puzzle link is invalid or too large.');
  const url=new URL(value);
  if(!allowedGameUrls.some(base=>{
    const allowed=new URL(base);
    // Cards exported before the root-path move keep their exact former route.
    const legacy=allowed.pathname.endsWith('/pom/')?new URL('v4/',allowed).pathname:null;
    return url.origin===allowed.origin&&(url.pathname===allowed.pathname||url.pathname===legacy);
  }))throw new Error('This is not a Little Ledges import link.');
  const token=new URLSearchParams(url.hash.slice(1)).get('puzzle')??url.searchParams.get('puzzle');
  if(!token)throw new Error('This link does not contain a puzzle.');
  return decodePuzzle(token);
}
export function puzzleFromTransfer(transfer,allowedGameUrls){
  if(transfer?.kind==='json')return parsePuzzle(transfer.text);
  if(transfer?.kind==='url')return puzzleFromLink(transfer.url,allowedGameUrls);
  throw new Error('Choose a puzzle JSON file or a Little Ledges puzzle link.');
}
