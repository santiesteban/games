// The 16-cell view is the bottom-center portion of the saved 32-cell grid.
export function smallGridPlacement(state){
  let left=32,right=-1,top=32,bottom=-1;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(state.grid[y][x]!=='.'){
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(right<0)return {fits:true,inside:true,dx:0,dy:0};
  if(state.manualStart&&state.start){
    left=Math.min(left,state.start.x);right=Math.max(right,state.start.x);
    if(state.start.y<32){top=Math.min(top,state.start.y);bottom=Math.max(bottom,state.start.y)}
  }
  const fits=right-left+1<=16&&bottom-top+1<=16;
  const inside=left>=8&&right<24&&top>=16;
  return {fits,inside,dx:fits&&!inside?8+Math.floor((16-(right-left+1))/2)-left:0,dy:fits&&!inside?31-bottom:0};
}
