import daisyBackground from './assets/scenery-kits/daisy-meadow/flat-background.webp';
import daisyGround from './assets/scenery-kits/daisy-meadow/ground-tile.webp';
import { TextureInfo } from 'littlejsengine';
import meadowBackground from '../sky-background.webp';
import meadowForeground from '../meadow-foreground.webp';
import highwayBackground from './assets/environments/highway-desert/background.webp';
import highwayForeground from './assets/environments/highway-desert/foreground.webp';
import alleyBackground from './assets/environments/cobblestone-alley/background.webp';
import alleyForeground from './assets/environments/cobblestone-alley/foreground.webp';
import alleyPortraitBackground from './assets/environments/cobblestone-alley/cobblestone-alley-portrait-background.webp';
import alleyPortraitForeground from './assets/environments/cobblestone-alley/cobblestone-alley-portrait-foreground.webp';
import alleyLandscapeBackground from './assets/environments/cobblestone-alley/cobblestone-alley-landscape-background.webp';
import alleyLandscapeForeground from './assets/environments/cobblestone-alley/cobblestone-alley-landscape-foreground.webp';
import tropicalPortraitBackground from './assets/environments/tropical-shore/tropical-shore-portrait-background.webp';
import tropicalPortraitForeground from './assets/environments/tropical-shore/tropical-shore-portrait-foreground.webp';
import tropicalLandscapeBackground from './assets/environments/tropical-shore/tropical-shore-landscape-background.webp';
import tropicalLandscapeForeground from './assets/environments/tropical-shore/tropical-shore-landscape-foreground.webp';
import inkEarthPortraitBackground from './assets/environments/ink-earth/ink-earth-portrait-background.webp';
import inkEarthPortraitForeground from './assets/environments/ink-earth/ink-earth-portrait-foreground.webp';
import inkEarthLandscapeBackground from './assets/environments/ink-earth/ink-earth-landscape-background.webp';
import inkEarthLandscapeForeground from './assets/environments/ink-earth/ink-earth-landscape-foreground.webp';
import curvedColorsPortraitBackground from './assets/environments/curved-colors/curved-colors-portrait-background.webp';
import curvedColorsPortraitForeground from './assets/environments/curved-colors/curved-colors-portrait-foreground.webp';
import curvedColorsLandscapeBackground from './assets/environments/curved-colors/curved-colors-landscape-background.webp';
import curvedColorsLandscapeForeground from './assets/environments/curved-colors/curved-colors-landscape-foreground.webp';
import curvedColorsMetadata from './assets/environments/curved-colors/artwork-metadata.json';
import starryMoundsPortraitBackground from './assets/environments/starry-mounds/starry-mounds-portrait-background.webp';
import starryMoundsPortraitForeground from './assets/environments/starry-mounds/starry-mounds-portrait-foreground.webp';
import starryMoundsLandscapeBackground from './assets/environments/starry-mounds/starry-mounds-landscape-background.webp';
import starryMoundsLandscapeForeground from './assets/environments/starry-mounds/starry-mounds-landscape-foreground.webp';
import starryMoundsMetadata from './assets/environments/starry-mounds/artwork-metadata.json';
import softAlleyPortraitBackground from './assets/environments/cobblestone-alley-soft/cobblestone-alley-soft-portrait-background.webp';
import softAlleyPortraitForeground from './assets/environments/cobblestone-alley-soft/cobblestone-alley-soft-portrait-foreground.webp';
import softAlleyLandscapeBackground from './assets/environments/cobblestone-alley-soft/cobblestone-alley-soft-landscape-background.webp';
import softAlleyLandscapeForeground from './assets/environments/cobblestone-alley-soft/cobblestone-alley-soft-landscape-foreground.webp';
import softAlleyMetadata from './assets/environments/cobblestone-alley-soft/artwork-metadata.json';
import japanSpringPortraitBackground from './assets/environments/japan-spring/japan-spring-portrait-background.webp';
import japanSpringPortraitForeground from './assets/environments/japan-spring/japan-spring-portrait-foreground.webp';
import japanSpringLandscapeBackground from './assets/environments/japan-spring/japan-spring-landscape-background.webp';
import japanSpringLandscapeForeground from './assets/environments/japan-spring/japan-spring-landscape-foreground.webp';
import japanSpringMetadata from './assets/environments/japan-spring/artwork-metadata.json';
import { createEnvironmentTextureLoader } from './environment-loader.js';
export { environmentFrame, environmentComposition, environmentCacheKey, selectEnvironmentComposition } from './environment-layout.js';

// Keep each supplied pair registered to its exact authored canvas and measured
// anchor. Asset URLs are Vite imports; the image loader still decodes lazily.
function registeredArtwork(id,name,metadata,images){
  const variants=Object.fromEntries(Object.entries(images).map(([variant,layers])=>{
    const {width,height,groundAnchorY}=metadata.variants[variant];
    return [variant,{...layers,width,height,groundAnchorY}];
  }));
  const landscape=variants.landscape;
  return {id,name,...landscape,aspectRatio:landscape.width/landscape.height,fallbackName:'Landscape fallback',registeredLayers:true,foregroundOpacity:1,groundWashOpacity:0,floorWashOpacity:0,floorTileOpacity:0,variants};
}

