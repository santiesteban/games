// Mask the live WebGL output after the scene is drawn. The texture contains
// only the star's shape; the puzzle itself is rendered normally every frame.
export function createVictoryLiveMask(gl){
  let program,vao,texture,maskCanvas,frame,uploadedWidth=0,uploadedHeight=0;
  const vertex=`#version 300 es
    void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0,1);}`;
  const fragment=`#version 300 es
    precision highp float;
    uniform sampler2D uMask;
    uniform vec2 uResolution;
    out vec4 color;
    void main(){
      vec2 uv=vec2(gl_FragCoord.x/uResolution.x,1.0-gl_FragCoord.y/uResolution.y);
      float alpha=texture(uMask,uv).a;
      color=vec4(0,0,0,alpha);
    }`;
  function shader(type,source){
    const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);
    if(!gl.getShaderParameter(result,gl.COMPILE_STATUS)){gl.deleteShader(result);throw Error('Unable to compile victory mask')}
    return result;
  }
  function setup(){
    if(program&&gl.isProgram(program))return;
    const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
    program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Unable to link victory mask');
    vao=gl.createVertexArray();texture=gl.createTexture();uploadedWidth=uploadedHeight=0;
    if(maskCanvas)upload();
  }
  function upload(){
    const active=gl.getParameter(gl.ACTIVE_TEXTURE);gl.activeTexture(gl.TEXTURE0);
    const previous=gl.getParameter(gl.TEXTURE_BINDING_2D),flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    if(maskCanvas.width!==uploadedWidth||maskCanvas.height!==uploadedHeight){
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,maskCanvas);uploadedWidth=maskCanvas.width;uploadedHeight=maskCanvas.height;
    }else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,maskCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);gl.bindTexture(gl.TEXTURE_2D,previous);gl.activeTexture(active);
  }
  function setFrame(value){
    frame=value;
    maskCanvas??=document.createElement('canvas');
    const ratio=1,width=Math.max(1,Math.round(value.contentWidth*ratio)),height=Math.max(1,Math.round(value.contentHeight*ratio));
    if(maskCanvas.width!==width||maskCanvas.height!==height){maskCanvas.width=width;maskCanvas.height=height}
    const ctx=maskCanvas.getContext('2d');ctx.setTransform(ratio,0,0,ratio,-value.insetX*ratio,-value.insetY*ratio);
    ctx.clearRect(value.insetX,value.insetY,value.contentWidth,value.contentHeight);ctx.fillStyle='#fff';ctx.fill(new Path2D(value.path));
    if(!gl.isContextLost()){setup();upload()}
  }
  function render(){
    if(!frame||gl.isContextLost())return;
    setup();
    const old={program:gl.getParameter(gl.CURRENT_PROGRAM),vao:gl.getParameter(gl.VERTEX_ARRAY_BINDING),active:gl.getParameter(gl.ACTIVE_TEXTURE),
      blend:gl.isEnabled(gl.BLEND),depth:gl.isEnabled(gl.DEPTH_TEST),cull:gl.isEnabled(gl.CULL_FACE),scissor:gl.isEnabled(gl.SCISSOR_TEST),
      srcRGB:gl.getParameter(gl.BLEND_SRC_RGB),dstRGB:gl.getParameter(gl.BLEND_DST_RGB),srcAlpha:gl.getParameter(gl.BLEND_SRC_ALPHA),dstAlpha:gl.getParameter(gl.BLEND_DST_ALPHA),
      equationRGB:gl.getParameter(gl.BLEND_EQUATION_RGB),equationAlpha:gl.getParameter(gl.BLEND_EQUATION_ALPHA),colorMask:gl.getParameter(gl.COLOR_WRITEMASK)};
    gl.activeTexture(gl.TEXTURE0);old.texture=gl.getParameter(gl.TEXTURE_BINDING_2D);
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.useProgram(program);gl.bindVertexArray(vao);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.SCISSOR_TEST);gl.enable(gl.BLEND);
    gl.colorMask(true,true,true,true);gl.blendEquation(gl.FUNC_ADD);gl.blendFuncSeparate(gl.ZERO,gl.SRC_ALPHA,gl.ZERO,gl.SRC_ALPHA);
    gl.uniform1i(gl.getUniformLocation(program,'uMask'),0);
    gl.uniform2f(gl.getUniformLocation(program,'uResolution'),gl.drawingBufferWidth,gl.drawingBufferHeight);
    gl.drawArrays(gl.TRIANGLES,0,3);
    frame.onPresented?.();
    gl.blendFuncSeparate(old.srcRGB,old.dstRGB,old.srcAlpha,old.dstAlpha);gl.blendEquationSeparate(old.equationRGB,old.equationAlpha);gl.colorMask(...old.colorMask);
    for(const [flag,enabled] of [[gl.BLEND,old.blend],[gl.DEPTH_TEST,old.depth],[gl.CULL_FACE,old.cull],[gl.SCISSOR_TEST,old.scissor]])enabled?gl.enable(flag):gl.disable(flag);
    gl.bindTexture(gl.TEXTURE_2D,old.texture);gl.activeTexture(old.active);gl.bindVertexArray(old.vao);gl.useProgram(old.program);
  }
  return{setFrame,clear:()=>{frame=undefined},render};
}
