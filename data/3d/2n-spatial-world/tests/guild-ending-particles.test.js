import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createEndingParticles,ENDING_PARTICLE_COUNT,endingFrame,endingCamera,endingPetalFrame,endingPetalPoint} from '../src/guild-ending-particles.js';
import {createMonument} from '../src/monument.js';
import {createMemoryLayout,memoryPoint} from '../src/guild-memory-layout.js';
import * as ending from '../src/guild-ending-particles.js';
const pose={position:[-4,7,198],target:[0,0,-14]};
// Catch a regression to a flat disk or repeated radial petal silhouette.
test('nebula occupies irregular separated volumes with genuine depth',()=>{
 assert.equal(typeof ending.endingNebulaPoint,'function');
 const points=[];for(let i=0;i<3000;i++)points.push(ending.endingNebulaPoint((i*.61803398875)%1,(i*.41421356237)%1,(i*.73205080757)%1,i%5));
 for(const axis of [0,1,2]){const a=points.map(p=>p[axis]);assert.ok(Math.max(...a)-Math.min(...a)>60,'cloud is not planar');}
 const lower=ending.endingNebulaPoint(.2,.4,0,0),upper=ending.endingNebulaPoint(.2,.4,0,2);
 assert.ok(upper[1]-lower[1]>45);assert.ok(Math.abs(upper[2]-lower[2])>6);
 assert.ok(points.every(p=>p.every(Number.isFinite)));
});
test('cloud establishes briefly, moves through dimensions and gathers before the reading hold',()=>{
 assert.equal(endingFrame(0).cloud,0);assert.ok(endingFrame(.1).cloud>0&&endingFrame(.1).cloud<1);
 for(const t of [.25,.4]){assert.equal(endingFrame(t).cloud,1);assert.equal(endingFrame(t).glyph,0);}
 assert.equal(endingFrame(.73).glyph,0);assert.ok(endingFrame(.85).glyph>0);assert.equal(endingFrame(.90).glyph,1);assert.equal(endingFrame(1).glyph,1);
});
test('ending keeps the reference-scale swarm on every device and releases GPU resources',()=>{
 const swarm=createEndingParticles(),cam=new T.PerspectiveCamera(48,.46);assert.equal(ENDING_PARTICLE_COUNT,262144);assert.equal(swarm.points.geometry.getAttribute('position').count,262144);
 assert.equal(swarm.points.material.blending,T.NormalBlending);
 assert.ok(Array.from(swarm.points.geometry.getAttribute('position').array).every(Number.isFinite));
 swarm.update(undefined,0,cam);assert.equal(swarm.points.visible,false);swarm.update(.7,2,cam);assert.equal(swarm.points.visible,true);
 assert.equal(swarm.points.material.uniforms.uAspect.value,.46);let released=0;swarm.points.geometry.addEventListener('dispose',()=>released++);swarm.points.material.addEventListener('dispose',()=>released++);swarm.dispose();assert.equal(released,2);
});
test('shape progression reverses deterministically and the camera enters continuously then settles',()=>{
 assert.deepEqual(endingCamera(pose,0),pose);const first=endingFrame(.4);endingFrame(.9);assert.deepEqual(endingFrame(.4),first);
 assert.ok(endingFrame(.3).glyph===0&&endingFrame(1).glyph===1);assert.ok(endingFrame(.5).light>endingFrame(1).light);
 let previous=endingCamera(pose,0);for(let i=1;i<=1000;i++){const current=endingCamera(pose,i/1000);assert.ok(Math.hypot(...current.position.map((v,k)=>v-previous.position[k]))<2);previous=current;}
 assert.ok(Math.abs(endingCamera(pose,.5).position[0])>40);assert.ok(Math.abs(endingCamera(pose,1).position[0])<1e-8);
});
test('legacy petal handoff retains original centers and ends in a readable volume in portrait and landscape',()=>{
 for(const aspect of [.46,.6,1.8]){
  const layout=createMemoryLayout({assets:[{key:'rose',radius:2.2}]}),slots=endingPetalFrame(pose,aspect,layout.anchors),end=endingCamera(pose,1),cam=new T.PerspectiveCamera(48,aspect);cam.position.fromArray(end.position);cam.lookAt(...end.target);cam.updateMatrixWorld();
  const depths=[];for(const a of layout.anchors){const start=memoryPoint(a,2);assert.deepEqual(endingPetalPoint(a,start,0,0,false,slots,false),start);
   const point=new T.Vector3(...endingPetalPoint(a,start,1,0,true,slots,false)),screen=point.clone().project(cam);assert.ok(Math.abs(screen.x)<1&&screen.y>-.4&&screen.y<.9);depths.push(-point.applyMatrix4(cam.matrixWorldInverse).z);
   assert.deepEqual(endingPetalPoint(a,start,1,0,true,slots,false),endingPetalPoint(a,start,1,40,true,slots,false));
  }assert.ok(Math.max(...depths)-Math.min(...depths)>150);
 }
});

