import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTION_RETURN_DURATION,createPomActionPulse} from './pom-action-pulse.js';

test('anticipation stays enlarged until movement and returns over a fixed duration',()=>{
  const pulse=createPomActionPulse();assert.equal(pulse.scale(0),1);
  pulse.start();assert.equal(pulse.scale(0),1.25);
  pulse.advance(0,500);assert.equal(pulse.scale(500),1.25);
  pulse.advance(.001,510);assert.equal(pulse.scale(510),1.25);
  const during=pulse.scale(510+ACTION_RETURN_DURATION/2);assert(during>1&&during<1.25);
  assert.equal(pulse.scale(510+ACTION_RETURN_DURATION),1);
  pulse.start();pulse.reset();assert.equal(pulse.scale(1000),1);
});
