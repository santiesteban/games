// A saved scenario remains available when the player has chosen one explicitly.
// Levels with no saved scenario use the shared gameplay default.
export const DEFAULT_SCENARIO='stippled-green-grid';
export const ENVIRONMENT_REVISION='daisy-meadow-ivan-v2';
export const ENVIRONMENT_REVISION_KEY='little-ledges:v4:applied-background-revision';
export const USER_PUZZLE_ENVIRONMENT=Object.freeze({environment:'dreamscape',composition:'auto',layers:'both',sceneryLayout:[],scenicAtmosphere:false});
export function authoredEnvironment(level,groups,fallback='meadow'){
  return level.environment??groups.find(group=>group.id===level.group)?.environment??fallback;
}
export function gameplayEnvironmentConfiguration(level,groups,approved,applied,revision,scenario=null){
  scenario??=DEFAULT_SCENARIO;
  if(scenario==='daisy-meadow')return approved;
  if(['riso-print','dreamscape','grass-clouds','printed-fans','printed-lagoon','stippled-sky','stippled-blue','stippled-green-grid','stippled-fewer-clouds','flat-colors'].includes(scenario))return {environment:scenario,composition:'auto',layers:'both',showGuides:true,sceneryLayout:[],scenicAtmosphere:false};
  if(level.userPuzzle||level.temporaryPlaytest)return USER_PUZZLE_ENVIRONMENT;
  if(authoredEnvironment(level,groups)==='japan-spring'||level.group==='japan-challenges')return null;
  return revision===ENVIRONMENT_REVISION&&applied?applied:approved;
}
