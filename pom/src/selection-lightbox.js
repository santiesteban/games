import {Color,EngineObject3D,Mesh,Shader,TextureInfo,vec2,vec3} from 'littlejsengine';

const glowShader=new Shader(`
  void mainImage(out vec4 color,vec2 uv){
    float inset=texture(iChannel0,uv).r;
    color=vec4(1.0,1.0,1.0,0.09*smoothstep(0.0,0.85,inset));
  }
`);

// A distance field for the complete silhouette gives a continuous inward glow,
// without square-cell seams or any geometry extending beyond the selected face.
function innerField(cells){
  const left=Math.min(...cells.map(c=>c.x)),top=Math.min(...cells.map(c=>c.y));
  const cols=Math.max(...cells.map(c=>c.x))-left+1,rows=Math.max(...cells.map(c=>c.y))-top+1;
  const unit=Math.min(24,Math.floor(1022/Math.max(cols,rows))),w=cols*unit+2,h=rows*unit+2;
  const distance=new Float32Array(w*h);
  for(const c of cells)for(let y=1+(c.y-top)*unit;y<1+(c.y-top+1)*unit;y++)for(let x=1+(c.x-left)*unit;x<1+(c.x-left+1)*unit;x++)distance[y*w+x]=1e5;
  const diagonal=Math.SQRT2;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;distance[i]=Math.min(distance[i],distance[i-1]+1,distance[i-w]+1,distance[i-w-1]+diagonal,distance[i-w+1]+diagonal)}
  for(let y=h-2;y>0;y--)for(let x=w-2;x>0;x--){const i=y*w+x;distance[i]=Math.min(distance[i],distance[i+1]+1,distance[i+w]+1,distance[i+w+1]+diagonal,distance[i+w-1]+diagonal)}
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const context=canvas.getContext('2d'),image=context.createImageData(w,h);
  for(let i=0;i<distance.length;i++){const value=Math.round(255*Math.min(1,distance[i]/(unit*.65)));image.data.set([value,value,value,255],i*4)}
  context.putImageData(image,0,0);
  return {texture:new TextureInfo(canvas,true,false,false),uv:(x,y)=>vec2((1+(x-left)*unit)/w,(1+(y-top)*unit)/h)};
}

export function createSelectionLightbox(){
  let face,texture,key,currentGroup;
  function clear(){face?.destroy();texture?.destroyWebGLTexture();face=texture=undefined;key=currentGroup=undefined}
  function update({group,width,height,worldPoint,tint,pulse,strength,glow}){
    if(!group||strength<=0||!glow){clear();return}
    const next=`${width}:${height}:${group.id}:${group.depth}:${worldPoint(0,1,0).y}:${worldPoint(0,0,1).x}`;
    if(next!==key||currentGroup!==group){
      clear();key=next;currentGroup=group;
      const field=innerField(group.cells),mesh=new Mesh();texture=field.texture;
      for(const c of group.cells){const x=c.x,y=height-c.y,z=group.depth+.032;
        mesh.addQuad(worldPoint(x,y,z),worldPoint(x,y-1,z),worldPoint(x+1,y-1,z),worldPoint(x+1,y,z),new Color(1),[field.uv(c.x,c.y),field.uv(c.x,c.y+1),field.uv(c.x+1,c.y+1),field.uv(c.x+1,c.y)]);
      }
      mesh.doubleSided=true;face=new EngineObject3D(vec3(),mesh,texture);face.emissive=1;face.transparent=true;face.additive=true;face.shader=glowShader;face.castShadow=face.receiveShadow=false;
    }
    face.color=new Color(tint.r,tint.g,tint.b,strength*(.2+.8*pulse));
  }
  return{update,clear};
}
