// Adapted for Little Ledges from pushmo-qr-decoder (MIT). See NOTICE.md.
/* Original browser port of this project's documented Pushmo reader. */
export function checksum(bytes) {
  let crc = 0;
  for (const b of bytes) {
    crc = (crc ^ (b << 24)) >>> 0;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x80000000 ? 0x04c11db7 : 0)) >>> 0;
  }
  return (crc ^ 0xd87a2314) >>> 0;
}
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
const hex32 = n => n.toString(16).padStart(8,'0');
export function decodeGrid(bytes) {
  if (bytes.length !== 512) throw new Error('The level grid must contain 512 bytes.');
  const grid = Array.from({length:32}, () => Array(32).fill(0));
  for (let i=0;i<1024;i++) {
    const tile = i >> 6, local = i & 63;
    const x = (tile % 4)*8 + (local&1) + ((local>>1)&2) + ((local>>2)&4);
    const y = (tile>>2)*8 + ((local>>1)&1) + ((local>>2)&2) + ((local>>3)&4);
    grid[y][x] = (bytes[i>>1] >> (i%2 ? 0 : 4)) & 15;
  }
  return grid;
}
export async function parsePayload(input) {
  const bytes = Uint8Array.from(input);
  if (bytes.length !== 718) throw new Error(`This QR has ${bytes.length} bytes. A Pushmo level needs exactly 718.`);
  if (hex(bytes.slice(0,4)) !== '8d060000') throw new Error('The QR is readable, but it is not a supported Pushmo / Pullblox level.');
  const view = new DataView(bytes.buffer);
  const stored = view.getUint32(8,true), computed = checksum(bytes.slice(12));
  if (stored !== computed) throw new Error('The level checksum does not match. Try a clearer copy of the QR card.');
  let name;
  try { name = new TextDecoder('utf-16le',{fatal:true,ignoreBOM:true}).decode(bytes.slice(108,142)).split('\0')[0]; }
  catch { throw new Error('The level title contains invalid text bytes.'); }
  const palette = Array.from(bytes.slice(14,24));
  if (palette.some(n=>n>=184)) throw new Error('The level contains an unsupported palette color.');
  const grid = decodeGrid(bytes.slice(206));
  if (grid.some(row=>row.some(n=>n>10))) throw new Error('The level contains unsupported grid color slots.');
  function positions(start,count,kind) {
    const objects=[];
    for(let slot=0;slot<count;slot++) {
      const [x,y,icon,attributes] = bytes.slice(start+slot*4,start+slot*4+4);
      if (x===255) continue;
      if (x>=32 || y>=32) throw new Error(`The ${kind} has coordinates outside the level grid.`);
      objects.push({slot,x,y,icon,attributes,color:attributes>>4,inverted:Boolean(attributes&1)});
    }
    return objects;
  }
  const flags=view.getUint32(176,true), warnings=[];
  if(bytes[12]<1 || bytes[12]>5) warnings.push('Difficulty outside observed range 1–5');
  if(bytes[13]!==7) warnings.push('Unexpected byte at offset 13');
  const digest = await crypto.subtle.digest('SHA-256',bytes);
  return {schema_version:1,name,difficulty:bytes[12],width:32,height:32,coordinate_origin:'top-left',
    transparent_slot:10,palette_indices:palette,grid,
    flags:{raw:flags,protected:Boolean(flags&2),large:Boolean(flags&0x400),uses_manholes:Boolean(flags&0x100),uses_switches:Boolean(flags&0x200)},
    goal:positions(24,1,'goal'),switches:positions(28,10,'switch'),manholes:positions(68,10,'manhole'),
    checksum:{stored:hex32(stored),computed:hex32(computed),valid:stored===computed},
    payload_sha256:hex(new Uint8Array(digest)),warnings,
    unknown_bytes:{header:hex(bytes.slice(4,8)),byte13:bytes[13],metadata:hex(bytes.slice(142,176)),reserved:hex(bytes.slice(180,206))}};
}
