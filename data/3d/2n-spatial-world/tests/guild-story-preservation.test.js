import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {createMemoryScene} from '../src/guild-memory-scene.js';
import {sampleStoryPose,NEXT_START_UNITS} from '../src/people-story.js';

// Recorded from the released main implementation, independently of new code.
const baseline=JSON.parse(readFileSync(new URL('./fixtures/guild-history-main-2a8ce13.json',import.meta.url)));
test('story camera, every petal matrix, text fading and lights match released main before the ending',()=>{
 for(const fixture of baseline.fixtures){
  const m=createMemoryScene({mobile:fixture.aspect<1}),c=new T.PerspectiveCamera(48,fixture.aspect,.2,2400),asset=new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial());m.install(asset,'garden','rose');m.install(asset,'jungle','compass');
  try{for(const [index,memoryPhase] of [0,.4,1,1.4,2].entries()){
   const state={memoryPhase,eventIndex:Math.round(memoryPhase)};for(let i=0;i<20;i++)m.update(state,c,.025);
   m.updateTextOcclusion(c,new T.Box3(new T.Vector3(-10,-40,-14),new T.Vector3(10,10,-14)),memoryPhase);
   const value={camera:c.position.toArray(),rotation:c.quaternion.toArray(),matrices:m.group.children.filter(o=>o.isInstancedMesh).flatMap(o=>Array.from(o.instanceMatrix.array)),alpha:m.group.children.filter(o=>o.isInstancedMesh).flatMap(o=>Array.from(o.geometry.getAttribute('memoryAlpha').array)),lights:m.group.children.filter(o=>o.isLight).map(o=>o.intensity)};
   assert.equal(createHash('sha256').update(JSON.stringify(value)).digest('hex'),fixture.hashes[index],`released story changed at ${memoryPhase}, aspect ${fixture.aspect}`);
  }}finally{m.dispose();asset.geometry.dispose();asset.material.dispose();}
 }
});
test('switching the ending never changes earlier chapter poses or timing states',()=>{
 for(const aspect of [.46,1.8])for(let i=0;i<=100;i++){
  const p=NEXT_START_UNITS/28*i/100,a=new T.PerspectiveCamera(48,aspect),b=new T.PerspectiveCamera(48,aspect);
  assert.deepEqual(sampleStoryPose(p,a,aspect<1,null,true),sampleStoryPose(p,b,aspect<1,null,false));
  assert.deepEqual(a.position.toArray(),b.position.toArray());assert.deepEqual(a.quaternion.toArray(),b.quaternion.toArray());
 }
});
