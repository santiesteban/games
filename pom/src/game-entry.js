import {deploymentUrls} from '../shared/deployment.js';

// Older creator links remain usable, but always enter the separate player.
if(new URLSearchParams(location.hash.slice(1)).has('playtest')){
  const url=new URL(deploymentUrls().playtest);url.hash=location.hash;location.replace(url.href);
}else await import('./main.js');
