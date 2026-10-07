import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {dustData} from '../src/atmosphere.js';
import {pose} from '../src/journey.js';

for(const mobile of [false,true]) test(`opening dust coverage, mobile=${mobile}`,()=>{
  const data=dustData(mobile), camera=new T.PerspectiveCamera(48,mobile?390/844:16/9,.2,900);
  const p=new T.Vector3();let min=Infinity,nearTotal=0;
  for(let step=0;step<=20;step++) {
    pose(step/100,camera,mobile);camera.updateMatrixWorld();let visible=0;
    for(let i=0;i<data.count;i++) {
      p.fromArray(data.positions,i*3).applyMatrix4(camera.matrixWorldInverse);
      const depth=-p.z;
      if(depth<2.2||depth>150)continue;
      p.applyMatrix4(camera.projectionMatrix);
      if(Math.abs(p.x)<1&&Math.abs(p.y)<1){visible++;if(depth<18)nearTotal++;}
    }
    min=Math.min(min,visible);
  }
  assert.ok(min>100,`minimum visible dust: ${min}`);
  assert.ok(nearTotal>20,`near samples: ${nearTotal}`);
  assert.deepEqual(data.positions,dustData(mobile).positions);
  console.log({mobile,minimumOpeningParticles:min,nearSamples:nearTotal});
});
