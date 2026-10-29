import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ENVIRONMENT_REVISION,gameplayEnvironmentConfiguration} from './environment-policy.js';
import {adoptStackedInteraction,INTERACTION_REVISION} from './interaction-defaults.js';
const catalog=JSON.parse(fs.readFileSync(new URL('./data/levels.json',import.meta.url))),exported=JSON.parse(fs.readFileSync(new URL('./data/daisy-meadow-ivan-v2.json',import.meta.url))),approved=exported.configuration;
test('approved scene covers the catalog except every Japan level',()=>{
 let japan=0,others=0;
 for(const level of catalog.levels){const actual=gameplayEnvironmentConfiguration(level,catalog.groups,approved,null,null);if(level.group==='japan-challenges'){assert.equal(actual,null);japan++}else{assert.equal(actual,approved);others++}}
 assert.equal(japan,16);assert.equal(others,76);
 assert.equal(approved.backgroundDistance,3);assert.equal(approved.environmentShadowStrength,.45);assert.equal(approved.groundShadowBlur,.35);assert.equal(approved.sceneryLayout.length,18);
});
test('legacy applied scene is preserved but cannot mask shipped adoption; explicit later Apply works',()=>{
 const level=catalog.levels[0],old={environment:'highway-desert'};
 assert.equal(gameplayEnvironmentConfiguration(level,catalog.groups,approved,old,null),approved);
 assert.equal(gameplayEnvironmentConfiguration(level,catalog.groups,approved,old,ENVIRONMENT_REVISION),old);
 assert.equal(gameplayEnvironmentConfiguration({environment:'japan-spring'},[],approved,old,ENVIRONMENT_REVISION),null);
 assert.equal(gameplayEnvironmentConfiguration(level,catalog.groups,approved,null,ENVIRONMENT_REVISION),approved);
});
test('stacked controls adopt once and preserve subsequent user choices and unrelated flags',()=>{
 const flags={stackedPieceButtons:false,pieceDragArrows:true,pieceShadows:false,floorGrid:true};
 assert.deepEqual(adoptStackedInteraction({version:2},flags),{...flags,stackedPieceButtons:true,pieceDragArrows:false});
 assert.deepEqual(adoptStackedInteraction({interactionRevision:INTERACTION_REVISION},flags),flags);
 assert.equal(flags.pieceDragArrows,true);
});
