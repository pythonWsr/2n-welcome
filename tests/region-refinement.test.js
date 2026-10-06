import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {preparedWorld} from './support/prepared-world.js';
import {createOceanGround,createOceanPetals,OCEAN_POPULATION,oceanPose} from '../src/ocean-production.js';
import {createJungleGround,createJunglePetals,JUNGLE_POPULATION,junglePose} from '../src/jungle-production.js';
import {createHellPetals,HELL_POPULATION,hellPose} from '../src/hell-production.js';
import {gardenPose} from '../src/garden-path.js';
import {createRegionNames} from '../src/region-names.js';
import {createLoadingIntro} from '../src/loading-intro.js';
import {worldHeight} from '../src/world-surface.js';
import {readFileSync} from 'node:fs';
import {jungleSurface} from '../src/jungle-production.js';
test('all prepared distant ground remains visible throughout world entry instead of threshold popping',async()=>{
 const scene=new T.Scene(),world=await preparedWorld(scene,true),camera=new T.PerspectiveCamera();
 for(const x of [80,234,236,279,281,734,736]){camera.position.x=x;world.update(camera,.2);for(const name of ['florr-ocean','florr-jungle','florr-hell'])assert.equal(scene.getObjectByName(name).visible,true,`${name} at ${x}`);}
});
test('Ocean and Jungle share the same shading contract at their adjoining edge',()=>{
 const a=createOceanGround().material,b=createJungleGround().material;assert.equal(a.type,b.type);assert.equal(a.toneMapped,b.toneMapped);
});
test('opening slow playback takes at least twice as long without bypassing preparation',()=>{const state=createLoadingIntro().update({allReady:false});assert.ok(state.speed<=.2&&state.speed>0);assert.ok(state.locked);});
test('mobile Ocean Jungle Hell have full populations and Compass is part of Jungle',()=>{
 const m=new T.Matrix4();
 for(const [population,build,minimum] of [[OCEAN_POPULATION,createOceanPetals,290],[JUNGLE_POPULATION,createJunglePetals,250],[HELL_POPULATION,createHellPetals,210]]){
 const catalog=Object.fromEntries(Object.keys(population).map(n=>[n,{geometry:new T.BoxGeometry(1,1,.3),material:new T.MeshStandardMaterial()}]));
 const world=build(catalog,true);assert.ok(world.children.reduce((n,b)=>n+b.count,0)>=minimum);
 if(build===createJunglePetals)assert.ok(world.children.some(m=>m.name.includes('compass')));
 if(build===createOceanPetals){const rotations=new Set();for(const batch of world.children.filter(m=>m.name.includes('starfish')))for(let i=0;i<batch.count;i++){batch.getMatrixAt(i,m);const q=new T.Quaternion();m.decompose(new T.Vector3(),q,new T.Vector3());rotations.add(q.toArray().map(v=>v.toFixed(1)).join(','));}assert.ok(rotations.size>60);}
 }
});
test('all five world titles are large and fully inside portrait safety margins while visible',()=>{
 for(const aspect of [390/844,414/896,16/9]){
 const camera=new T.PerspectiveCamera(48,aspect,.2,2400),labels=createRegionNames(name=>new T.Texture({width:name.length*82+64,height:192}));
 const coverage=new Map(),widths=new Map();
 for(const path of [gardenPose,oceanPose,junglePose,hellPose])for(let i=0;i<=200;i++){
 path(i/200,camera,aspect<1);camera.updateMatrixWorld();labels.update(camera);
 for(const label of labels.group.children)if(label.visible&&label.material.opacity>.05){const p=label.position.clone().project(camera),depth=label.position.clone().applyMatrix4(camera.matrixWorldInverse).z;const halfY=label.scale.y/(-depth*2*Math.tan(T.MathUtils.degToRad(24))),halfX=label.scale.x/(-depth*2*Math.tan(T.MathUtils.degToRad(24))*aspect);assert.ok(Math.abs(p.x)+halfX<.91,`${label.name} horizontal clipping`);assert.ok(Math.abs(p.y)+halfY<.81,`${label.name} vertical clipping`);coverage.set(label.name,(coverage.get(label.name)||0)+1);widths.set(label.name,Math.max(widths.get(label.name)||0,halfX));}
 }
 assert.equal(coverage.size,5);for(const [name,count] of coverage){assert.ok(count>=8,`${name} appears too briefly`);assert.ok(widths.get(name)>(aspect<1?.50:.35),`${name} too small`);}
 for(const label of labels.group.children)assert.ok(label.position.y-label.scale.y/2>worldHeight(label.position.x,label.position.z)+4,`${label.name} buried in ground`);
 }
});
test('all actual Compass instances touch the rendered Jungle surface',()=>{
 const b=readFileSync(new URL('../public/assets/jungle-petals/compass.glb',import.meta.url)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),off=28+b.readUInt32LE(12),a=j.accessors[j.meshes[0].primitives[0].attributes.POSITION],view=j.bufferViews[a.bufferView],values=new Float32Array(a.count*3);
 for(let i=0;i<values.length;i++)values[i]=b.readFloatLE(off+(view.byteOffset||0)+(a.byteOffset||0)+i*4);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(values,3));
 const world=createJunglePetals({compass:{geometry,material:new T.MeshStandardMaterial()}},true,['compass']),m=new T.Matrix4(),v=new T.Vector3();let total=0;
 for(const batch of world.children)for(let i=0;i<batch.count;i++){total++;batch.getMatrixAt(i,m);let contact=Infinity;for(let k=0;k<a.count;k++){v.fromBufferAttribute(geometry.attributes.position,k).applyMatrix4(m);contact=Math.min(contact,v.y-jungleSurface(v.x,v.z));}assert.ok(Math.abs(contact+.05)<.002);}
 assert.equal(total,42);
});
