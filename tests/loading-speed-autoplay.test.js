import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
const cache=await import('../src/placement-cache.js').catch(()=>({}));
const playback=await import('../src/autoplay.js').catch(()=>({}));
import {readPetalGeometry} from '../scripts/petal-geometry.mjs';
import {createDesertProduction} from '../src/desert-production.js';
import {createOceanPetals,createCoastSand} from '../src/ocean-production.js';
import {createJunglePetals} from '../src/jungle-production.js';
import {createHellPetals} from '../src/hell-production.js';
import {renderedGroundHeight} from '../src/biomes.js';
test('baked placement restores exact transforms without changing geometry or material',()=>{
 assert.equal(typeof cache.restorePlacement,'function','baked placement is missing');
 const asset=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());
 const entry=cache.serializePlacement(new T.InstancedMesh(asset.geometry,asset.material,1),asset);
 const result=cache.restorePlacement(entry,asset);
 assert.equal(result.geometry,asset.geometry);assert.equal(result.material,asset.material);
 assert.deepEqual(Array.from(result.instanceMatrix.array),[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 asset.geometry.attributes.position.setX(0,123);
 assert.equal(cache.restorePlacement(entry,asset),null,'stale geometry must fall back');
});
test('both device profiles restore every real GLB with bit-identical original placement',()=>{
 const species={desert:['cactus','sand','stick','pincer','iris','goldenleaf'],ocean:['pearl','shell','starfish'],jungle:['peas','tomato','bur','goldenleaf','rock','compass'],hell:['darkmark','corruption'],coast:['sand']};
 const matrices=root=>{const result=[];root.traverse(o=>{if(o.isInstancedMesh)result.push([o.name,Array.from(o.instanceMatrix.array)]);});return result;};
 for(const [kind,names] of Object.entries(species))for(const name of names){
  const folder=['goldenleaf','rock'].includes(name)?'garden':kind==='coast'?'desert':kind;
  const asset=readPetalGeometry(new URL(`../public/assets/${folder}-petals/${name}.glb`,import.meta.url));
  for(const mobile of [true,false]){
   const catalog={[name]:asset},cached=cache.restoreBakedPetals(kind,mobile,catalog,[name],kind==='desert'?renderedGroundHeight.placementKey:'');
   assert.ok(cached,`missing bake ${kind}/${name}/${mobile}`);
   const original=kind==='desert'?createDesertProduction(renderedGroundHeight,mobile,catalog,[name]):kind==='ocean'?createOceanPetals(catalog,mobile,[name]):kind==='jungle'?createJunglePetals(catalog,mobile,[name]):kind==='hell'?createHellPetals(catalog,mobile,[name]):createCoastSand(asset,mobile);
   assert.deepEqual(matrices(cached),matrices(original),`changed placement ${kind}/${name}/${mobile}`);
   cached.traverse(o=>{if(o.isInstancedMesh){assert.equal(o.geometry,asset.geometry);assert.equal(o.material.map,asset.material.map);}});
  }
 }
});
test('autoplay is off by default, unavailable until ready, and resumes at current position',()=>{
 assert.equal(typeof playback.createAutoplay,'function','autoplay is missing');
 const player=playback.createAutoplay(2);
 assert.equal(player.playing,false);player.toggle(.4,false);assert.equal(player.playing,false);
 player.toggle(.4,true);assert.equal(player.playing,true);
 assert.equal(player.advance(1),.9);player.pause();assert.equal(player.advance(1),.9);
 player.toggle(.9,true);assert.equal(player.advance(1),1);assert.equal(player.playing,false);
 player.toggle(1,true);assert.equal(player.playing,false,'end must not jump to beginning');
});
test('autoplay pause preserves current shot and re-enabling continues forward without a jump',()=>{
 const player=playback.createAutoplay(10);player.toggle(.3,true);
 assert.equal(player.advance(2),.5);player.pause();assert.equal(player.advance(30),.5);
 player.toggle(.6,true);assert.equal(player.advance(0),.6);assert.equal(player.advance(1),.7);
 player.toggle(.7,true);assert.equal(player.playing,false);assert.equal(player.advance(30),.7);
});
