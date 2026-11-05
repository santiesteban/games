import { Shader } from 'littlejsengine';

// Radius in world units, shared by puzzle and scenery shadows.
export const SHADOW_BLUR_RADIUS=.12;

// LittleJS 1.27.2 supplies S, shadowMap, and shadowParams to 3D Shader snippets.
// Compare each filtered sample against the receiver plane at that sample, rather
// than comparing all samples with the center depth. The latter produces
// striped self-shadowing on sloping faces, particularly on mobile GPUs.
const receiverShadow=`
  float pomLight(){
    float glow=0.0;
    for(int i=0;i<lightCount;i++){
      if(lights[i].w<=0.0)continue;
      float falloff=max(0.0,1.0-distance(worldPos,lights[i].xyz)/lights[i].w);
      glow=max(glow,falloff*falloff*lightColors[i].a);
    }
    return clamp(glow,0.0,0.8);
  }
  float surfaceShadow(){
    highp vec3 q=S.xyz/max(S.w,0.000001)*0.5+0.5;
    highp vec3 dx=dFdx(q),dy=dFdy(q);
    if(shadowParams.x<=0.0||S.w<=0.0)return 1.0;
    if(any(greaterThanEqual(abs(q-0.5),vec3(0.5))))return 1.0;

    highp float determinant=dx.x*dy.y-dx.y*dy.x;
    highp vec2 slope=vec2(0.0);
    if(abs(determinant)>0.000000000001){
      slope=vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/determinant;
    }
    highp vec2 texel=1.0/vec2(textureSize(shadowMap,0));
    // Hardware linear filtering also compares the four surrounding texels.
    // Cover that footprint in light space so the correction stays stable at zoom.
    highp float bias=shadowParams.y/(S.w*S.w)+dot(abs(slope),texel);
    highp float result=0.0,weight=0.0;
    for(int i=0;i<32;i++){
      float r=sqrt((float(i)+.5)/32.),angle=float(i)*2.39996323,w=exp(-2.*r*r);
      highp vec2 offset=vec2(cos(angle),sin(angle))*r*shadowParams.z;
      highp float depth=q.z+dot(slope,offset)-bias;
      result+=texture(shadowMap,vec3(q.xy+offset,depth))*w;weight+=w;
    }
    return result/weight;
  }
`;

// Preserve the illustrated colors outside cast shadows.
export const pieceShadowShader=new Shader(`${receiverShadow}
  void mainImage(out vec4 color,vec2 uv){
    color=texture(iChannel0,uv);
    color.rgb*=1.0-sunColor.r*(1.0-surfaceShadow())*(1.0-pomLight());
  }
`);

export const groundShadowShader=new Shader(`${receiverShadow}
  void mainImage(out vec4 color,vec2 uv){
    color=vec4(0.0,0.0,0.0,sunColor.r*(1.0-surfaceShadow())*(1.0-pomLight()));
  }
`);

// A closed solid cannot receive direct sunlight on a face pointing away from
// the sun. Enforce that geometric fact before sampling the biased shadow map;
// otherwise its filtering leaks a bright rim at convex checkerboard corners.
// Keep this on solid puzzle faces, not painted character/flag billboards.
const solidPieceShadow=(strength)=>new Shader(`${receiverShadow}
  void mainImage(out vec4 color,vec2 uv){
    color=texture(iChannel0,uv);
    float visible=dot(normalize(worldNormal),sunDirection)>0.0001?surfaceShadow():0.0;
    color.rgb*=1.0-${strength}*sunColor.r*(1.0-visible)*(1.0-pomLight());
  }
`);
export const solidPieceShadowShader=solidPieceShadow('1.0');
export const highlightedPieceShadowShader=solidPieceShadow('0.5');

// Ground, backdrop, and puzzle faces use the same shadow filter.
export function createGroundSurfaceShader(){
  return pieceShadowShader;
}

// Scenery uses separate projected silhouettes, so its opacity does not change
// puzzle shadows. UV derivatives convert the shared surface blur from world units.
export function createSceneryProjectionShader(strength,blur){
  if(!blur)return new Shader(`void mainImage(out vec4 color,vec2 uv){
    if(any(lessThan(uv,vec2(0)))||any(greaterThan(uv,vec2(1)))){color=vec4(0);return;}
    color=vec4(0,0,0,texture(iChannel0,uv).a*${strength.toFixed(4)}*sunColor.r);
  }`);
  return new Shader(`
    float maskAlpha(vec2 uv){
      if(any(lessThan(uv,vec2(0)))||any(greaterThan(uv,vec2(1))))return 0.;
      return texture(iChannel0,uv).a;
    }
    void mainImage(out vec4 color,vec2 uv){
      vec2 dx=dFdx(uv)/max(length(dFdx(worldPos)),.00001)*${blur.toFixed(4)};
      vec2 dy=dFdy(uv)/max(length(dFdy(worldPos)),.00001)*${blur.toFixed(4)};
      float alpha=0.,weight=0.;
      for(int i=0;i<32;i++){
        float r=sqrt((float(i)+.5)/32.),angle=float(i)*2.39996323,w=exp(-2.*r*r);
        alpha+=maskAlpha(uv+(dx*cos(angle)+dy*sin(angle))*r)*w;weight+=w;
      }
      color=vec4(0,0,0,alpha/weight*${strength.toFixed(4)}*sunColor.r);
    }
  `);
}
