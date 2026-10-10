import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readPetalGeometry} from '../scripts/petal-geometry.mjs';
import {createMemoryScene} from '../src/guild-memory-scene.js';
// Feature directions independently reviewed from the 14 display GLBs with
// per-pixel UV sampling, back-face culling and a depth buffer, not box axes.
const fronts=[
 ['garden','rose',[0,-1,0],[0,0,1]],
 ['garden','clover',[0,1,0],[0,0,-1]],
 ['garden','goldenleaf',[0,0,-1],[0,1,0]],
 ['desert','cactus',[0,0,-1],[0,1,0]],
 ['desert','sand',[0,0,-1],[0,1,0]],
 ['desert','iris',[0,0,-1],[0,1,0]],
 ['ocean','pearl',[0,0,-1],[0,1,0]],
 ['ocean','shell',[0,0,-1],[0,1,0]],
 ['ocean','starfish',[0,0,1],[0,1,0]],
 ['jungle','peas',[0,0,1],[0,1,0]],
 ['jungle','tomato',[0,0,1],[0,1,0]],
 ['jungle','compass',[0,0,-1],[0,1,0]],
 ['hell','darkmark',[0,0,-1],[0,1,0]],
 ['hell','corruption',[0,0,-1],[0,1,0]],
];
for(const [kind,name,front,up] of fronts)test(`${name} presents its reviewed feature face through ending motion`,()=>{
 const source=readPetalGeometry(new URL(`../public/assets/companion-display/${name}.glb`,import.meta.url));
 const scene=createMemoryScene();scene.install(source,kind,name);
 const camera=new T.PerspectiveCamera(48,.46,.2,2400),matrix=new T.Matrix4(),rotation=new T.Quaternion();
 try{for(const nextT of [0,.25,.65,1])for(let frame=0;frame<35;frame++){
  scene.update({eventIndex:2,memoryPhase:2,nextT},camera,.05);
  const mesh=scene.group.children.find(c=>c.isInstancedMesh);
  for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);rotation.setFromRotationMatrix(matrix.extractRotation(matrix));rotation.premultiply(camera.quaternion.clone().invert());
   const normal=new T.Vector3(...front).applyQuaternion(rotation),upright=new T.Vector3(...up).applyQuaternion(rotation);
   assert.ok(normal.z>.82,`${name}: feature face turned away, z=${normal.z}`);
   assert.ok(upright.y>.8,`${name}: feature is upside down, y=${upright.y}`);
  }
 }}finally{scene.dispose();source.geometry.dispose();source.material.dispose();}
});