export const DEFAULT_ENVIRONMENT='meadow';
export const ENVIRONMENTS=[
  {id:'daisy-meadow',name:'Daisy Meadow',background:daisyBackground,foreground:daisyGround,foregroundSize:[2048,2048],width:4096,height:2048,aspectRatio:2,groundAnchorY:.7,registeredLayers:false,foregroundOpacity:1,groundWashOpacity:0,floorWashOpacity:0,floorTileOpacity:0},
  {id:'meadow',name:'Meadow',background:meadowBackground,foreground:meadowForeground,width:2172,height:724,aspectRatio:3,groundAnchorY:.60,registeredLayers:false,foregroundOpacity:.8,groundWashOpacity:.30,floorWashOpacity:.16,floorTileOpacity:.30},
  {id:'highway-desert',name:'Highway Desert',background:highwayBackground,foreground:highwayForeground,width:3072,height:1024,aspectRatio:3,groundAnchorY:.80,registeredLayers:true,foregroundOpacity:1,groundWashOpacity:0,floorWashOpacity:0,floorTileOpacity:0},
  {id:'cobblestone-alley',name:'Cobblestone Alley',background:alleyBackground,foreground:alleyForeground,width:3072,height:1024,backgroundSize:[3072,1023],aspectRatio:3,groundAnchorY:.82,registeredLayers:true,foregroundOpacity:1,groundWashOpacity:0,floorWashOpacity:0,floorTileOpacity:0,variants:{
    portrait:{background:alleyPortraitBackground,foreground:alleyPortraitForeground,width:1024,height:1536,groundAnchorY:.66731771},
    landscape:{background:alleyLandscapeBackground,foreground:alleyLandscapeForeground,width:2048,height:1024,groundAnchorY:.78808594},
  }},
  {id:'tropical-shore',name:'Tropical Shore',background:tropicalLandscapeBackground,foreground:tropicalLandscapeForeground,width:2048,height:1024,groundAnchorY:0.70019531,aspectRatio:2,fallbackName:'Landscape fallback',registeredLayers:true,foregroundOpacity:1,groundWashOpacity:0,floorWashOpacity:0,floorTileOpacity:0,variants:{
    portrait:{background:tropicalPortraitBackground,foreground:tropicalPortraitForeground,width:1024,height:1536,groundAnchorY:0.69986979},
    landscape:{background:tropicalLandscapeBackground,foreground:tropicalLandscapeForeground,width:2048,height:1024,groundAnchorY:0.70019531},
  }},
  {id:'ink-earth',name:'Ink Earth',background:inkEarthLandscapeBackground,foreground:inkEarthLandscapeForeground,width:2048,height:1024,groundAnchorY:0.7,measuredArtBoundaryY:0.71289062,aspectRatio:2,fallbackName:'Landscape fallback',registeredLayers:true,foregroundOpacity:1,groundWashOpacity:0,floorWashOpacity:0,floorTileOpacity:0,variants:{
    portrait:{background:inkEarthPortraitBackground,foreground:inkEarthPortraitForeground,width:1024,height:1536,groundAnchorY:0.7,measuredArtBoundaryY:0.71484375},
    landscape:{background:inkEarthLandscapeBackground,foreground:inkEarthLandscapeForeground,width:2048,height:1024,groundAnchorY:0.7,measuredArtBoundaryY:0.71289062},
  }},
  registeredArtwork('curved-colors','Curved Colors',curvedColorsMetadata,{
    portrait:{background:curvedColorsPortraitBackground,foreground:curvedColorsPortraitForeground},
    landscape:{background:curvedColorsLandscapeBackground,foreground:curvedColorsLandscapeForeground},
  }),
  registeredArtwork('starry-mounds','Starry Mounds',starryMoundsMetadata,{
    portrait:{background:starryMoundsPortraitBackground,foreground:starryMoundsPortraitForeground},
    landscape:{background:starryMoundsLandscapeBackground,foreground:starryMoundsLandscapeForeground},
  }),
  registeredArtwork('cobblestone-alley-soft','Cobblestone Alley — Soft',softAlleyMetadata,{
    portrait:{background:softAlleyPortraitBackground,foreground:softAlleyPortraitForeground},
    landscape:{background:softAlleyLandscapeBackground,foreground:softAlleyLandscapeForeground},
  }),
  registeredArtwork('japan-spring','Japan Spring',japanSpringMetadata,{
    portrait:{background:japanSpringPortraitBackground,foreground:japanSpringPortraitForeground},
    landscape:{background:japanSpringLandscapeBackground,foreground:japanSpringLandscapeForeground},
  }),
];
export function environmentById(id){return ENVIRONMENTS.find(environment=>environment.id===id)??ENVIRONMENTS[0]}

export function createEnvironmentLoader(defaultTextures){
  return createEnvironmentTextureLoader(DEFAULT_ENVIRONMENT,defaultTextures,{createTexture:image=>new TextureInfo(image,true,false,false)});
}
