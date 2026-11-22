// Positions are offsets from the canvas center, measured in the 32-cell board.
// Scale 1 fits the whole image without changing its aspect ratio.
export function referenceRect(image,placement,width,height){
  const unit=Math.min(width/image.width,height/image.height)*placement.scale;
  const w=image.width*unit,h=image.height*unit;
  return{x:width/2+placement.x*width/32-w/2,y:height/2+placement.y*height/32-h/2,width:w,height:h};
}

// Preserve the exact placement of drafts saved with the older square-crop controls.
export function legacyReferencePlacement(image,crop={zoom:1,x:.5,y:.5}){
  const size=Math.min(image.width,image.height)/crop.zoom;
  const sx=(image.width-size)*crop.x,sy=(image.height-size)*crop.y;
  return{scale:Math.max(image.width,image.height)/size,x:(image.width/2-sx)/size*32-16,y:(image.height/2-sy)/size*32-16};
}

// Resize proportionally around the image center using a corner drag in screen pixels.
export function resizeReferenceFromDrag(scale,dx,dy,width,height){
  const span=Math.max(1,width+height);
  return Math.max(.1,Math.min(8,scale*(1+(dx+dy)/span)));
}

// Fit a new reference within the visible puzzle grid with a small margin.
export function fitReferenceToVisible(canvas,frame){
  const clamp=value=>Math.max(0,Math.min(32,value));
  const left=clamp((frame.left-canvas.left)*32/canvas.width),right=clamp((frame.right-canvas.left)*32/canvas.width);
  const top=clamp((frame.top-canvas.top)*33/canvas.height),bottom=clamp((frame.bottom-canvas.top)*33/canvas.height);
  return {scale:Math.max(.1,Math.min(1,(right-left)/32,(bottom-top)/32)*.9),x:(left+right)/2-16,y:(top+bottom)/2-16};
}
