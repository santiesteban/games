// Place one small fastener just inside every convex corner of a piece.
export function pieceNutPositions(cells,inset=.15){
  const occupied=new Set(cells.map(({x,y})=>`${x},${y}`)),has=(x,y)=>occupied.has(`${x},${y}`),nuts=[];
  for(const {x,y} of cells)for(const [dx,dy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
    if(!has(x+dx,y)&&!has(x,y+dy))nuts.push({x:x+(dx<0?inset:1-inset),y:y+(dy<0?inset:1-inset)});
  }
  return nuts;
}
