import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createEndingParticles,endingPetalFrame,endingPetalPoint} from '../src/guild-ending-particles.js';
import {createMemoryLayout,memoryPoint} from '../src/guild-memory-layout.js';
import {createMemoryScene} from '../src/guild-memory-scene.js';
const pose={position:[-4,7,198],target:[0,0,-14]};
test('new petals form one loose lower band instead of three stacked rings',()=>{
 const layout=createMemoryLayout({assets:[{key:'rose',radius:2.2}]}),slots=endingPetalFrame(pose,.46,layout.anchors);
 for(const time of [0,9,23,45]){
  const points=layout.anchors.map(a=>endingPetalPoint(a,memoryPoint(a,2),1,time,false,slots));
  const heights=points.map(p=>p[1]),radii=points.map(p=>Math.hypot(p[0]/(.46/.75),p[2]+14));
  assert.ok(Math.min(...heights)>12&&Math.max(...heights)<30,'all petals stay in the former bottom band');
  assert.ok(Math.max(...heights)-Math.min(...heights)>5,'a loose band has small height variation');
  assert.ok(Math.max(...radii)-Math.min(...radii)>8,'radii vary rather than forming a rigid circle');
 }
});
test('new formation bypasses legacy scattered landing positions while the legacy mode retains them',()=>{
 const layout=createMemoryLayout({assets:[{key:'rose',radius:2.2}]}),slots=endingPetalFrame(pose,.46,layout.anchors);
 const moved=new Map([...slots].map(([id,s])=>[id,{...s,position:s.position.clone().add(new T.Vector3(300,500,-200))}]));
 for(const t of [.72,.8,.86,.9,.94])for(const a of layout.anchors){
  const start=memoryPoint(a,2),p=endingPetalPoint(a,start,t,0,false,slots),q=endingPetalPoint(a,start,t,0,false,moved);
  assert.ok(Math.hypot(...p.map((v,k)=>v-q[k]))<1e-8,`legacy landing must not pull new petals away at ${t}`);
 }
 const a=layout.anchors[0],start=memoryPoint(a,2);
 const p=endingPetalPoint(a,start,.85,0,false,slots,false),q=endingPetalPoint(a,start,.85,0,false,moved,false);
 assert.ok(Math.hypot(...p.map((v,k)=>v-q[k]))>100,'legacy ending keeps its own destination');
});
test('the new orbit keeps the rendered petals inside narrow and wide camera frames',()=>{
 for(const aspect of [.35,.46,.6,1.8]){
  const memory=createMemoryScene({mobile:aspect<1}),asset=new T.Mesh(new T.SphereGeometry(2.2,8,6),new T.MeshStandardMaterial()),camera=new T.PerspectiveCamera(48,aspect,.2,2400);memory.install(asset,'garden','rose');
  try{for(const t of [.95,.975,1]){
   memory.update({memoryPhase:2,eventIndex:2,nextT:t,particleEnding:true},camera,0);
   for(const pool of memory.group.children.filter(o=>o.isInstancedMesh))for(let i=0;i<pool.count;i++){
    const matrix=new T.Matrix4();pool.getMatrixAt(i,matrix);const point=new T.Vector3().setFromMatrixPosition(matrix).project(camera);
    assert.ok(Math.abs(point.x)<.95&&Math.abs(point.y)<.95,`orbit must fit aspect ${aspect}, t=${t}, x=${point.x}, y=${point.y}`);
   }
  }}finally{memory.dispose();asset.geometry.dispose();asset.material.dispose();}
 }
});
test('formed petals travel slowly through front/back depth while vertical travel stays small',()=>{
 const layout=createMemoryLayout({assets:[{key:'rose',radius:2.2}]}),slots=endingPetalFrame(pose,.46,layout.anchors);
 let front=0,back=0;
 for(const a of layout.anchors){
  const start=memoryPoint(a,2),p=endingPetalPoint(a,start,1,0,false,slots),q=endingPetalPoint(a,start,1,5,false,slots);
  const distance=Math.hypot(...p.map((v,k)=>v-q[k]));
  assert.ok(distance>5&&distance<55,'a five-second idle continues a slow orbit');
  assert.ok(Math.abs(q[1]-p[1])<6,'the orbit moves through depth, not a vertical wheel');
  assert.ok(p[0]*(q[2]+14)-(p[2]+14)*q[0]>0,'right side moves toward the viewer in a clockwise horizontal orbit');
  if(p[2]>2)front++;if(p[2]<-30)back++;
 }
 assert.ok(front>5&&back>5,'the orbit occupies both sides of the model');
});
test('reversing after a long idle keeps the lower orbit open instead of collapsing antipodal endpoints',()=>{
 const memory=createMemoryScene(),asset=new T.Mesh(new T.SphereGeometry(2.2,8,6),new T.MeshStandardMaterial()),camera=new T.PerspectiveCamera(48,.46,.2,2400);memory.install(asset,'garden','rose');
 const points=()=>memory.group.children.filter(o=>o.isInstancedMesh).flatMap(pool=>Array.from({length:pool.count},(_,i)=>{const matrix=new T.Matrix4();pool.getMatrixAt(i,matrix);return new T.Vector3().setFromMatrixPosition(matrix);}));
 try{
  for(let i=0;i<449;i++)memory.update({memoryPhase:2,eventIndex:2,nextT:1,particleEnding:true},camera,.05);
  let before=points();
  // The formed orbit now begins after the post-sculpture arrival at 17.8s.
  // Earlier progress intentionally rewinds that arrival into the escort.
  for(let tick=1;tick<=12;tick++){
   const t=1-tick/1080;memory.update({memoryPhase:2,eventIndex:2,nextT:t,particleEnding:true},camera,1/60);
   const current=points(),radius=current.reduce((sum,p)=>sum+Math.hypot(p.x/(.46/.75),(p.z+14)/.9),0)/current.length;
   assert.ok(radius>40,`the formed band stays around the mark during rewind at ${t}: ${radius}`);
   assert.ok(Math.max(...current.map((p,i)=>p.distanceTo(before[i])))<3,'rewind cannot yank petals across the center in a frame');
   before=current;
  }
 }finally{memory.dispose();asset.geometry.dispose();asset.material.dispose();}
});
test('the formed particle sculpture owns its exact depth-only occluder and releases it',()=>{
 const swarm=createEndingParticles(),camera=new T.PerspectiveCamera(48,.46),mask=swarm.occluder;
 try{
  assert.ok(mask?.isGroup,'surface-sampled particles need a matching solid depth mask for petal occlusion');
  const resources=new Set();mask.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material){resources.add(o.material);assert.equal(o.material.colorWrite,false);assert.equal(o.material.depthWrite,true);assert.equal(o.material.depthTest,true);}});
  let disposed=0;for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
  swarm.update(.7,0,camera,false,true);assert.equal(mask.visible,false);
  swarm.update(1,0,camera,false,true);assert.equal(mask.visible,true);mask.updateMatrixWorld(true);
  const actual=new T.Box3().setFromObject(mask),geometry=swarm.points.geometry;geometry.computeBoundingBox();
  const scale=Math.min(1.12,camera.aspect*1.75),box=geometry.boundingBox.clone();box.min.multiplyScalar(scale).add(new T.Vector3(0,43,-14));box.max.multiplyScalar(scale).add(new T.Vector3(0,43,-14));
  assert.ok(actual.min.distanceTo(box.min)<.2&&actual.max.distanceTo(box.max)<.2,'depth shell matches the original sculpture at the rendered scale');
  swarm.update(.7,0,camera,false,true);assert.equal(mask.visible,false,'reverse removes the mask before the model disperses');
  swarm.update(1,0,camera,false,false);assert.equal(mask.visible,false,'the default legacy ending does not acquire an occlusion surface');
  swarm.dispose();assert.equal(disposed,resources.size);
 }finally{swarm.dispose();}
});
