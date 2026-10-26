const SVG_NS='http://www.w3.org/2000/svg';
let nextClipId=0;

// Follow the occupied rows, so a short final row leaves no empty outlined cells.
function outlineGrid(items){
  const cards=[...items.children];if(!cards.length||!items.clientWidth||!items.clientHeight)return;
  const origin=items.getBoundingClientRect(),rows=[];
  for(const card of cards){
    const check=card.querySelector('.completion-mark');
    if(check){
      const preview=card.querySelector('.puzzle-thumbnail'),box=preview.getBoundingClientRect(),cardBox=card.getBoundingClientRect(),ratio=preview.viewBox.baseVal.width/preview.viewBox.baseVal.height;
      const imageWidth=Math.min(box.width,box.height*ratio),imageHeight=Math.min(box.height,box.width/ratio);
      check.style.left=`${box.left-cardBox.left+(box.width+imageWidth)/2-check.offsetWidth/2}px`;
      check.style.top=`${box.top-cardBox.top+(box.height-imageHeight)/2-check.offsetHeight/2}px`;
    }
    const rect=card.getBoundingClientRect(),cell={left:Math.round(rect.left-origin.left),top:Math.round(rect.top-origin.top),right:Math.round(rect.right-origin.left)};
    if(rows.at(-1)?.[0].top!==cell.top)rows.push([]);rows.at(-1).push(cell);
  }
  const width=Math.round(origin.width),height=Math.round(origin.height),last=rows.at(-1),short=rows.length>1&&last.length<rows[0].length;
  const left=1,top=1,right=(rows.length===1?last.at(-1).right:width)-1,bottom=height-1,radius=Math.min(18,(right-left)/4,(bottom-top)/4);
  let contour=`M${left+radius} ${top}H${right-radius}Q${right} ${top} ${right} ${top+radius}`;
  if(short){
    const stepY=last[0].top,stepX=last.at(-1).right,r=Math.min(radius,(right-stepX)/2,(bottom-stepY)/2);
    contour+=`V${stepY-r}Q${right} ${stepY} ${right-r} ${stepY}H${stepX}V${bottom-radius}Q${stepX} ${bottom} ${stepX-radius} ${bottom}`;
  }else contour+=`V${bottom-radius}Q${right} ${bottom} ${right-radius} ${bottom}`;
  contour+=`H${left+radius}Q${left} ${bottom} ${left} ${bottom-radius}V${top+radius}Q${left} ${top} ${left+radius} ${top}Z`;
  items.style.clipPath=`path('${contour}')`;
  const svg=items.parentElement.querySelector('.level-grid-outline');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const clipId=items.dataset.gridClip||(items.dataset.gridClip=`level-grid-clip-${++nextClipId}`);
  const defs=document.createElementNS(SVG_NS,'defs'),clip=document.createElementNS(SVG_NS,'clipPath'),shape=document.createElementNS(SVG_NS,'path');clip.id=clipId;shape.setAttribute('d',contour);clip.append(shape);defs.append(clip);
  let lines='';
  for(const cell of rows[0].slice(0,-1)){
    const end=short&&cell.right>=last.at(-1).right?last[0].top:bottom;
    lines+=`M${cell.right} ${top}V${end}`;
  }
  for(const row of rows.slice(1))lines+=`M${left} ${row[0].top}H${right}`;
  const separators=document.createElementNS(SVG_NS,'path');separators.setAttribute('d',lines);separators.setAttribute('clip-path',`url(#${clipId})`);
  const boundary=document.createElementNS(SVG_NS,'path');boundary.setAttribute('d',contour);svg.replaceChildren(defs,separators,boundary);
}

export function createLevelGridObserver(){return new ResizeObserver(entries=>{for(const entry of entries)outlineGrid(entry.target)})}
