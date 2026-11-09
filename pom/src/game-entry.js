import {deploymentUrls} from '../shared/deployment.js';

// Older creator links remain usable, but always enter the separate player.
if(new URLSearchParams(location.hash.slice(1)).has('playtest')){
  const url=new URL(deploymentUrls().playtest);url.hash=location.hash;location.replace(url.href);
}else if(['interaction-lab','camera-lab','background-studio','environment-studio'].some(key=>new URLSearchParams(location.search).has(key))){
  void import('./loading-star.js').then(({initLoadingStar})=>initLoadingStar()).catch(()=>{});
  await import('./main.js');
}else{
  const {startMenu}=await import('./menu-startup.js');startMenu();
}
