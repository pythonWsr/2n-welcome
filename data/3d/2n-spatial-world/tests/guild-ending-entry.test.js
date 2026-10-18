import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as route from '../src/guild-next-route.js';
import {createMemoryScene} from '../src/guild-memory-scene.js';

const story={memoryPhase:2,eventIndex:2};
function rig(){
 const memory=createMemoryScene(),asset=new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial()),camera=new T.PerspectiveCamera(48,.46,.2,2400);memory.install(asset,'garden','rose');
 return {memory,camera,update:(state,dt)=>memory.update({...story,...state},camera,dt),snapshot:()=>memory.group.children.filter(o=>o.isInstancedMesh).flatMap(o=>Array.from(o.instanceMatrix.array)),dispose(){memory.dispose();asset.geometry.dispose();asset.material.dispose();}};
}
test('the full site uses the particle ending by default while retaining an explicit legacy recovery switch',()=>{
 assert.equal(typeof route.particleEndingEnabled,'function');
 assert.equal(route.particleEndingEnabled(''),true);
 assert.equal(route.particleEndingEnabled('?historyPreview=1'),true);
 assert.equal(route.particleEndingEnabled('?ending=legacy'),false);
 assert.equal(route.particleEndingEnabled('',false),false);
 assert.equal(route.particleEndingEnabled('?ending=particles',false),false);
});
test('the first ending frame carries the live breathing phase without advancing it twice',()=>{
 const a=rig(),b=rig();
 try{
  for(let i=0;i<100;i++){a.update({},.05);b.update({},.05);}
  a.update({},.001);a.update({nextT:0,particleEnding:true},0);
  b.update({nextT:.001/18,particleEnding:true},.001);
  const other=b.snapshot();assert.ok(Math.max(...a.snapshot().map((x,k)=>Math.abs(x-other[k])))<1e-4,'position, pose and size must connect at the actual boundary time');
 }finally{a.dispose();b.dispose();}
});
test('rewinding after a held ending returns to the same story boundary without a breathing jump',()=>{
 const a=rig();
 try{
  for(let i=0;i<100;i++)a.update({},.05);
  a.update({nextT:0,particleEnding:true},0);
  for(let i=0;i<100;i++)a.update({nextT:1,particleEnding:true},.05);
  a.update({nextT:0,particleEnding:true},0);const before=a.snapshot(),view=a.camera.position.toArray();
  a.update({},0);
  assert.equal(Math.max(...a.snapshot().map((x,k)=>Math.abs(x-before[k]))),0,'the original story resumes the boundary phase rather than elapsed idle time');
  assert.deepEqual(a.camera.position.toArray(),view);
 }finally{a.dispose();}
});
