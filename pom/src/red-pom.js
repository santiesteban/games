import {Color, EngineObject3D, Mesh, Shader, TextureInfo, glContext, render3D, vec3} from 'littlejsengine';

// Coordinates locate the character's body in each source illustration. All
// poses share the same body scale and floor contact, including the umbrella.
const occlusionShader=new Shader(`
  void mainImage(out vec4 color,vec2 uv){
    color=vec4(0.03,0.03,0.03,texture(iChannel0,uv).a*0.42);
  }
`);
const poses={
  calm:[56,90], 'happy-open':[56,90], happy:[56,90], excited:[56,103],
  squash:[61,82], stretch:[52,97], 'push-left':[56,107],
  'push-right':[63,105], 'push-back':[56,105], float:[56,149],
};
export async function createRedPom(parent){
  const entries=await Promise.all(Object.entries(poses).map(async([name,[anchorX,anchorY]])=>{
    const image=new Image(); image.src=`${import.meta.env.BASE_URL}assets/red-pom/${name}.svg`;
    await image.decode();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    canvas.getContext('2d').drawImage(image,128-anchorX,200-anchorY);
    return [name,new TextureInfo(canvas,true,false,false)];
  }));
  const textures=Object.fromEntries(entries),factor=.72/.56,half=128/112;
  const contactY=-.05,bottom=contactY-(56/112)*factor,top=bottom+(256/112)*factor;
  const mesh=new Mesh().addQuad(vec3(-half,top,0),vec3(-half,bottom,0),vec3(half,bottom,0),vec3(half,top,0));mesh.doubleSided=true;
  const object=new EngineObject3D(vec3(0,0,12),mesh,textures.calm,new Color(1));
  // Draw the solid character in the depth-writing pass. The renderer cuts
  // transparent pixels from the texture, leaving the floor and pieces intact.
  object.lighting=false;object.transparent=false;object.castShadow=true;parent.addChild(object);
  // A blended copy restores the SVG's antialiased edge over the solid depth
  // silhouette. The solid pass still prevents the grid showing through Pom.
  const edge=new EngineObject3D(vec3(0,0,12.1),mesh,textures.calm,new Color(1));
  edge.lighting=false;edge.transparent=true;edge.castShadow=false;parent.addChild(edge);
  let active='calm';
  return {object,edge,setPose(name){if(name!==active&&textures[name]){active=name;object.tileInfo=edge.tileInfo=textures[name]}},
    drawOcclusion(){
      // Show only fragments hidden by the already-rendered scene. The slightly
      // forward edge avoids marking Pom's own depth silhouette as occlusion.
      if(!edge.mesh)return;
      render3D.flushTransparentQueue();render3D.flush();
      const state={shader:render3D.shader,lighting:render3D.lighting,blend:render3D.blend,depthTest:render3D.depthTest,depthWrite:render3D.depthWrite,receiveShadow:render3D.receiveShadow};
      const previousDepth=glContext.getParameter(glContext.DEPTH_FUNC);
      try{
        render3D.shader=occlusionShader;render3D.lighting=false;render3D.blend=true;
        render3D.depthTest=true;render3D.depthWrite=false;render3D.receiveShadow=false;
        glContext.depthFunc(glContext.GREATER);
        render3D.drawMesh(edge.mesh,edge.getMatrix(),edge.tileInfo,new Color(1));
        render3D.flush();
      }finally{glContext.depthFunc(previousDepth);Object.assign(render3D,state)}
    },
    alignToSurface(surfaceOffset){
      // The parent is a camera-facing billboard. Its up and forward axes tilt
      // with the camera, so solve for the artwork's actual world-space base.
      const matrix=parent.getMatrix(),upY=matrix.m[5];
      if(Math.abs(upY)>.0001){
        object.pos3D.y=(surfaceOffset-matrix.m[9]*object.pos3D.z)/upY-contactY;
        edge.pos3D.y=(surfaceOffset-matrix.m[9]*edge.pos3D.z)/upY-contactY;
      }
    }};
}
