import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {flowerPose,flowerReveal,lookbackPose} from '../src/lookback.js';
import {createHellPetals} from '../src/hell-production.js';
import * as loader from '../src/petal-loader.js';
test('Hell turn entry keeps populated ground ahead throughout the first turn',()=>{
 const catalog=Object.fromEntries(['darkmark','corruption'].map(n=>[n,new T.Mesh(new T.BoxGeometry(1,.3,1),new T.MeshStandardMaterial())]));
 const ground=createHellPetals(catalog,true),m=new T.Matrix4();
 for(const t of [0,.01,.02,.03,.045]){
  const cam=new T.PerspectiveCamera(48,414/896,.2,2400);lookbackPose(t,cam);cam.updateMatrixWorld();let count=0;
  ground.traverse(o=>{if(o.isInstancedMesh)for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);const p=new T.Vector3().setFromMatrixPosition(m).project(cam);if(Math.abs(p.x)<.9&&Math.abs(p.y)<.85&&p.z>-1&&p.z<1)count++;}});
  assert.ok(count>=10,`empty Hell turn at ${t}: ${count}`);
 }
});
test('free flight changes altitude and lateral position while scrolling is paused',()=>{
 const a=flowerPose(12,.3,new T.Vector3(),undefined,0,0),b=flowerPose(12,.3,new T.Vector3(),undefined,0,2);
 assert.ok(Math.abs(a.y-b.y)>2);assert.ok(Math.abs(a.z-b.z)>2);
 assert.deepEqual(flowerPose(12,flowerReveal(12),new T.Vector3(),undefined,0,2),flowerPose(12,flowerReveal(12)));
});
test('flight size grows gradually from the exact grounded size',async()=>{
 const {flightGrowth}=await import('../src/companionship.js');
 assert.equal(typeof flightGrowth,'function');
 assert.equal(flightGrowth(0),1);assert.ok(flightGrowth(.01)>1);assert.ok(flightGrowth(.08)>flightGrowth(.01));assert.ok(flightGrowth(.2)>=1.5);
});
test('rig keeps free flight moving on paused scroll and preserves ground on reversal',async()=>{
 const {createCompanionship}=await import('../src/companionship.js');
 const scene=new T.Scene(),root=new T.Group();root.name='florr-hell';scene.add(root);
 const source=new T.Mesh(new T.BoxGeometry(2,.2,2),new T.MeshStandardMaterial()),ground=new T.InstancedMesh(source.geometry,source.material,1),native=new T.Matrix4().makeTranslation(1470,-30,10);ground.setMatrixAt(0,native);root.add(ground);
 const rig=createCompanionship(scene);rig.install(source,'hell','darkmark');const flying=rig.group.getObjectByName('companion-hell:darkmark'),m=new T.Matrix4();
 rig.update(.3);flying.getMatrixAt(0,m);const initial=new T.Vector3().setFromMatrixPosition(m);
 for(let i=0;i<40;i++)rig.update(.3,.05);
 flying.getMatrixAt(0,m);assert.ok(initial.distanceTo(new T.Vector3().setFromMatrixPosition(m))>2);
 rig.update(0);ground.getMatrixAt(0,m);assert.deepEqual(m.toArray(),native.toArray());rig.dispose();
});
test('network continues fetching while model decoding is occupied',async()=>{
 assert.equal(typeof loader.createPetalPipeline,'function');
 let release;const decodeBlocked=new Promise(r=>release=r),started=[];
 const pipeline=loader.createPetalPipeline(4,1);
 const jobs=Array.from({length:6},(_,i)=>pipeline(async()=>{started.push(i);return i;},async value=>{await decodeBlocked;return value;}));
 await new Promise(r=>setTimeout(r,15));assert.equal(started.length,6);release();assert.deepEqual(await Promise.all(jobs),[0,1,2,3,4,5]);
});
