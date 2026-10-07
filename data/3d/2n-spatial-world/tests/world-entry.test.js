import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createLoadingIntro} from '../src/loading-intro.js';
import {coastalColor} from '../src/ocean-production.js';
import {createHellPetals} from '../src/hell-production.js';

test('opening stays gated through slow and failed later regions until all regions are ready',()=>{
 const intro=createLoadingIntro(0);
 for(const state of [{now:20000,gardenReady:true,allReady:false},{now:60000,failed:true,allReady:false},{now:80000,reduced:true,allReady:false}])assert.equal(intro.update(state).locked,true);
 assert.equal(intro.update({now:90000,allReady:true}).locked,false);
});
test('Hell petals occupy red ground rather than the green Jungle half of the boundary',()=>{
 const catalog=Object.fromEntries(['darkmark','corruption'].map(n=>[n,{geometry:new T.BoxGeometry(1,1,.2),material:new T.MeshStandardMaterial()}]));
 const m=new T.Matrix4();for(const mesh of createHellPetals(catalog,true).children)for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);const c=coastalColor(m.elements[12],m.elements[14]);assert.ok(c.r>c.g*1.8,'red ground beneath Hell petal');}
});
test('Jungle palette is grass green rather than blue mint, and Hell is strong game red',()=>{
 const green=coastalColor(1050,0),red=coastalColor(1500,0);
 const g=green.clone().convertLinearToSRGB(),r=red.clone().convertLinearToSRGB();
 assert.ok(g.g>g.b*1.8&&g.g>g.r*1.6);assert.ok(g.b<.38);
 assert.ok(r.r>.58&&r.r>r.g*2.3&&r.r>r.b*2.3);
});
test('region names are perspective objects anchored in the world and move under camera travel',async()=>{
 const {createRegionNames}=await import('../src/region-names.js');
 const labels=createRegionNames(()=>new T.Texture()),camera=new T.PerspectiveCamera(48,.5,.2,900);
 labels.update(115);const garden=labels.group.children[0];assert.ok(garden.isSprite&&garden.visible);assert.equal(labels.group.children.length,5);
 camera.position.set(95,0,0);camera.lookAt(garden.position);camera.updateMatrixWorld();const a=garden.position.clone().project(camera);
 camera.position.z+=12;camera.lookAt(140,-35,0);camera.updateMatrixWorld();const b=garden.position.clone().project(camera);assert.ok(a.distanceTo(b)>.1,'label cannot stick to a screen coordinate');
 labels.update(1000);assert.equal(garden.visible,false);assert.equal(labels.group.children[3].visible,true);
});
test('Ocean/Jungle/Hell shots contain lateral arcs and altitude variation while remaining above terrain',async()=>{
 const {oceanPose}=await import('../src/ocean-production.js'),{junglePose}=await import('../src/jungle-production.js'),{hellPose}=await import('../src/hell-production.js'),{worldHeight}=await import('../src/world-surface.js');
 for(const path of [oceanPose,junglePose,hellPose]){const samples=Array.from({length:101},(_,i)=>path(i/100,new T.PerspectiveCamera()));const z=samples.map(s=>s.position[2]),y=samples.map(s=>s.position[1]);assert.ok(Math.max(...z)-Math.min(...z)>45);assert.ok(Math.max(...y)-Math.min(...y)>18);for(const s of samples)assert.ok(s.position[1]-worldHeight(s.position[0],s.position[2])>25);}
});
test('offscreen warmup includes every biome batch and restores renderer target without changing live visibility',async()=>{
 const {warmBiomeResources}=await import('../src/biome-warmup.js');const scene=new T.Scene();scene.environment=new T.Texture();
 for(let i=0;i<5;i++){const batch=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial(),3);batch.name=`biome-${i}`;batch.visible=false;scene.add(batch);}
 const old=new T.WebGLRenderTarget(2,2);let target=old,draws=0,env=false;
 const renderer={getRenderTarget:()=>target,setRenderTarget:t=>target=t,compileAsync:async s=>{env=s.environment===scene.environment;},render:s=>{draws+=s.children.filter(m=>m.isMesh&&m.visible).length;}};
 await warmBiomeResources(renderer,scene,async()=>{});assert.equal(draws,5);assert.equal(target,old);assert.equal(env,true);assert.ok(scene.children.every(o=>!o.visible));
});
