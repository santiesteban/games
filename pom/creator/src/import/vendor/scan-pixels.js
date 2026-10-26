// Adapted for Little Ledges from pushmo-qr-decoder (MIT). See NOTICE.md.
// No text conversion: QR byte segments must survive NULs and high-bit values.
export function scanPixels(rgba,width,height,reader) {
  const first = reader(rgba,width,height,{inversionAttempts:'attemptBoth'});
  if (first) return Uint8Array.from(first.binaryData);
  if (Math.max(width,height)<=1100) {
    const enlarged=new Uint8ClampedArray(width*height*16);
    const w=width*2;
    for(let y=0;y<height*2;y++) for(let x=0;x<w;x++) {
      const src=((y>>1)*width+(x>>1))*4, dst=(y*w+x)*4;
      enlarged.set(rgba.subarray(src,src+4),dst);
    }
    const result=reader(enlarged,w,height*2,{inversionAttempts:'attemptBoth'});
    if(result) return Uint8Array.from(result.binaryData);
  }
  const gray=new Uint8ClampedArray(rgba.length);
  for(let i=0;i<rgba.length;i+=4) {
    const l=Math.round(rgba[i]*.299+rgba[i+1]*.587+rgba[i+2]*.114);
    gray[i]=gray[i+1]=gray[i+2]=l;gray[i+3]=255;
  }
  const result=reader(gray,width,height,{inversionAttempts:'attemptBoth'});
  if(result) return Uint8Array.from(result.binaryData);
  throw new Error('No readable QR code found. Try the original card image, a closer crop, or a sharper photo.');
}
