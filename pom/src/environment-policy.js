// Shipped scene adoption does not overwrite prior local Studio configurations.
// A new explicit Apply can override the default, except Japan keeps its theme.
export const ENVIRONMENT_REVISION='daisy-meadow-ivan-v2';
export const ENVIRONMENT_REVISION_KEY='little-ledges:v4:applied-background-revision';
export const USER_PUZZLE_ENVIRONMENT=Object.freeze({environment:'dreamscape',composition:'auto',layers:'both',sceneryLayout:[],scenicAtmosphere:false});
export function authoredEnvironment(level,groups,fallback='meadow'){
  return level.environment??groups.find(group=>group.id===level.group)?.environment??fallback;
}
export function gameplayEnvironmentConfiguration(level,groups,approved,applied,revision){
  if(level.userPuzzle||level.temporaryPlaytest)return USER_PUZZLE_ENVIRONMENT;
  if(authoredEnvironment(level,groups)==='japan-spring'||level.group==='japan-challenges')return null;
  return revision===ENVIRONMENT_REVISION&&applied?applied:approved;
}
