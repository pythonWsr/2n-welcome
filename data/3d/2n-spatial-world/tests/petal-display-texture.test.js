import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createMemoryScene} from '../src/guild-memory-scene.js';
import {createCompanionship} from '../src/companionship.js';
const textured=()=>new T.Mesh(new T.BoxGeometry(2,.2,2),new T.MeshStandardMaterial({map:new T.DataTexture(new Uint8Array(16*16*4),16,16)}));
function atlas(source){source.material.map.generateMipmaps=true;source.material.map.minFilter=T.LinearMipmapLinearFilter;source.material.map.magFilter=T.LinearFilter;return source.material.map;}
test('every memory chapter samples the HD atlas without blending across UV islands',()=>{
 const source=textured(),original=atlas(source),memory=createMemoryScene(),camera=new T.PerspectiveCamera(48,.46,.2,2400);memory.install(source,'garden','rose');
 try{for(const memoryPhase of [0,1,2])for(const nextT of [undefined,0,.5,1]){
  memory.update({eventIndex:Math.round(memoryPhase),memoryPhase,nextT},camera,0);
  const map=memory.group.children.find(c=>c.isInstancedMesh).material.map;
  assert.equal(map.minFilter,T.LinearFilter,'fragmented display atlas must not use a mip chain');
  assert.equal(map.generateMipmaps,false);
  assert.equal(map.image,original.image,'preserve full-resolution original pixels');
  assert.equal(map.flipY,original.flipY,'retain GLB image orientation');
 }
 assert.equal(original.generateMipmaps,true,'shared ground texture must remain untouched');assert.equal(original.minFilter,T.LinearMipmapLinearFilter);
 }finally{memory.dispose();}
});
test('HD companion copies use the same safe sampler before story departure',()=>{
 const scene=new T.Scene(),root=new T.Group();root.name='florr-petal-assembly';scene.add(root);const ground=textured(),batch=new T.InstancedMesh(ground.geometry,ground.material,1);batch.setMatrixAt(0,new T.Matrix4().makeTranslation(166,-30,10));root.add(batch);
 const rig=createCompanionship(scene),display=textured(),original=atlas(display);rig.install(ground,'garden','rose');rig.installDisplay(display,'garden','rose');
 try{const map=rig.group.getObjectByName('companion-garden:rose').material.map;assert.equal(map.minFilter,T.LinearFilter);assert.equal(map.generateMipmaps,false);assert.equal(map.image,original.image);assert.notEqual(map,original);assert.equal(original.generateMipmaps,true);}finally{rig.dispose();}
});
test('the reviewed Compass needle face is also used before entering history',async()=>{
 const {readingQuaternion}=await import('../src/lookback.js');
 const scene=new T.Scene(),root=new T.Group();root.name='florr-jungle';scene.add(root);
 const ground=textured(),batch=new T.InstancedMesh(ground.geometry,ground.material,1);batch.setMatrixAt(0,new T.Matrix4().makeTranslation(166,-30,10));root.add(batch);
 const rig=createCompanionship(scene);rig.install(ground,'jungle','compass');rig.installDisplay(textured(),'jungle','compass');rig.update(1);
 try{const mesh=rig.group.getObjectByName('companion-jungle:compass'),matrix=new T.Matrix4();mesh.getMatrixAt(0,matrix);const rotation=new T.Quaternion().setFromRotationMatrix(matrix.extractRotation(matrix)).premultiply(readingQuaternion.clone().invert());assert.ok(new T.Vector3(0,0,-1).applyQuaternion(rotation).z>.9,'needle face must face the reading camera before departure');}finally{rig.dispose();}
});
