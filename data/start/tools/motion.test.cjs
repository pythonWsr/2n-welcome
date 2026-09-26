const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../dist/motion.js');

test('intro stages remain bounded and end before scroll unlock', () => {
  for (let time=0; time<=M.DURATION; time+=20) {
    const state=M.intro(time);
    for (const [key,value] of Object.entries(state)) {
      if(key!=='complete') assert.ok(value>=0 && value<=1, key+' at '+time);
    }
    assert.equal(state.complete, time>=M.DURATION);
  }
  const end=M.intro(M.DURATION);
  for(const [key,value] of Object.entries(end)) if(key!=='complete') assert.equal(value,1,key);
});

test('logo, copy and controls have distinct reveal windows', () => {
  assert.ok(M.intro(1700).lineTwo>0.99);
  assert.equal(M.intro(1700).curtain,0);
  assert.ok(M.intro(3300).logo>0);
  assert.equal(M.intro(3300).copyOne,0);
  assert.equal(M.intro(4800).controls,0);
  assert.ok(M.intro(5300).controls>0);
});

test('entry camera finishes before horizontal movement begins', () => {
  assert.deepEqual(M.scroll(-20,1000,8000),{entry:0,x:0,progress:0});
  assert.equal(M.scroll(500,1000,8000).x,0);
  assert.equal(M.scroll(1000,1000,8000).entry,1);
  assert.equal(M.scroll(1000,1000,8000).x,0);
  assert.equal(M.scroll(1250,1000,8000).x,250);
  assert.deepEqual(M.scroll(10000,1000,8000),{entry:1,x:8000,progress:1});
});
