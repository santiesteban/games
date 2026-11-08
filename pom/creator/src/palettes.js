import {DEFAULT_PALETTE} from '../../shared/puzzle.js';

// The first five colors are shown in a new draft; extra colors support custom
// palettes with up to ten slots without joining previously distinct pieces.
export const palettes={
  classic:Object.values(DEFAULT_PALETTE),
  garden:[[120,165,111],[246,195,170],[246,217,133],[167,186,208],[217,146,146]],
  sunset:[[239,117,94],[250,179,94],[250,220,138],[165,126,173],[112,165,167]],
  ocean:[[77,139,163],[109,184,184],[176,217,200],[244,213,150],[220,146,119]],
  bold:[[225,48,45],[36,101,211],[255,213,55],[255,120,112],[127,184,244],[255,236,150],[153,27,31],[28,58,139],[213,153,26],[245,245,239]],
  twilight:[[100,55,158],[164,119,207],[255,215,76],[237,222,150],[223,199,242],[59,35,103],[127,83,177],[198,162,75],[255,239,190],[232,210,255]],
  cloud:[[255,255,255],[221,224,227],[174,180,187],[119,126,134],[61,67,74],[245,244,240],[200,203,205],[148,154,160],[91,98,105],[33,37,42]],
  adventure:[[226,47,45],[43,99,204],[255,214,63],[156,90,47],[250,229,199],[177,34,34],[33,70,150],[255,239,159],[96,55,32],[243,243,235]],
  velocity:[[30,92,213],[79,159,239],[246,202,56],[229,53,48],[245,245,241],[22,56,139],[145,205,251],[187,139,26],[146,29,37],[47,49,59]],
  woodland:[[63,140,76],[141,190,92],[230,194,78],[140,94,52],[243,226,174],[37,88,54],[88,147,128],[183,137,72],[104,145,202],[205,92,73]],
};

// Keep additional custom colors distinct when a five-color collection is chosen.
export function recolorPalette(palette,collection){
  const used=new Set(),result={};
  for(const [i,key] of Object.keys(palette).entries()){
    let rgb=i<collection.length?[...collection[i]]:[...palette[key]];
    while(used.has(rgb.join(',')))rgb=[(rgb[0]+37)%256,(rgb[1]+67)%256,(rgb[2]+97)%256];
    used.add(rgb.join(','));result[key]=rgb;
  }
  return result;
}
