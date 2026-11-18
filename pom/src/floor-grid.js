// The floor surrounds the authored pieces, rather than the rectangular image's
// optional empty padding. Three pull rows plus one front row remain visible.
export function puzzleFloorBounds(grid,depth=4){
  let minX=Infinity,maxX=-Infinity;
  for(const row of grid)for(let x=0;x<row.length;x++)if(row[x]!=='.'){minX=Math.min(minX,x);maxX=Math.max(maxX,x)}
  if(!Number.isFinite(minX)){minX=0;maxX=Math.max(0,(grid[0]?.length??1)-1)}
  return{left:minX-1,right:maxX+2,back:0,front:depth};
}

// The two front corners are rounded in screen space, matching a CSS radius at
// every zoom and camera angle. Rear corners remain square against the wall.
export function floorOutlinePoints(corners,radius,steps=8){
  const [backLeft,backRight,frontRight,frontLeft]=corners;
  const tangent=(corner,toward,distance)=>{const dx=toward.x-corner.x,dy=toward.y-corner.y,length=Math.hypot(dx,dy)||1;return {x:corner.x+dx/length*distance,y:corner.y+dy/length*distance}};
  const round=(before,corner,after)=>{
    const r=Math.max(0,Math.min(radius,Math.hypot(before.x-corner.x,before.y-corner.y)/2,Math.hypot(after.x-corner.x,after.y-corner.y)/2));
    const a=tangent(corner,before,r),b=tangent(corner,after,r),points=[];
    for(let i=0;i<=steps;i++){const t=i/steps,s=1-t;points.push({x:s*s*a.x+2*s*t*corner.x+t*t*b.x,y:s*s*a.y+2*s*t*corner.y+t*t*b.y})}
    return points;
  };
  return [backLeft,backRight,...round(backRight,frontRight,frontLeft),...round(frontRight,frontLeft,backLeft),backLeft];
}

// Align horizontal and vertical lines to physical pixels so low-opacity lines
// do not spread across extra pixels when the view is zoomed out.
export function snapFloorLine(a,b,width,pixelRatio=1){
  const dpr=Math.max(1,pixelRatio),pixels=Math.max(1,Math.round(width*dpr));
  const snap=value=>(Math.round(value*dpr-(pixels%2)/2)+(pixels%2)/2)/dpr;
  if(Math.abs(a.y-b.y)<.01){const y=snap((a.y+b.y)/2);return [{...a,y},{...b,y}]}
  if(Math.abs(a.x-b.x)<.01){const x=snap((a.x+b.x)/2);return [{...a,x},{...b,x}]}
  return [a,b];
}
