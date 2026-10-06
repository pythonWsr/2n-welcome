import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {applyMemoryEntry,memoryEntryProgress} from '../src/guild-memory-entry.js';
import {sampleMemoryStory} from '../src/guild-memory-layout.js';
const entry={position:[140,60,-150],target:[140,20,-220],up:[0,1,0]};
function shot(u){const camera=new T.PerspectiveCamera(48,414/896,.2,2400),group=new T.Group();camera.position.set(0,3,190);camera.lookAt(0,0,-14);camera.updateMatrixWorld();applyMemoryEntry(camera,group,entry,u);return {camera,group};}
test('departure starts at the member camera, lifts out, arrives continuously and reverses',()=>{
 const start=shot(0),lift=shot(.6),end=shot(1);assert.deepEqual(start.camera.position.toArray(),entry.position);
 assert.ok(lift.camera.position.y>entry.position[1]+40);assert.ok(end.camera.position.x>entry.position[0]+200);assert.ok(end.camera.position.y>entry.position[1]+150);
 for(const u of [.2,.6,.9]){assert.ok(shot(u-1e-6).camera.position.distanceTo(shot(u+1e-6).camera.position)<.01);assert.deepEqual(shot(u).camera.position.toArray(),shot(u).camera.position.toArray());}
 const frame=shot(1).group.matrix;
 for(const u of [0,.3,.6,.9,1])assert.ok(shot(u).group.matrix.equals(frame),'story frame stays fixed in world space');
 assert.equal(memoryEntryProgress(0),0);assert.equal(memoryEntryProgress(7/36),1);
 assert.equal(sampleMemoryStory(6.9/36).eventOpacity,0);assert.equal(sampleMemoryStory(7/36).eventOpacity,0);assert.equal(sampleMemoryStory(8/36).eventOpacity,1);
});
test('map stays fixed and visible while the camera departs, then restores after drawing',async()=>{
 const {renderMemoryPreview}=await import('../src/guild-memory-preview.js');const scene=new T.Scene(),terrain=new T.Group(),oldChain=new T.Group(),group=new T.Group();scene.add(terrain,oldChain,group);group.visible=false;
 scene.fog=new T.FogExp2(0x63282e,.0036);const fog=scene.fog,terrainMatrix=terrain.matrix.clone();
 const camera=new T.PerspectiveCamera(),memory={group,setPreview(){},update(state){group.visible=true;assert.ok(state.entryPose);}};
 for(const progress of [0,.04,.1,.5,1]){renderMemoryPreview({scene,camera,memory,entryPose:entry,departureGroups:[oldChain],progress,renderer:{render(){assert.equal(terrain.visible,true);assert.equal(oldChain.visible,false);assert.equal(scene.fog,fog);assert.ok(terrain.matrix.equals(terrainMatrix));}},viewport:{width:414,height:896}});assert.equal(terrain.visible,true);assert.equal(oldChain.visible,true);}
});
test('existing HD chain instances start at their rendered world pose before traveling in world space',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');const geometry=new T.BoxGeometry(3,1,2),material=new T.MeshStandardMaterial();
 const memory=createMemoryScene();memory.install(new T.Mesh(geometry,material),'a','b');
 const old=new T.Group(),mesh=new T.InstancedMesh(geometry.clone().scale(.5,.5,.5),material,1);mesh.userData.assetKey="a:b";old.add(mesh);const initial=new T.Matrix4().compose(new T.Vector3(150,20,-230),new T.Quaternion(),new T.Vector3(2,2,2));mesh.setMatrixAt(0,initial);
 const camera=new T.PerspectiveCamera(48,414/896,.2,2400);camera.position.fromArray(entry.position);camera.up.fromArray(entry.up);camera.lookAt(...entry.target);memory.captureEntry(old,camera);
 memory.update({entryPose:entry,entryBlend:0,memoryPhase:0,eventIndex:0},camera,0);memory.group.updateMatrixWorld(true);
 const target=memory.group.children.find(c=>c.isInstancedMesh),matrix=new T.Matrix4();let found=false;
 for(let i=0;i<target.count;i++){target.getMatrixAt(i,matrix);matrix.premultiply(target.matrixWorld);if(new T.Vector3().setFromMatrixPosition(matrix).distanceTo(new T.Vector3().setFromMatrixPosition(initial))<1e-5){found=true;break;}}
 assert.ok(found,'cloned member geometry must retain its exact rendered world position');
 assert.ok(new T.Vector3().setFromMatrixPosition(matrix).distanceTo(new T.Vector3().setFromMatrixPosition(initial))<1e-5);assert.ok(new T.Vector3().setFromMatrixScale(matrix).distanceTo(new T.Vector3(1,1,1))<1e-5);
 assert.ok(camera.position.distanceTo(new T.Vector3(...entry.position))<1e-8);memory.dispose();
});
test('captured upper head travels right at visible height while camera departs',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');const memory=createMemoryScene();
 const geometry=new T.BoxGeometry(3,1,2),material=new T.MeshStandardMaterial();memory.install(new T.Mesh(geometry,material),'a','b');
 const camera=new T.PerspectiveCamera(48,414/896,.2,2400);camera.position.fromArray(entry.position);camera.lookAt(...entry.target);camera.updateMatrixWorld();
 const old=new T.Group(),mesh=new T.InstancedMesh(geometry.clone(),material,1);mesh.userData.assetKey='a:b';old.add(mesh);
 const depth=90,half=depth*Math.tan(T.MathUtils.degToRad(24));const start=new T.Vector3(.65*half*camera.aspect,.73*half,-depth).applyMatrix4(camera.matrixWorld);
 mesh.setMatrixAt(0,new T.Matrix4().compose(start,camera.quaternion,new T.Vector3(1,1,1)));memory.captureEntry(old,camera);
 let previous=-Infinity;
 for(const u of [0,.1,.2,.3,.4,.5,.7,.9,1]){
  memory.update({entryPose:entry,entryBlend:u,memoryPhase:0,eventIndex:0},camera,0);memory.group.updateMatrixWorld(true);
  const batch=memory.group.children.find(c=>c.isInstancedMesh),matrix=new T.Matrix4();batch.getMatrixAt(0,matrix);
  const screen=new T.Vector3().setFromMatrixPosition(matrix.premultiply(batch.matrixWorld)).project(camera);
  assert.ok(Math.abs(screen.y)<.9,'leader stays in visible vertical band');assert.ok(screen.x>=previous-.001,'leader must never reverse left');previous=screen.x;
 }
 memory.dispose();
});
test('camera first glides along terrain rather than lifting it rapidly out of view',()=>{
 const early=shot(.2).camera.position;assert.ok(early.y-entry.position[1]<22);
 assert.ok(early.x-entry.position[0]>45,'early motion is lateral travel');
 assert.equal(memoryEntryProgress(4/36)<1,true,'departure must last longer than the prior four-second exit');
});
test('handoff never manufactures followers when only six source instances exist',async()=>{
 const {createMemoryScene}=await import('../src/guild-memory-scene.js');const memory=createMemoryScene();
 const geometry=new T.BoxGeometry(3,1,2),material=new T.MeshStandardMaterial();memory.install(new T.Mesh(geometry,material),'a','b');
 const camera=new T.PerspectiveCamera(48,414/896,.2,2400);camera.position.fromArray(entry.position);camera.lookAt(...entry.target);camera.updateMatrixWorld();
 const old=new T.Group(),mesh=new T.InstancedMesh(geometry,material,6);mesh.userData.assetKey='a:b';old.add(mesh);
 const half=90*Math.tan(T.MathUtils.degToRad(24));
 for(let i=0;i<6;i++){const p=new T.Vector3([-.65,0,.65][i%3]*half*camera.aspect,(i<3?.73:-.73)*half,-90).applyMatrix4(camera.matrixWorld);mesh.setMatrixAt(i,new T.Matrix4().compose(p,camera.quaternion,new T.Vector3(1,1,1)));}
 memory.captureEntry(old,camera);assert.equal(memory.instanceCount,6);
 for(const u of [0,.1,.5,1,.5,0]){memory.update({entryPose:entry,entryBlend:u,memoryPhase:0,eventIndex:0},camera,0);assert.equal(memory.group.children.filter(c=>c.isInstancedMesh).reduce((n,c)=>n+c.count,0),6);}
 memory.dispose();
});
