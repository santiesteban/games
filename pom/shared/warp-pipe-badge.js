import {WARP_PIPE_COLORS} from './warp-pipes.js';

// The game and editor share the same 256 × 256 badge artwork.
export function drawWarpPipeBadge(context, index=0, {labeled=false, overlay=false, inverted=false, vivid=color=>color}={}){
  const colors=WARP_PIPE_COLORS[index%WARP_PIPE_COLORS.length];
  if(overlay){context.beginPath();context.roundRect(28,28,200,200,32);context.fillStyle='#ffe45c';context.fill();context.globalCompositeOperation='destination-out'}
  else{
    context.beginPath();context.roundRect(18,18,220,220,40);context.fillStyle='#33263b';context.fill();
    context.beginPath();context.roundRect(28,28,200,200,32);context.fillStyle='#fff3d0';context.fill();
  }
  context.save();if(inverted){context.translate(128,128);context.rotate(Math.PI);context.translate(-128,-128)}
  context.fillStyle=overlay?vivid(colors.body):colors.body;context.beginPath();context.roundRect(77,130,102,62,[0,0,18,18]);context.fill();
  context.beginPath();context.roundRect(57,80,142,60,12);context.fillStyle=overlay?vivid(colors.rim):colors.rim;context.fill();
  context.beginPath();context.ellipse(128,82,71,25,0,0,Math.PI*2);context.fillStyle=overlay?vivid(colors.rim):colors.rim;context.fill();
  context.beginPath();context.ellipse(128,82,43,13,0,0,Math.PI*2);
  if(overlay){context.fillStyle='#000';context.fill();context.globalCompositeOperation='source-over'}else{context.fillStyle='#3a184a';context.fill()}
  context.restore();
  if(labeled){context.font='bold 62px sans-serif';context.textAlign='center';context.textBaseline='alphabetic';context.lineJoin='round';context.lineWidth=7;context.strokeStyle=overlay?'#ffe45c':'#fff3d0';context.strokeText(String(index+1),193,218);context.fillStyle='#21182a';context.fillText(String(index+1),193,218)}
}
