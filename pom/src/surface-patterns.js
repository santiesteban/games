// Clip a line against a convex walking cell, then retain only the portions outside
// all cells. This keeps diagonal hatching out of transparent walkable floor fills.
export function outsidePolygonSegments(a,b,polygons){
  let spans=[[0,1]];const dx=b.x-a.x,dy=b.y-a.y;
  for(const polygon of polygons){
    const area=polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p.x*q.y-p.y*q.x},0),sign=Math.sign(area);
    if(!sign)continue;
    let lo=0,hi=1;
    for(let i=0;i<polygon.length;i++){
      const p=polygon[i],q=polygon[(i+1)%polygon.length],ex=q.x-p.x,ey=q.y-p.y;
      const base=sign*(ex*(a.y-p.y)-ey*(a.x-p.x)),slope=sign*(ex*dy-ey*dx);
      if(Math.abs(slope)<1e-10){if(base<0){lo=1;hi=0;break}}
      else if(slope>0)lo=Math.max(lo,-base/slope);else hi=Math.min(hi,-base/slope);
      if(lo>=hi)break;
    }
    if(lo>=hi)continue;
    spans=spans.flatMap(([x,y])=>hi<=x||lo>=y?[[x,y]]:[[x,Math.min(y,lo)],[Math.max(x,hi),y]].filter(([u,v])=>v-u>1e-8));
    if(!spans.length)break;
  }
  const point=t=>({x:a.x+dx*t,y:a.y+dy*t});return spans.map(([lo,hi])=>[point(lo),point(hi)]);
}
