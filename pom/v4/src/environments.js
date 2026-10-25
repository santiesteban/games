import { TextureInfo } from 'littlejsengine';
import meadowBackground from '../../sky-background.webp';
import meadowForeground from '../../meadow-foreground.webp';
import highwayBackground from './assets/environments/highway-desert/background.webp';
import highwayForeground from './assets/environments/highway-desert/foreground.webp';
import alleyBackground from './assets/environments/cobblestone-alley/background.webp';
import alleyForeground from './assets/environments/cobblestone-alley/foreground.webp';
import alleyPortraitBackground from './assets/environments/cobblestone-alley/cobblestone-alley-portrait-background.webp';
import alleyPortraitForeground from './assets/environments/cobblestone-alley/cobblestone-alley-portrait-foreground.webp';
import alleyLandscapeBackground from './assets/environments/cobblestone-alley/cobblestone-alley-landscape-background.webp';
import alleyLandscapeForeground from './assets/environments/cobblestone-alley/cobblestone-alley-landscape-foreground.webp';
import { createEnvironmentTextureLoader } from './environment-loader.js';
export { environmentFrame, environmentComposition, environmentCacheKey, selectEnvironmentComposition } from './environment-layout.js';

export const DEFAULT_ENVIRONMENT='meadow';
export const ENVIRONMENTS=[
  {id:'meadow',name:'Meadow',background:meadowBackground,foreground:meadowForeground,width:2172,height:724,aspectRatio:3,groundAnchorY:.60,registeredLayers:false,foregroundOpacity:.8,groundWashOpacity:.30,floorWashOpacity:.16,floorTileOpacity:.30},
  {id:'highway-desert',name:'Highway Desert',background:highwayBackground,foreground:highwayForeground,width:3072,height:1024,aspectRatio:3,groundAnchorY:.80,registeredLayers:true,foregroundOpacity:1,groundWashOpacity:0,floorWashOpacity:0,floorTileOpacity:0},
  {id:'cobblestone-alley',name:'Cobblestone Alley',background:alleyBackground,foreground:alleyForeground,width:3072,height:1024,backgroundSize:[3072,1023],aspectRatio:3,groundAnchorY:.82,registeredLayers:true,foregroundOpacity:1,groundWashOpacity:0,floorWashOpacity:0,floorTileOpacity:0,variants:{
    portrait:{background:alleyPortraitBackground,foreground:alleyPortraitForeground,width:1024,height:1536,groundAnchorY:.66731771},
    landscape:{background:alleyLandscapeBackground,foreground:alleyLandscapeForeground,width:2048,height:1024,groundAnchorY:.78808594},
  }},
];
export function environmentById(id){return ENVIRONMENTS.find(environment=>environment.id===id)??ENVIRONMENTS[0]}

export function createEnvironmentLoader(defaultTextures){
  return createEnvironmentTextureLoader(DEFAULT_ENVIRONMENT,defaultTextures,{createTexture:image=>new TextureInfo(image,true,false,false)});
}
