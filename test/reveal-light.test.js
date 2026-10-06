import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {beamWeight,beamOrigin,beamDirection} from '../src/reveal-light.js';
import {dustData} from '../src/atmosphere.js';
test('one fixed light field reveals only a small minority of world dust',()=>{
  assert.equal(beamWeight(beamOrigin.clone().addScaledVector(beamDirection,60)),1);
  assert.equal(beamWeight(new Vector3(200,200,200)),0);
  for(const mobile of [true,false]){
    const {positions,count}=dustData(mobile);let illuminated=0;
    for(let i=0;i<count;i++)if(beamWeight(new Vector3().fromArray(positions,i*3))>.1)illuminated++;
    assert.ok(illuminated>50&&illuminated/count<.025);
  }
});
