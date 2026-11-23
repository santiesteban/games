import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ENVIRONMENT_REVISION,gameplayEnvironmentConfiguration} from './environment-policy.js';
import {adoptStackedInteraction,INTERACTION_REVISION} from './interaction-defaults.js';
const catalog=JSON.parse(fs.readFileSync(new URL('./data/levels.json',import.meta.url))),exported=JSON.parse(fs.readFileSync(new URL('./data/daisy-meadow-ivan-v2.json',import.meta.url))),approved=exported.configuration;
test('Stippled Green Grid defaults across the catalog, user puzzles and creator playtests',()=>{
 for(const level of [...catalog.levels,{userPuzzle:{id:'example'}},{temporaryPlaytest:true}]){
   const result=gameplayEnvironmentConfiguration(level,catalog.groups,approved,{environment:'highway-desert'},ENVIRONMENT_REVISION);
   assert.equal(result.environment,'stippled-green-grid');
   assert.equal(result.showGuides,true);
   assert.deepEqual(result.sceneryLayout,[]);
 }
});
test('stacked controls adopt once and preserve subsequent user choices and unrelated flags',()=>{
 const flags={stackedPieceButtons:false,pieceDragArrows:true,pieceShadows:false,floorGrid:true};
 assert.deepEqual(adoptStackedInteraction({version:2},flags),{...flags,stackedPieceButtons:true,pieceDragArrows:false});
 assert.deepEqual(adoptStackedInteraction({interactionRevision:INTERACTION_REVISION},flags),flags);
 assert.equal(flags.pieceDragArrows,true);
});
test('explicit scenario preference covers catalog, Japan and user puzzles',()=>{
 for(const level of [catalog.levels[0],{environment:'japan-spring'},{userPuzzle:{id:'custom'}},{temporaryPlaytest:true}]){
   assert.equal(gameplayEnvironmentConfiguration(level,[],approved,null,null,'daisy-meadow'),approved);
   for(const scenario of ['riso-print','dreamscape','grass-clouds','printed-fans','printed-lagoon','stippled-sky','stippled-blue','stippled-green-grid']){
     const result=gameplayEnvironmentConfiguration(level,[],approved,null,null,scenario);
     assert.equal(result.environment,scenario);
     assert.equal(result.showGuides,true);
     assert.deepEqual(result.sceneryLayout,[]);
     assert.equal(result.scenicAtmosphere,false);
   }
 }
});
