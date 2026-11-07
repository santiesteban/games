// Sample content is available only to the local development preview.
export function previewPuzzles(){
  const examples=[
    ['Sunrise Steps','Alex',['....1111','00001111','00001111'],[[255,216,74],[242,123,53]]],
    ['Mint Tower','Sam',['..11..','001122','001122','001122'],[[159,210,178],[67,151,111],[225,242,205]]],
    ['Little Arch','Taylor',['11111111','11....11','11....11','00000000'],[[240,160,139],[179,145,210]]],
    ['Staircase','Jordan',['......11','....1111','..001111','00001111'],[[255,216,74],[115,158,212]]],
  ];
  return examples.map(([name,creatorName,rows,colors],index)=>{
    const grid=Array(32-rows.length).fill('.'.repeat(32)).concat(rows.map(row=>row.padEnd(32,'.'))),goalX=rows[0].search(/[0-9]/);
    return {creatorName,puzzle:{format:'little-ledges-puzzle',schemaVersion:1,rulesVersion:1,id:`preview-${index}`,name,grid,palette:Object.fromEntries(colors.map((color,i)=>[i,color])),start:{x:0,y:32,z:0},goal:{x:goalX,y:32-rows.length}}};
  });
}
