import {decodePuzzle} from '../shared/puzzle.js';
import {deploymentUrls} from '../shared/deployment.js';
import './my-puzzles.css';

document.documentElement.classList.add('maker-playtest');
try{
  decodePuzzle(new URLSearchParams(location.hash.slice(1)).get('playtest'));
}catch(error){
  const panel=document.createElement('main');panel.className='playtest-loading';panel.style.flexDirection='column';
  const text=document.createElement('p');text.textContent=`This playtest could not be opened. ${error.message}`;
  const back=document.createElement('a');back.className='btn';back.href=deploymentUrls().creator;back.textContent='Back to Puzzle Creator';panel.append(text,back);document.body.replaceChildren(panel);
  throw error;
}
await import('./main.js');
