import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import fs from 'node:fs';
import {createOceanGround,createOceanPetals,oceanHeight,oceanSurface,oceanPose,OCEAN_POPULATION} from '../src/ocean-production.js';
import {groundHeight} from '../src/biomes.js';
import {gardenPose} from '../src/garden-path.js';
function readGeometry(name){
 const b=fs.readFileSync(new URL(`../public/assets/ocean-petals/${name}.glb`,import.meta.url));const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));const off=28+b.readUInt32LE(12);const p=j.meshes[0].primitives[0];const a=j.accessors[p.attributes.POSITION],v=j.bufferViews[a.bufferView];const start=off+(v.byteOffset||0)+(a.byteOffset||0);const values=new Float32Array(a.count*3);for(let i=0;i<values.length;i++)values[i]=b.readFloatLE(start+i*4);const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(values,3));return {geometry,material:new T.MeshStandardMaterial()};
}
test('Ocean terrain meets the unchanged Desert endpoint',()=>{for(const z of [-365,-240,0,180,330])assert.equal(oceanHeight(520,z),groundHeight(520,z));assert.equal(createOceanGround().geometry.index.count/3,80*68*2);});
test('Ocean camera begins at the existing Desert shot',()=>{const a=gardenPose(1,new T.PerspectiveCamera()),b=oceanPose(0,new T.PerspectiveCamera());assert.deepEqual(a.position,b.position);assert.deepEqual(a.target,b.target);for(let t=0;t<=1;t+=.05){const p=oceanPose(t,new T.PerspectiveCamera()).position;assert.ok(p.every(Number.isFinite));assert.ok(p[1]>oceanSurface(p[0],p[2])+20);}});
test('Ocean uses the actual three supplied petal GLBs with varied poses and terrain contact',()=>{
 const catalog=Object.fromEntries(Object.keys(OCEAN_POPULATION).map(n=>[n,readGeometry(n)]));const world=createOceanPetals(catalog,true);let total=0;const matrix=new T.Matrix4(),v=new T.Vector3(),yaw=new Set();
 for(const mesh of world.children){total+=mesh.count;for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);yaw.add(matrix.elements[0].toFixed(3));const a=mesh.geometry.attributes.position;let min=Infinity;for(let k=0;k<a.count;k++){v.fromBufferAttribute(a,k).applyMatrix4(matrix);min=Math.min(min,v.y-oceanSurface(v.x,v.z));}assert.ok(Math.abs(min+.04)<.001,`${mesh.name} must contact terrain: ${min}`);}}
 assert.equal(total,300);assert.ok(yaw.size>200);
});

test('Shell and Pearl expose their broad faces rather than uniformly showing their edges',()=>{
 const catalog=Object.fromEntries(Object.keys(OCEAN_POPULATION).map(n=>[n,readGeometry(n)]));const world=createOceanPetals(catalog,true),matrix=new T.Matrix4(),normal=new T.Vector3(),position=new T.Vector3();
 for(const name of ['shell','pearl']){let broad=0,total=0;for(const mesh of world.children.filter(m=>m.name.includes(name)))for(let i=0;i<mesh.count;i++){
  mesh.getMatrixAt(i,matrix);normal.set(0,0,1).transformDirection(matrix);position.setFromMatrixPosition(matrix);
  const towardCamera=new T.Vector3(-75,45,0).normalize();if(normal.dot(towardCamera)>.75)broad++;total++;
 }assert.ok(broad/total>.7,`${name} broad face should be readable`);}
});
