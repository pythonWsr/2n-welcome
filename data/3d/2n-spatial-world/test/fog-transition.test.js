import test from 'node:test';
import assert from 'node:assert/strict';
import {fogVisibility,fogDensity,fogLayerOpacity} from '../src/atmosphere.js';

test('fog visibility recovers continuously across a long approach',()=>{
  let previous=fogVisibility(0),largestStep=0;
  assert.ok(previous<.08);
  for(let i=1;i<=1000;i++){
    const value=fogVisibility(i/1000);
    largestStep=Math.max(largestStep,value-previous);
    assert.ok(value>=previous);previous=value;
  }
  assert.ok(largestStep<.003);
  assert.ok(fogVisibility(.2)<.3);
  assert.ok(fogVisibility(.45)>.5&&fogVisibility(.45)<.8);
  assert.ok(fogVisibility(.72)>.98);
});

test('density follows desired optical visibility without a state switch',()=>{
  for(const [distance,progress] of [[380,0],[130,.2],[55,.4],[28,.6]]){
    const density=fogDensity(distance,progress);
    const transmission=Math.exp(-density*density*distance*distance);
    assert.ok(Math.abs(transmission-fogVisibility(progress))<1e-12);
  }
});

test('each fog bank fades smoothly before and through the camera',()=>{
  let previous=fogLayerOpacity(-100,.14,.3),largestStep=0;
  for(let d=-99.9;d<=30;d+=.1){
    const value=fogLayerOpacity(d,.14,.3);
    largestStep=Math.max(largestStep,Math.abs(value-previous));
    assert.ok(value<=previous+1e-12);previous=value;
  }
  assert.ok(largestStep<.001);assert.equal(fogLayerOpacity(20,.14,.3),0);
});