test('particle mark preserves the opening sculpture bounds and superscript n rather than a new font',()=>{
 const monument=createMonument(),original=new T.Box3().setFromObject(monument),center=original.getCenter(new T.Vector3());original.translate(center.clone().negate());
 const swarm=createEndingParticles();swarm.points.geometry.computeBoundingBox();const sampled=swarm.points.geometry.boundingBox;
 for(const axis of ['x','y','z']){assert.ok(Math.abs(sampled.min[axis]-original.min[axis])<.1);assert.ok(Math.abs(sampled.max[axis]-original.max[axis])<.1);}
 const points=swarm.points.geometry.getAttribute('position'),nBox=monument.children[1].geometry.boundingBox.clone().translate(center.clone().negate());let nCount=0;
 for(let i=0;i<points.count;i++){const p=new T.Vector3().fromBufferAttribute(points,i);if(p.x>nBox.min.x-.01){assert.ok(p.y>=nBox.min.y-.01,'n stays in its original superscript height band');nCount++;}}
 assert.ok(nCount>15000&&nCount<points.count/2);assert.equal(swarm.points.geometry.getAttribute('aNormal').count,points.count);swarm.dispose();monument.traverse(o=>o.geometry?.dispose());monument.children[0].material.dispose();
});

test('standalone scene entry actually attaches and activates the particle system at all ending stages',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');
 const scene=createMemoryScene(),source=new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial());scene.install(source,'garden','rose');
 const cam=new T.PerspectiveCamera(48,.46,.2,2400);
 for(const nextT of [.15,.45,.7,1]){scene.update({memoryPhase:2,eventIndex:2,nextT},cam,0);
  const swarm=scene.group.getObjectByName('ending-shape-swarm');assert.ok(swarm?.isPoints&&swarm.visible);assert.equal(swarm.geometry.getAttribute('position').count,262144);assert.equal(swarm.material.uniforms.uT.value,nextT);
 }
 scene.dispose();source.geometry.dispose();source.material.dispose();
});
test('memory scene renders dimension scaffolds only in their stage and replay restores them',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');
 const scene=createMemoryScene(),source=new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial());scene.install(source,'garden','rose');
 const cam=new T.PerspectiveCamera(48,.46,.2,2400);scene.update({memoryPhase:2,eventIndex:2,nextT:.35},cam,0);
 const frames=scene.group.getObjectByName('ending-dimension-frames');assert.ok(frames?.visible,'actual scene must attach frames');
 const resources=new Set();frames.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});let released=0;for(const r of resources)r.addEventListener('dispose',()=>released++);
 scene.update({memoryPhase:2,eventIndex:2,nextT:1},cam,0);assert.equal(frames.visible,false);
 scene.update({memoryPhase:2,eventIndex:2,nextT:.35},cam,0);assert.equal(frames.visible,true);
 scene.update({memoryPhase:2,eventIndex:2},cam,0);assert.equal(frames.visible,false);
 scene.dispose();assert.equal(released,resources.size);source.geometry.dispose();source.material.dispose();
});
test('reduced-motion scene enters continuously without sustained camera orbit or vertical excursion',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');const scene=createMemoryScene(),source=new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial());scene.install(source,'garden','rose');
 const cam=new T.PerspectiveCamera(48,.46,.2,2400);
 for(const nextT of [.3,.4,.5,.65,1]){scene.update({memoryPhase:2,eventIndex:2,nextT,reducedMotion:true},cam,0);assert.ok(Math.abs(cam.position.x)<1e-8);assert.equal(cam.position.y,34);}
 assert.deepEqual(endingCamera(pose,0,true),pose);assert.deepEqual(endingCamera(pose,1,true),endingCamera(pose,1));
 let prev=endingCamera(pose,0,true);for(let i=1;i<=1000;i++){const p=endingCamera(pose,i/1000,true);assert.ok(Math.hypot(...p.position.map((v,k)=>v-prev.position[k]))<2);prev=p;}
 scene.dispose();source.geometry.dispose();source.material.dispose();
});
