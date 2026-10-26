// The floor surrounds the authored pieces, rather than the rectangular image's
// optional empty padding. Three pull rows plus one front row remain visible.
export function puzzleFloorBounds(grid,depth=4){
  let minX=Infinity,maxX=-Infinity;
  for(const row of grid)for(let x=0;x<row.length;x++)if(row[x]!=='.'){minX=Math.min(minX,x);maxX=Math.max(maxX,x)}
  if(!Number.isFinite(minX)){minX=0;maxX=Math.max(0,(grid[0]?.length??1)-1)}
  return{left:minX-1,right:maxX+2,back:0,front:depth};
}
