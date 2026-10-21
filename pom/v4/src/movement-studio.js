// Reproduce the reported puzzle configurations, rather than approximating
// them with an unobstructed staircase. Depths follow each map's piece order.
export const movementExamples=[
  {id:'corner-climb',label:'Diagonal climb beside a wall',levelId:20,depths:[2,0,0,3,2,1],from:{x:1,y:5,z:2},to:{x:2,y:4,z:1},help:'Climb diagonally from the orange step onto the highlighted green ledge.'},
  {id:'window',label:'Diagonal into an opening',levelId:33,depths:[2,0,3,3],from:{x:1,y:2,z:2},to:{x:2,y:2,z:1},help:'Move diagonally into the orange opening, around the corner of the frame.'},
  {id:'parachute',label:'Parachute beside a wall',levelId:22,depths:[0,0,0,2,3],from:{x:3,y:2,z:1},to:{x:4,y:4,z:1},help:'Step to the right and parachute down to the highlighted orange ledge.'},
  {id:'green-step',label:'Step up beside a pulled piece',levelId:23,depths:[0,1,1,1,2,3],from:{x:2,y:7,z:2},to:{x:1,y:6,z:2},help:'Climb one step to the left along the green ledges beside the yellow piece.'},
  {id:'maze-step',label:'Climb through the maze corner',levelId:25,depths:[3,2,1],from:{x:12,y:12,z:2},to:{x:11,y:11,z:2},help:'Climb diagonally left onto the orange step beside the green strip.'},
  {id:'lesson-corner',label:'Climb around an obstructing corner',levelId:13,depths:[2,0,3],from:{x:1,y:3,z:1},to:{x:2,y:2,z:2},help:'Stretch up and diagonally around the blue corner onto the orange ledge.'},
  {id:'forward',label:'Walk forward twice on one platform',levelId:22,depths:[0,0,0,3,0],from:{x:3,y:2,z:0},to:{x:3,y:2,z:2},help:'Tap the landing marker to walk forward twice, staying at the same height.',multiStep:true},
  {id:'single-drop',label:'Step down one level',levelId:20,depths:[2,0,0,3,2,1],from:{x:2,y:4,z:1},to:{x:1,y:5,z:2},help:'Step diagonally down from the green ledge onto the orange step.'},
];

export function studioLevel(levels,example){
  const original=levels.find(level=>level.id===example.levelId);
  return{...original,id:55,name:'Movement Studio',start:{...example.from},initialDepths:[...example.depths],previewMove:{...example.to},studioExample:example,description:example.help};
}
