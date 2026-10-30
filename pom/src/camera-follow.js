const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Positions are measured along one camera axis, relative to the proposed focus.
// Perspective scale is the focus distance / point depth, so translating the
// camera by d projects each point to scale * (position - d).
export function boundedCameraAxis({points,min,max,subject,padding=0}){
  const valid=points.filter(p=>Number.isFinite(p.position)&&Number.isFinite(p.scale)&&p.scale>0);
  if(!valid.length||!(max>min))return 0;
  const low=Math.min(...valid.map(p=>p.position-min/p.scale));
  const high=Math.max(...valid.map(p=>p.position-max/p.scale));
  let shift;
  if(low<=high)shift=clamp(0,low,high);
  else{
    // The puzzle fits: center its projected footprint in the usable viewport.
    // Depth-dependent scaling makes this a monotonic, piecewise-linear solve.
    let a=high,b=low;
    for(let i=0;i<24;i++){
      const mid=(a+b)/2,projected=valid.map(p=>p.scale*(p.position-mid));
      if(Math.min(...projected)+Math.max(...projected)>min+max)a=mid;else b=mid;
    }
    shift=(a+b)/2;
  }
  // Pom can stand outside the puzzle. Keep him inside the usable area even
  // when that requires showing some ground beyond the puzzle's bounds.
  if(subject&&subject.scale>0){
    const inset=Math.min(padding,(max-min)*.25);
    shift=clamp(shift,subject.position-(max-inset)/subject.scale,subject.position-(min+inset)/subject.scale);
  }
  return shift;
}
