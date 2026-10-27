import { Shader } from 'littlejsengine';

// LittleJS 1.27.2 supplies S, shadowMap, and shadowParams to 3D Shader snippets.
// Compare each filtered sample against the receiver plane at that sample, rather
// than comparing all nine samples with the center depth. The latter produces
// striped self-shadowing on sloping faces, particularly on mobile GPUs.
const receiverShadow=`
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
    highp float result=0.0;
    for(int x=-1;x<=1;++x)for(int y=-1;y<=1;++y){
      highp vec2 offset=vec2(float(x),float(y))*shadowParams.z;
      highp float depth=q.z+dot(slope,offset)-bias;
      result+=texture(shadowMap,vec3(q.xy+offset,depth));
    }
    return result/9.0;
  }
`;

// Preserve the illustrated colors outside cast shadows.
export const pieceShadowShader=new Shader(`${receiverShadow}
  void mainImage(out vec4 color,vec2 uv){
    color=texture(iChannel0,uv);
    color.rgb*=1.0-sunColor.r*(1.0-surfaceShadow());
  }
`);

export const groundShadowShader=new Shader(`${receiverShadow}
  void mainImage(out vec4 color,vec2 uv){
    color=vec4(0.0,0.0,0.0,sunColor.r*(1.0-surfaceShadow()));
  }
`);

// The game preserves its painted palette with unlit materials. Receive the
// lab's point lights explicitly instead of relighting the whole illustration.
const lightboxSpill=`
  vec3 lightboxSpill(){
    vec3 n=normalize(worldNormal),energy=vec3(0.0);
    if(!gl_FrontFacing)n=-n;
    for(int i=0;i<8;i++){
      if(i>=lightCount)break;
      vec4 source=lights[i];if(source.w<=0.0)continue;
      vec3 delta=source.xyz-worldPos;float distance=length(delta);
      float falloff=max(0.0,1.0-distance/source.w);
      float facing=0.18+0.82*max(0.0,dot(n,delta/max(distance,0.0001)));
      energy+=lightColors[i].rgb*lightColors[i].a*falloff*falloff*facing;
    }
    return min(energy,vec3(0.85));
  }
`;
export const lightboxReceiverShader=new Shader(`${receiverShadow}${lightboxSpill}
  void mainImage(out vec4 color,vec2 uv){
    color=texture(iChannel0,uv);
    color.rgb*=1.0-sunColor.r*(1.0-surfaceShadow());
    color.rgb+=lightboxSpill()*0.6;
  }
`);
export const lightboxUnshadowedShader=new Shader(`${lightboxSpill}
  void mainImage(out vec4 color,vec2 uv){color=texture(iChannel0,uv);color.rgb+=lightboxSpill()*0.6;}
`);
export const lightboxGroundShader=new Shader(`${lightboxSpill}
  void mainImage(out vec4 color,vec2 uv){color=vec4(lightboxSpill()*0.7,1.0);}
`);
