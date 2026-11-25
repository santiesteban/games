// The front-face boundary depends only on the piece's cells, not its depth.
// Coordinates use the level's top-left origin so they survive camera changes.
export function buildPieceFrontOutline(cells){
  const occupied=new Set(cells.map(({x,y})=>`${x},${y}`));
  const has=(x,y)=>occupied.has(`${x},${y}`),edges=[];
  for(const {x,y} of cells){
    if(!has(x,y+1))edges.push([x,y+1,x+1,y+1]);
    if(!has(x+1,y))edges.push([x+1,y+1,x+1,y]);
    if(!has(x,y-1))edges.push([x+1,y,x,y]);
    if(!has(x-1,y))edges.push([x,y,x,y+1]);
  }
  return edges;
}

// Join consecutive collinear boundary edges once, when the piece is created.
export function mergeStraightOutlineEdges(edges){
  const remaining=new Map(edges.map(edge=>[edge.join(','),edge]));
  const merged=[];
  while(remaining.size){
    const first=remaining.values().next().value;
    remaining.delete(first.join(','));
    let [x1,y1,x2,y2]=first;
    const dx=Math.sign(x2-x1),dy=Math.sign(y2-y1);
    let key=[x2,y2,x2+dx,y2+dy].join(',');
    while(remaining.has(key)){remaining.delete(key);x2+=dx;y2+=dy;key=[x2,y2,x2+dx,y2+dy].join(',')}
    key=[x1-dx,y1-dy,x1,y1].join(',');
    while(remaining.has(key)){remaining.delete(key);x1-=dx;y1-=dy;key=[x1-dx,y1-dy,x1,y1].join(',')}
    merged.push([x1,y1,x2,y2]);
  }
  return merged;
}
