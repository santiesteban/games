// Pick a reachable screen-space square. Distance is measured to its visible
// polygon, not its center, so the same margin works across zoom levels.
export function nearestMovementTarget(point,candidates,{margin=12,visible=()=>true}={}){
  const ranked=[];
  for(const candidate of candidates){
    const polygon=candidate.polygon;
    if(!Array.isArray(polygon)||polygon.length<3||polygon.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))continue;
    let inside=false,best=Infinity,closest=null;
    const center=polygon.reduce((sum,p)=>({x:sum.x+p.x/polygon.length,y:sum.y+p.y/polygon.length}),{x:0,y:0});
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[j],b=polygon[i],dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
      if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
      const t=length?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/length)):0;
      const q={x:a.x+t*dx,y:a.y+t*dy},distance=Math.hypot(q.x-point.x,q.y-point.y);
      if(distance<best){best=distance;closest=q}
    }
    const distance=inside?0:best;if(distance>margin)continue;
    // Sample just inside the square to avoid a ray falling on a shared edge.
    const q=inside?point:closest,dx=center.x-q.x,dy=center.y-q.y,length=Math.hypot(dx,dy),offset=Math.min(1,length*.5);
    const sample=length?{x:q.x+dx/length*offset,y:q.y+dy/length*offset}:q;
    ranked.push({candidate,distance,centerDistance:Math.hypot(center.x-point.x,center.y-point.y),sample});
  }
  ranked.sort((a,b)=>a.distance-b.distance||a.centerDistance-b.centerDistance);
  return ranked.find(item=>visible(item.candidate,item.sample))?.candidate.node??null;
}
