const SVG_NS='http://www.w3.org/2000/svg';
const colors={R:'#ff7138',O:'#f2a05a',G:'#79a66e',B:'#55a9ae',Y:'#ffe03f'};

export function puzzleThumbnail(level){
  const height=level.grid.length,width=level.grid[0].length;
  const svg=document.createElementNS(SVG_NS,'svg');
  svg.setAttribute('viewBox',`-.18 -.18 ${width+.36} ${height+.36}`);svg.setAttribute('class','puzzle-thumbnail');svg.setAttribute('role','img');svg.setAttribute('aria-label',`Puzzle preview: ${level.name}`);svg.setAttribute('focusable','false');
  // One fill per pigment and only the exposed edges, matching the actual map's pieces.
  for(const color of new Set(level.grid.join(''))){
    if(color==='.')continue;
    let tiles='',edges='';
    const same=(x,y)=>level.grid[y]?.[x]===color;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(same(x,y)){
      tiles+=`M${x} ${y}h1v1h-1Z`;
      if(!same(x,y-1))edges+=`M${x} ${y}h1`;
      if(!same(x+1,y))edges+=`M${x+1} ${y}v1`;
      if(!same(x,y+1))edges+=`M${x} ${y+1}h1`;
      if(!same(x-1,y))edges+=`M${x} ${y}v1`;
    }
    const fill=document.createElementNS(SVG_NS,'path');fill.setAttribute('d',tiles);fill.setAttribute('fill',colors[color]||'#fff0d8');fill.setAttribute('stroke',colors[color]||'#fff0d8');fill.setAttribute('stroke-width','.015');svg.append(fill);
    const outline=document.createElementNS(SVG_NS,'path');outline.setAttribute('d',edges);outline.setAttribute('fill','none');outline.setAttribute('stroke','#292537');outline.setAttribute('stroke-width','1');outline.setAttribute('stroke-linejoin','round');outline.setAttribute('vector-effect','non-scaling-stroke');svg.append(outline);
  }
  const {x,y}=level.goal,flag=document.createElementNS(SVG_NS,'path');flag.setAttribute('d',`M${x+.35} ${y+.83}V${y+.15}l.5 .18-.5 .17`);flag.setAttribute('fill','#f65d17');flag.setAttribute('stroke','#292537');flag.setAttribute('stroke-width','.06');flag.setAttribute('stroke-linejoin','round');svg.append(flag);
  return svg;
}
