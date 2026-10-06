import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {gardenPose} from '../src/garden-path.js';
import {oceanPose,createOceanPetals} from '../src/ocean-production.js';
import {readFileSync} from 'node:fs';
test('Desert to Ocean keeps portrait height and incoming velocity continuous',()=>{
 for(const portrait of [false,true]){
  const a=gardenPose(.99999,new T.PerspectiveCamera(),portrait),b=gardenPose(1,new T.PerspectiveCamera(),portrait),c=oceanPose(0,new T.PerspectiveCamera(),portrait),d=oceanPose(.00001,new T.PerspectiveCamera(),portrait);
  for(const key of ['position','target']){
   assert.ok(new T.Vector3(...b[key]).distanceTo(new T.Vector3(...c[key]))<.001,`${key} cannot jump`);
   const before=new T.Vector3(...b[key]).sub(new T.Vector3(...a[key])).divideScalar(.00001*8);
   const after=new T.Vector3(...d[key]).sub(new T.Vector3(...c[key])).divideScalar(.00001*6);
   assert.ok(before.distanceTo(after)<.2,`${key} velocity discontinuity ${before.distanceTo(after)}`);
  }
 }
});
test('Ocean petals occupy the sand-blue transition instead of starting after it',()=>{
 const catalog=Object.fromEntries(['pearl','shell','starfish'].map(n=>[n,{geometry:new T.BoxGeometry(.1,.1,.02),material:new T.MeshStandardMaterial()}]));
 const group=createOceanPetals(catalog,true);const matrix=new T.Matrix4();let count=0;
 for(const mesh of group.children)for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);if(matrix.elements[12]>452&&matrix.elements[12]<520)count++;}
 assert.ok(count>=15,`transition has only ${count} petals`);
});
test('loading opening restores input after all five regions are ready and never re-locks',async()=>{
 const {createLoadingIntro}=await import('../src/loading-intro.js');
 const intro=createLoadingIntro(),base={allReady:false,reduced:false};
 assert.equal(intro.update(base).locked,true);
 assert.equal(intro.update({allReady:true}).locked,false);
 assert.equal(intro.update(base).locked,false,'never re-lock');
});
test('Jungle continues Ocean camera and supplies distinct grounded user models',async()=>{
 const {junglePose,createJunglePetals,jungleSurface}=await import('../src/jungle-production.js');
 const a=oceanPose(1,new T.PerspectiveCamera()),b=junglePose(0,new T.PerspectiveCamera());assert.deepEqual(a.position,b.position);assert.deepEqual(a.target,b.target);
 const catalog=Object.fromEntries(['peas','tomato','bur'].map(n=>[n,{geometry:new T.BoxGeometry(.1,.1,.02),material:new T.MeshStandardMaterial()}]));
 const group=createJunglePetals(catalog,true),m=new T.Matrix4(),v=new T.Vector3();let total=0;
 for(const mesh of group.children)for(let i=0;i<mesh.count;i++){total++;mesh.getMatrixAt(i,m);let min=Infinity;const a=mesh.geometry.attributes.position;for(let k=0;k<a.count;k++){v.fromBufferAttribute(a,k).applyMatrix4(m);min=Math.min(min,v.y-jungleSurface(v.x,v.z));}assert.ok(Math.abs(min+.05)<.002);}
 assert.ok(total>=150);assert.equal(new Set(group.children.map(m=>m.name.split('-')[1])).size,3);
});
test('temporary input gate cancels scrolling but preserves pinch and restores input',async()=>{
 const {attachIntroInput}=await import('../src/loading-intro.js');const target=new EventTarget();let locked=true,skipped=false;attachIntroInput(target,()=>locked,()=>{skipped=true;});
 const fire=(type,fields={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,fields);target.dispatchEvent(e);return e.defaultPrevented;};
 assert.equal(fire('touchmove',{touches:[{}]}),true);assert.equal(fire('touchmove',{touches:[{},{}]}),false);assert.equal(fire('wheel'),true);
 fire('keydown',{key:'Escape'});assert.equal(skipped,true);locked=false;assert.equal(fire('touchmove',{touches:[{}]}),false);assert.equal(fire('wheel'),false);
});
test('real Jungle GLBs remain grounded through all poses and camera joins preserve speed',async()=>{
 const {createJunglePetals,jungleSurface,junglePose}=await import('../src/jungle-production.js');
 const catalog=Object.fromEntries(['peas','tomato','bur'].map(name=>{const b=readFileSync(new URL(`../public/assets/jungle-petals/${name}.glb`,import.meta.url)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),off=28+b.readUInt32LE(12),a=j.accessors[j.meshes[0].primitives[0].attributes.POSITION],view=j.bufferViews[a.bufferView],values=new Float32Array(a.count*3);for(let i=0;i<values.length;i++)values[i]=b.readFloatLE(off+(view.byteOffset||0)+(a.byteOffset||0)+i*4);const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(values,3));return [name,{geometry,material:new T.MeshStandardMaterial()}];}));
 const group=createJunglePetals(catalog,true),m=new T.Matrix4(),v=new T.Vector3();
 for(const mesh of group.children)for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);let min=Infinity;const a=mesh.geometry.attributes.position;for(let k=0;k<a.count;k++){v.fromBufferAttribute(a,k).applyMatrix4(m);min=Math.min(min,v.y-jungleSurface(v.x,v.z));}assert.ok(Math.abs(min+.05)<.002,mesh.name);}
 const a=oceanPose(.99999,new T.PerspectiveCamera()),b=oceanPose(1,new T.PerspectiveCamera()),c=junglePose(0,new T.PerspectiveCamera()),d=junglePose(.00001,new T.PerspectiveCamera());
 for(const k of ['position','target']){const before=new T.Vector3(...b[k]).sub(new T.Vector3(...a[k])).divideScalar(.00001*6),after=new T.Vector3(...d[k]).sub(new T.Vector3(...c[k])).divideScalar(.00001*4);assert.ok(before.distanceTo(after)<.2);}
});
