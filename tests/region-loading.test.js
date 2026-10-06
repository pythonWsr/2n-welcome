import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as placement from '../src/petal-placement.js';
import {createBiomes} from '../src/biomes.js';
import {coastalColor,oceanPose} from '../src/ocean-production.js';
import {createJunglePetals} from '../src/jungle-production.js';

test('large support fitting yields to animation without changing contact or matrices',async()=>{
 assert.equal(typeof placement.placedPetalsAsync,'function');
 const asset={geometry:new T.SphereGeometry(1,40,30),material:new T.MeshStandardMaterial()};
 const pose=i=>({x:i*4,z:2,scale:1,pitch:-.7,yaw:.4,roll:.2}),height=(x,z)=>Math.sin(x*.1)+z*.05;
 let turns=0;
 const a=placement.placedPetals(asset,8,2,pose,height,'test');
 const b=await placement.placedPetalsAsync(asset,8,2,pose,height,'test',.05,{yield:async()=>{turns++;},budgetMs:0});
 assert.ok(turns>8,'yield inside a dense instance, not just between entire species');
 assert.deepEqual([...b.instanceMatrix.array],[...a.instanceMatrix.array]);
});
test('the production CPU queue lets timer/animation work proceed during placement',async()=>{
 const asset={geometry:new T.SphereGeometry(1,60,50),material:new T.MeshStandardMaterial()};let heartbeat=0;
 const timer=setInterval(()=>heartbeat++,0);
 try{const mesh=await placement.placedPetalsAsync(asset,20,3,i=>({x:i,z:2,scale:1,pitch:.8,yaw:.5,roll:.2}),(x,z)=>Math.sin(x)+Math.cos(z),'runtime');assert.equal(mesh.count,20);assert.ok(heartbeat>0,'preparation must not monopolize the event loop');}finally{clearInterval(timer);}
});
test('Jungle is already visible at the first Ocean shot',()=>{
 const scene=new T.Scene(),world=createBiomes(scene,true,{}),camera=new T.PerspectiveCamera();
 camera.position.set(305,3,-9);world.update(camera,1);
 assert.equal(scene.getObjectByName('florr-jungle').visible,true);
});
test('the first Jungle ground is green even at the shoreline',()=>{
 const c=coastalColor(910,0);assert.ok(c.g>c.b*1.6,`green ${c.g}, blue ${c.b}`);
});
test('small reused petals add gold and grey accents without replacing Jungle species',()=>{
 const names=['peas','tomato','bur','goldenleaf','rock'];
 const catalog=Object.fromEntries(names.map(n=>[n,{geometry:new T.BoxGeometry(1,1,.2),material:new T.MeshStandardMaterial()}]));
 const group=createJunglePetals(catalog,true),counts={};
 for(const m of group.children){const n=m.name.split('-')[1];counts[n]=(counts[n]||0)+m.count;}
 assert.ok(counts.goldenleaf>=6&&counts.rock>=6);assert.equal(counts.peas,78);
 assert.ok(counts.goldenleaf+counts.rock<30,'accents stay secondary');
});
test('regional fog keeps distant Jungle green without tinting nearby Ocean green',async()=>{
 const fog=await import('../src/regional-fog.js');
 const ocean=new T.Color(0x1d485d);
 const near=fog.regionalFogColor(650,ocean),far=fog.regionalFogColor(1000,ocean);
 assert.ok(near.equals(ocean));assert.ok(far.g>far.b*1.3);
 const m=new T.MeshStandardMaterial();const patched=fog.withRegionalFog(m);assert.notEqual(patched,m);
 assert.equal(m.onBeforeCompile,T.Material.prototype.onBeforeCompile,'shared Garden material stays unchanged');
 assert.equal(typeof fog.regionalFogWeight,'function');
 assert.equal(fog.regionalFogWeight(650,.99),.99);
 assert.ok(fog.regionalFogWeight(1000,.99)<=.78,'distant Jungle still retains object contrast');
});
test('Jungle petals are in the portrait Ocean opening frustum, not just marked visible',()=>{
 const camera=new T.PerspectiveCamera(48,414/896,.2,900);oceanPose(.05,camera,true);camera.updateMatrixWorld();
 const catalog=Object.fromEntries(['peas','tomato','bur'].map(n=>[n,{geometry:new T.BoxGeometry(1,1,.2),material:new T.MeshStandardMaterial()}]));
 const group=createJunglePetals(catalog,true),matrix=new T.Matrix4(),v=new T.Vector3();let visible=0;
 for(const m of group.children)for(let i=0;i<m.count;i++){m.getMatrixAt(i,matrix);v.setFromMatrixPosition(matrix).project(camera);if(Math.abs(v.x)<1&&Math.abs(v.y)<1&&Math.abs(v.z)<1)visible++;}
 assert.ok(visible>=15,`only ${visible} Jungle petals in early Ocean framing`);
});
test('Hell preloads alongside Ocean even if Garden is pending',async()=>{
 const calls=[];let release;
 const {prepareBiomePetals}=await import('../src/biomes.js');
 const world=createBiomes(new T.Scene(),true,{garden:()=>new Promise(r=>release=r),desert:async()=>({}),ocean:async()=>{calls.push('ocean');return {};},jungle:async()=>{calls.push('jungle');return {};},hell:async()=>{calls.push('hell');return {};}});
 const loading=prepareBiomePetals(world);assert.deepEqual(calls,['ocean','jungle','hell']);release({});await loading;
 assert.equal(world.hellPetalStatus,'ready');
});
test('Hell camera joins Jungle with continuous position and velocity',async()=>{
 const {hellPose}=await import('../src/hell-production.js'),{junglePose}=await import('../src/jungle-production.js');
 const camera=new T.PerspectiveCamera(),a=junglePose(.99999,camera),b=junglePose(1,camera),c=hellPose(0,camera),d=hellPose(.00001,camera);
 for(const key of ['position','target']){assert.deepEqual(b[key],c[key]);const before=new T.Vector3(...b[key]).sub(new T.Vector3(...a[key])).divideScalar(.00001),after=new T.Vector3(...d[key]).sub(new T.Vector3(...c[key])).divideScalar(.00001);assert.ok(before.distanceTo(after)<.3);}
});
test('Hell uses real grounded petal meshes including the populated exit corridor',async()=>{
 const {createHellPetals,hellSurface}=await import('../src/hell-production.js');
 const {readFileSync}=await import('node:fs');const catalog={};
 for(const name of ['darkmark','corruption']){const b=readFileSync(new URL(`../public/assets/hell-petals/${name}.glb`,import.meta.url)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),off=28+b.readUInt32LE(12),a=j.accessors[j.meshes[0].primitives[0].attributes.POSITION],view=j.bufferViews[a.bufferView];const values=new Float32Array(a.count*3);for(let i=0;i<values.length;i++)values[i]=b.readFloatLE(off+(view.byteOffset||0)+(a.byteOffset||0)+i*4);const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(values,3));catalog[name]={geometry,material:new T.MeshStandardMaterial()};}
 const group=createHellPetals(catalog,true),m=new T.Matrix4(),v=new T.Vector3();let total=0;
 assert.ok(group.children.length>=6);
 for(const mesh of group.children)for(let i=0;i<mesh.count;i++){total++;mesh.getMatrixAt(i,m);let contact=Infinity;const a=mesh.geometry.attributes.position;for(let j=0;j<a.count;j++){v.fromBufferAttribute(a,j).applyMatrix4(m);contact=Math.min(contact,v.y-hellSurface(v.x,v.z));}assert.ok(Math.abs(contact+.05)<.002,mesh.name);}
 assert.ok(total>=280);assert.ok(total<=310);
});
