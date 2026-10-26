import QRCode from 'qrcode';
import { encodePuzzle, decodePuzzle, gameUrl, downloadBlob, fileName } from '../../shared/puzzle.js';
const color=rgb=>`rgb(${rgb.join(',')})`;

export async function exportCard(puzzle,base){
  if(decodePuzzle(encodePuzzle(puzzle)).revision!==puzzle.revision)throw new Error('The sharing data did not match. Export JSON instead.');
  const qr=QRCode.create(gameUrl(base,'puzzle',puzzle),{errorCorrectionLevel:'M'}),module=6,qrSize=(qr.modules.size+8)*module;
  // Empty editor margins are useful while painting, but need not be printed.
  // Keep all spacing inside the mural and leave the shared puzzle data intact.
  let left=32,right=-1,top=32,bottom=-1;
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(puzzle.grid[y][x]!=='.'){
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  const columns=right-left+1,rows=bottom-top+1;
  if(columns<=0||rows<=0)throw new Error('Paint a puzzle before exporting a card.');
  const cell=Math.min(120,960/columns,960/rows),artWidth=columns*cell,artHeight=rows*cell,padding=40;
  const frameWidth=Math.ceil(artWidth+padding*2),frameHeight=Math.ceil(artHeight+padding*2),frameX=(1400-frameWidth)/2,frameY=245;
  const artX=(1400-artWidth)/2,artY=frameY+padding,qy=frameY+frameHeight+35;
  const card=document.createElement('canvas');card.width=1400;card.height=qy+qrSize+70;const c=card.getContext('2d');
  c.fillStyle='#b4f5de';c.fillRect(0,0,card.width,card.height);c.fillStyle='#292537';c.textAlign='center';c.font='900 42px Nunito,sans-serif';c.fillText('little ledges · a puzzle for you',700,92);
  let size=62;do{c.font=`900 ${size--}px Nunito,sans-serif`}while(c.measureText(puzzle.name).width>1200&&size>22);c.fillText(puzzle.name,700,190);
  c.fillStyle='#fffaf0';c.fillRect(frameX,frameY,frameWidth,frameHeight);c.strokeStyle='#292537';c.lineWidth=4;c.strokeRect(frameX,frameY,frameWidth,frameHeight);
  // Reuse exact shared boundaries to avoid antialiasing seams at fractional cell sizes.
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(puzzle.grid[y][x]!=='.'){
    const x1=Math.round(artX+(x-left)*cell),x2=Math.round(artX+(x-left+1)*cell),y1=Math.round(artY+(y-top)*cell),y2=Math.round(artY+(y-top+1)*cell);
    c.fillStyle=color(puzzle.palette[puzzle.grid[y][x]]);c.fillRect(x1,y1,x2-x1,y2-y1);
  }
  const gx=artX+(puzzle.goal.x-left+.4)*cell,gy=artY+(puzzle.goal.y-top+.15)*cell;
  c.strokeStyle='#292537';c.lineWidth=Math.max(2,cell*.06);c.beginPath();c.moveTo(gx,gy+cell*.8);c.lineTo(gx,gy);c.stroke();c.fillStyle='#ff9d1c';c.beginPath();c.moveTo(gx,gy);c.lineTo(gx+cell*.6,gy+cell*.2);c.lineTo(gx,gy+cell*.4);c.fill();
  // Integer-size modules with a four-module quiet zone, without interpolation.
  const qx=(1400-qrSize)/2;c.fillStyle='#fff';c.fillRect(qx,qy,qrSize,qrSize);c.fillStyle='#000';for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)if(qr.modules.get(y,x))c.fillRect(qx+(x+4)*module,qy+(y+4)*module,module,module);
  c.fillStyle='#292537';c.textAlign='center';c.font='700 22px DM Sans,sans-serif';c.fillText('Scan to add this puzzle to Little Ledges',700,card.height-24);
  const blob=await new Promise(resolve=>card.toBlob(resolve,'image/png'));if(!blob)throw new Error('Could not create the image. Try exporting JSON.');await downloadBlob(blob,`${fileName(puzzle.name)}-puzzle.png`);
}
