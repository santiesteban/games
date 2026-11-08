import {solvePuzzle} from './solver.js';

self.onmessage=({data})=>{
  const result=solvePuzzle(data,{onProgress:progress=>self.postMessage(progress)});
  self.postMessage(result);
};
