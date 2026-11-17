import test from 'node:test';
import assert from 'node:assert/strict';
import {isPomEyeStyle,resolvePomEyeStyle} from './pom-eye-style.js';

test('eye styles preserve the earlier bright setting and reject invalid options',()=>{
  assert.equal(resolvePomEyeStyle(undefined), 'classic');
  assert.equal(resolvePomEyeStyle(undefined,true), 'bright');
  for(const style of ['classic','bright','crazy','circle']){
    assert.equal(isPomEyeStyle(style),true);
    assert.equal(resolvePomEyeStyle(style,true),style);
  }
  assert.equal(isPomEyeStyle('unknown'),false);
  assert.equal(resolvePomEyeStyle('unknown',false),'classic');
});
