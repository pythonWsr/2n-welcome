import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {lookbackPose,flowerPose} from '../src/lookback.js';
import {createCompanionship} from '../src/companionship.js';
test('return traversal has no per-region near-stationary viewing windows',()=>{
 for(let t=.18;t<=.70;t+=.001){
  const a=lookbackPose(t,new T.PerspectiveCamera()).position,b=lookbackPose(t+.00001,new T.PerspectiveCamera()).position;
  const speed=new T.Vector3(...a).distanceTo(new T.Vector3(...b))/.00001;
  assert.ok(speed>150,`camera nearly stops at ${t}: ${speed}`);
 }
});
test('gathering responds to rotation before a ring has formed',()=>{
 const a=flowerPose(0,.88,new T.Vector3(),undefined,0),b=flowerPose(0,.88,new T.Vector3(),undefined,.2);
 assert.ok(a.distanceTo(b)>1,'rotation starts only after gathering');
});
test('gathering spirals clockwise while its portrait radius contracts',()=>{
 const camera=new T.PerspectiveCamera(48,414/896,.2,2400);lookbackPose(1,camera);camera.updateMatrixWorld();
 for(let i=0;i<14;i++){
  const a=flowerPose(i,.88).project(camera),b=flowerPose(i,.92).project(camera);
  const ax=a.x/.74,ay=a.y/.64,bx=b.x/.74,by=b.y/.64;
  assert.ok(Math.hypot(bx,by)<Math.hypot(ax,ay),'radius does not contract');
  assert.ok(ax*by-ay*bx<0,'gathering does not turn clockwise');
 }
});
test('free flight joins gathering without a position jump',()=>{
 for(let i=0;i<14;i++){
  const start=.74+i*.002,a=flowerPose(i,start-.000001,new T.Vector3(),undefined,0,2),b=flowerPose(i,start,new T.Vector3(),undefined,0,2);
  assert.ok(a.distanceTo(b)<.01,`gather entry jumps for ${i}`);
 }
});
test('rig keeps gathering rotating while scroll is paused',()=>{
 const scene=new T.Scene(),root=new T.Group();root.name='florr-petal-assembly';scene.add(root);
 const source=new T.Mesh(new T.BoxGeometry(2,.2,2),new T.MeshStandardMaterial()),ground=new T.InstancedMesh(source.geometry,source.material,1);ground.setMatrixAt(0,new T.Matrix4().makeTranslation(166,-30,10));root.add(ground);
 const rig=createCompanionship(scene);rig.install(source,'garden','rose');const mesh=rig.group.getObjectByName('companion-garden:rose'),m=new T.Matrix4();
 rig.update(.88);mesh.getMatrixAt(0,m);const before=Array.from(m.elements);
 for(let i=0;i<40;i++)rig.update(.88,.05);
 mesh.getMatrixAt(0,m);assert.notDeepEqual(Array.from(m.elements),before);rig.dispose();
});
