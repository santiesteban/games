// Work in perceptual OKLab space: equal RGB/HSL changes look much stronger on
// yellow than blue. A bounded hue turn plus matched perceptual lightness makes
// the pulse readable across pigments without a large color-family change.
const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const gamma=v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;
export function selectionLab({r,g,b}){
  r=linear(r);g=linear(g);b=linear(b);
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
  const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
  const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return {L:.2104542553*l+.793617785*m-.0040720468*s,a:1.9779984951*l-2.428592205*m+.4505937099*s,b:.0259040371*l+.7827717662*m-.808675766*s};
}
function fromLab({L,a,b}){
  const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;
  return {r:gamma(4.0767416621*l-3.3077115913*m+.2309699292*s),g:gamma(-1.2684380046*l+2.6097574011*m-.3413193965*s),b:gamma(-.0041960863*l-.7034186147*m+1.707614701*s)};
}
function gamut(lab){
  let rgb=fromLab(lab);
  const fits=c=>Object.values(c).every(v=>v>=0&&v<=1);
  if(!fits(rgb)){let low=0,high=1;for(let i=0;i<12;i++){const scale=(low+high)/2,c=fromLab({L:lab.L,a:lab.a*scale,b:lab.b*scale});if(fits(c))low=scale;else high=scale}rgb=fromLab({L:lab.L,a:lab.a*low,b:lab.b*low})}
  return Object.fromEntries(Object.entries(rgb).map(([key,value])=>[key,Math.max(0,Math.min(1,value))]));
}
export function selectionColor(color,phase,strength){
  if(!strength)return {r:color.r,g:color.g,b:color.b};
  const base=selectionLab(color),chroma=Math.hypot(base.a,base.b),amount=strength*(.25+.75*phase);
  if(chroma<.035){
    const hue=235*Math.PI/180,c=.045*amount,target=Math.max(.30,Math.min(.84,base.L));
    return gamut({L:base.L+(target-base.L)*amount,a:base.a+Math.cos(hue)*c,b:base.b+Math.sin(hue)*c});
  }
  const turn=20*Math.PI/180*amount,ca=Math.cos(turn),sa=Math.sin(turn);
  let dL=(base.L>.88?-.10:.10)*amount,da=base.a*ca-base.b*sa-base.a,db=base.a*sa+base.b*ca-base.b;
  const scale=.095*amount/Math.hypot(dL,da,db);dL*=scale;da*=scale;db*=scale;
  return gamut({L:Math.max(0,Math.min(1,base.L+dL)),a:base.a+da,b:base.b+db});
}
