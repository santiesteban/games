// Hue rotation keeps each pigment's own color family. Low-chroma pigments need
// explicit saturation/lightness changes: hue rotation alone cannot tint white
// or lift black into a readable selection color.
export function selectionColor(color,phase,strength){
  const {r,g,b}=color,max=Math.max(r,g,b),min=Math.min(r,g,b),chroma=max-min,l=(max+min)/2;
  if(!strength)return {r,g,b};
  const amount=strength*(.25+.75*phase),neutral=chroma<.06;
  let h=chroma===0?0:max===r?((g-b)/chroma)%6:max===g?(b-r)/chroma+2:(r-g)/chroma+4;
  h=((h*60+360)%360+20*amount)%360;
  let saturation=chroma?chroma/(1-Math.abs(2*l-1)):0,lightness=l;
  if(neutral){
    h=220+16*amount;saturation=strength*(.15+.25*phase);
    const target=Math.max(.30,Math.min(.82,l));
    lightness=l+(target-l)*strength*(.55+.45*phase);
  }else{
    saturation=Math.min(.92,saturation+.12*amount);
    lightness=l+(Math.min(.78,l+.08)-l)*strength*(.35+.65*phase);
  }
  const c=(1-Math.abs(2*lightness-1))*saturation,x=c*(1-Math.abs((h/60)%2-1)),m=lightness-c/2;
  const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return {r:rgb[0]+m,g:rgb[1]+m,b:rgb[2]+m};
}
