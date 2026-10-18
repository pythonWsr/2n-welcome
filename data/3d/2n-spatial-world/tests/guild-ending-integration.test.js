import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {sampleNext} from '../src/guild-next-route.js';
import {autoplayDuration,autoplayToScroll,scrollToAutoplay,scrollToStory,chapterAt,NEXT_START_UNITS,TOTAL_UNITS} from '../src/people-story.js';
import {createMemoryScene} from '../src/guild-memory-scene.js';

test('particle ending copy waits for the sculpture instead of following the legacy text cue',()=>{
 assert.equal(sampleNext(.8,{particleEnding:true}).nextOpacity,0);
 assert.equal(sampleNext(1,{particleEnding:true}).nextOpacity,1);
 assert.equal(sampleNext(.8).nextOpacity,1,'the existing ending mode keeps its timing');
});
test('opt-in particle ending occupies eighteen autoplay seconds and maps scroll back to the same chapter phase',()=>{
 const route={seconds:42},duration=autoplayDuration(route,true),before=duration-18;
 assert.equal(duration,autoplayDuration(route)+2);
 for(const t of [0,.1,.5,.83,1]){
  const scroll=autoplayToScroll((before+t*18)/duration,route,true),state=chapterAt(scrollToStory(scroll,route));
  assert.ok(Math.abs(state.nextT-t)<1e-10);
  assert.ok(Math.abs(scrollToAutoplay(scroll,route,true)-(before+t*18)/duration)<1e-10);
 }
 assert.ok(Math.abs(autoplayToScroll(before/duration,route,true)-NEXT_START_UNITS/TOTAL_UNITS)<1e-10);
});
test('scroll-driven petal stages restore after the later ambient orbit has run',()=>{
 const memory=createMemoryScene(),asset=new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial()),camera=new T.PerspectiveCamera(48,.46,.2,2400);
 memory.install(asset,'garden','rose');
 const shot=t=>{memory.update({memoryPhase:2,eventIndex:2,nextT:t,particleEnding:true},camera,.04);memory.group.updateMatrixWorld(true);return {camera:camera.position.toArray(),matrices:memory.group.children.filter(o=>o.isInstancedMesh).flatMap(o=>Array.from(o.instanceMatrix.array))};};
 try{
  for(const t of [.1,.4,.65]){
   const initial=shot(t);for(let i=0;i<12;i++)shot(1);
   const restored=shot(t);assert.deepEqual(restored.camera,initial.camera);
   const error=Math.max(...restored.matrices.map((x,k)=>Math.abs(x-initial.matrices[k])));
   assert.equal(error,0,`scroll must restore the same scene at ${t}`);
  }
  assert.ok(memory.group.getObjectByName('ending-mark-depth'),'the rendered scene attaches the occlusion surface');
  memory.update({memoryPhase:2,eventIndex:2,nextT:1,particleEnding:false},camera,0);
  assert.equal(memory.group.getObjectByName('ending-mark-depth').visible,false,'legacy route keeps its previous visuals');
 }finally{memory.dispose();asset.geometry.dispose();asset.material.dispose();}
});
test('the actual scene keeps petals orbiting at a held final progress while the sculpture and camera hold',()=>{
 const memory=createMemoryScene(),asset=new T.Mesh(new T.SphereGeometry(2.2,8,6),new T.MeshStandardMaterial()),camera=new T.PerspectiveCamera(48,.46,.2,2400);memory.install(asset,'garden','rose');
 const update=()=>memory.update({memoryPhase:2,eventIndex:2,nextT:1,particleEnding:true},camera,.05);
 try{
  update();const pool=memory.group.children.find(o=>o.isInstancedMesh),before=Array.from(pool.instanceMatrix.array),view=camera.position.toArray();
  for(let i=0;i<100;i++)update();
  assert.deepEqual(camera.position.toArray(),view);assert.equal(memory.group.getObjectByName('ending-shape-swarm').material.uniforms.uT.value,1);
  const moved=Array.from(pool.instanceMatrix.array).some((x,k)=>Math.abs(x-before[k])>2);
  assert.ok(moved,'lifting the finger must not freeze the final petal orbit');
 }finally{memory.dispose();asset.geometry.dispose();asset.material.dispose();}
});
test('preparing the opt-in GPU ending rejects unsupported hardware without replacing the existing history scene',()=>{
 const memory=createMemoryScene();
 try{
  assert.equal(typeof memory.prepareParticleEnding,'function');
  const original=memory.group.getObjectByName('ending-shape-swarm');
  assert.throws(()=>memory.prepareParticleEnding({extensions:{has:()=>false}}),/浮点缓冲/);
  assert.equal(memory.particleEndingReady,false);
  assert.equal(memory.group.getObjectByName('ending-shape-swarm'),original);
 }finally{memory.dispose();}
});

test('history text has fully cleared before the opening particle streams become prominent',()=>{
 assert.equal(sampleNext(0,{particleEnding:true}).historyOpacity,1);
 assert.equal(sampleNext(1/18,{particleEnding:true}).historyOpacity,0,'no faint history text remains underneath the streams');
 assert.ok(sampleNext(.25/18,{particleEnding:true}).historyOpacity>0,'the exit still fades rather than vanishing at entry');
 assert.ok(sampleNext(1/16).historyOpacity>0,'legacy story-to-ending timing remains unchanged');
});
