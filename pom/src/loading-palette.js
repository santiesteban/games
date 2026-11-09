const FALLBACK=[[255,152,42]];

export function loadingPalette(level){
  const colors=[],seen=new Set();
  for(const row of level?.grid??[]){
    for(const slot of row){
      const rgb=level?.palette?.[slot];
      if(!Array.isArray(rgb)||rgb.length!==3||!rgb.every(value=>Number.isInteger(value)&&value>=0&&value<=255))continue;
      const key=rgb.join(',');if(!seen.has(key)){seen.add(key);colors.push([...rgb])}
    }
  }
  return colors.length?colors:FALLBACK.map(color=>[...color]);
}

export function setLoadingPalette(panel,level){
  if(!panel)return;
  const colors=loadingPalette(level),background=colors[0].map(value=>Math.round(value*.15+255*.85));
  panel.closest('.stage')?.style.setProperty('--level-loading-background',`rgb(${background.join(' ')})`);
  panel.style.setProperty('--level-loading-color',`rgb(${colors[0].join(' ')})`);
  panel.dataset.loadingColors=JSON.stringify(colors);
}
