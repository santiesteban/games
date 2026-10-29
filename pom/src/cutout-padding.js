// Chamfer distance dilation keeps border generation linear in the mask size.
export function paddedCutout(mask,radius){
 const pad=Math.ceil(radius)+1,w=mask.width+2*pad,h=mask.height+2*pad,d=new Float32Array(w*h).fill(1e6);
 for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++)if(mask.rgba[(y*mask.width+x)*4+3]>=96)d[(y+pad)*w+x+pad]=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(x)d[i]=Math.min(d[i],d[i-1]+1);if(y)d[i]=Math.min(d[i],d[i-w]+1);if(x&&y)d[i]=Math.min(d[i],d[i-w-1]+Math.SQRT2);if(x+1<w&&y)d[i]=Math.min(d[i],d[i-w+1]+Math.SQRT2)}
 for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;if(x+1<w)d[i]=Math.min(d[i],d[i+1]+1);if(y+1<h)d[i]=Math.min(d[i],d[i+w]+1);if(x+1<w&&y+1<h)d[i]=Math.min(d[i],d[i+w+1]+Math.SQRT2);if(x&&y+1<h)d[i]=Math.min(d[i],d[i+w-1]+Math.SQRT2)}
 return {width:w,height:h,pad,distances:d,solid:(x,y)=>x>=0&&x<w&&y>=0&&y<h&&d[y*w+x]<=radius};
}
