// Backdrop spacing follows the puzzle's horizontal span. Calibrated against
// user reviews: widths 4, 11, 12 and 16 -> distances 8, 18, 18 and 24.
export function puzzleBackgroundDistance(width){return Math.max(8,Math.ceil(width*1.5/2)*2)}

// Creator documents use a fixed 32-column canvas. Transparent padding should
// not send a small drawing's background as far away as a full-width mural.
export function puzzleArtworkWidth(level){
  let left=Infinity,right=-Infinity;
  for(const row of level.grid)for(let x=0;x<row.length;x++)if(row[x]!==level.emptyCell&&row[x]!=='.'){left=Math.min(left,x);right=Math.max(right,x)}
  return right>=left?right-left+1:level.width;
}
