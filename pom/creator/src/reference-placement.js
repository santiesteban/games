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
