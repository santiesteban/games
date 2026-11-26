// Small real puzzles for trying each animation with the normal game controls.
const palette={A:[85,169,174],B:[255,160,80],C:[255,219,60]};
const base=(id,label,grid,depths,start,goal,help,extra={})=>({id,label,grid,initialDepths:depths,start,goal,help,...extra});
const normalPairs=[[{x:0,y:3},{x:4,y:3}]];
const invertedPairs=[[{x:1,y:0,inverted:true},{x:4,y:0}]];
export const animationCases=[
  base('idle','Idle',['.....','.....','.....','AAA..'],[1],{x:1,y:3,z:0},{x:0,y:3},'Leave Pom still to see his idle animation.'),
  base('walk','Walking',['.....','.....','.....','AAA.C'],[1,1],{x:0,y:3,z:0},{x:4,y:3},'Tap a nearby square on the platform.'),
  base('push','Push',['.....','.....','.....','..A.C'],[2,1],{x:2,y:4,z:2},{x:4,y:3},'Press Push to move the piece in.'),
  base('pull','Pull',['.....','.....','.....','..A.C'],[2,1],{x:2,y:4,z:2},{x:4,y:3},'Press Pull to bring the piece out.'),
  base('step','Step jump',['.....','.....','..B..','AAB.C'],[1,1,1],{x:1,y:3,z:0},{x:4,y:3},'Tap the top of the higher block.'),
  base('gap-level','Gap jump · same height',['.....','.....','.....','A.B.C'],[1,1,1],{x:0,y:3,z:0},{x:4,y:3},'Tap the middle platform to jump across the gap.'),
  base('gap-down','Gap jump · lower landing',['A....','A.B..','A.B..','A.B.C'],[1,1,1],{x:0,y:0,z:0},{x:4,y:3},'Tap the top of the middle platform to jump down across the gap.'),
  base('umbrella','Umbrella descent',['A....','A....','AB...','AB..C'],[1,1,1],{x:0,y:0,z:0},{x:4,y:3},'Tap the lower platform beside Pom.'),
  base('normal-in','Enter normal pipe',['.....','.....','.....','A.C.B'],[1,1,1],{x:0,y:3,z:0},{x:2,y:3},'Tap the pipe Pom is standing on.',{warpPairs:normalPairs}),
  base('normal-out','Exit normal pipe',['.....','.....','.....','A.C.B'],[1,1,1],{x:4,y:3,z:0},{x:2,y:3},'Tap the pipe Pom is standing on and watch the other pipe.',{warpPairs:normalPairs}),
  base('inverted-under','Enter inverted pipe · directly below',['....B','.....','A....','..C..'],[1,1,1],{x:0,y:4,z:0},{x:2,y:3},'Tap the inverted pipe directly above Pom.',{warpPairs:[[{x:0,y:2,inverted:true},{x:4,y:0}]]}),
  base('inverted-high','Enter inverted pipe · two cells up',['.A..B','.....','.....','.C..C'],[2,1,2,1],{x:1,y:3,z:1},{x:4,y:3},'Tap the inverted pipe above Pom to jump into it.',{warpPairs:invertedPairs}),
  base('pipe','Enter inverted pipe · adjacent ledge',['.A..B','.....','.....','C...C'],[2,1,2,1],{x:0,y:3,z:1},{x:4,y:3},'Tap the inverted pipe beside Pom to jump into it.',{warpPairs:invertedPairs}),
  base('inverted-out','Exit inverted pipe',['.A..B','.....','.....','C...C'],[2,1,2,1],{x:4,y:0,z:0},{x:4,y:3},'Tap the pipe Pom is standing on and watch the inverted pipe.',{warpPairs:invertedPairs}),
];
export function animationCaseLevel(id,template){
  const entry=animationCases.find(item=>item.id===id);
  if(!entry)return null;
  return {...template,id:`animation-case-${entry.id}`,name:entry.label,description:entry.help,kind:'puzzle',width:entry.grid[0].length,height:entry.grid.length,grid:[...entry.grid],palette,initialDepths:[...entry.initialDepths],start:{...entry.start},goal:{...entry.goal},warpPairs:structuredClone(entry.warpPairs??[]),switches:[],objects:{switches:[],manholes:[]},temporaryPlaytest:true,compatibility:{playable:true,reasons:[]}};
}
