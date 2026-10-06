import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {warmBiomeResources} from '../src/biome-warmup.js';
test('GPU uploads preserve every mesh while yielding once per bounded batch',async()=>{
 const scene=new T.Scene(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial();
 for(let i=0;i<12;i++)scene.add(new T.InstancedMesh(geometry,material,1));
 let frames=0,renders=0,target=null;
 const renderer={compileAsync:async()=>{},getRenderTarget:()=>target,setRenderTarget:t=>{target=t;},render:()=>{renders++;}};
 await warmBiomeResources(renderer,scene,async()=>{frames++;});
 assert.equal(renders,12);assert.equal(frames,3);assert.equal(target,null);
 assert.equal(scene.children.length,12);assert.ok(scene.children.every(m=>m.geometry===geometry&&m.material===material));
});
