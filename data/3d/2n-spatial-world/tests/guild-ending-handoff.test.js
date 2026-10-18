import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {WebGLRenderLists} from 'three/src/renderers/webgl/WebGLRenderLists.js';
import {endingPetalFrame,endingPetalPoint} from '../src/guild-ending-particles.js';
import {createMemoryLayout,memoryPoint} from '../src/guild-memory-layout.js';
import {createMemoryScene} from '../src/guild-memory-scene.js';

test('new petals wait for the fully formed mark before entering their final orbit',()=>{
 const layout=createMemoryLayout({assets:[{key:'rose',radius:2.2}]}),slots=endingPetalFrame({position:[-4,7,198],target:[0,0,-14]},.46,layout.anchors);
 const shifted=new Map([...slots].map(([id,s])=>[id,{...s,phase:s.phase+Math.PI}]));
 for(const t of [.7,.85,16.5/18])for(const a of layout.anchors){
  const start=memoryPoint(a,2),p=endingPetalPoint(a,start,t,0,false,slots),q=endingPetalPoint(a,start,t,12,false,shifted);
  assert.ok(Math.hypot(...p.map((v,k)=>v-q[k]))<1e-8,`the orbit cannot pull petals away before the mark forms at ${t}`);
 }
 const a=layout.anchors[0],start=memoryPoint(a,2);
 assert.notDeepEqual(endingPetalPoint(a,start,1,0,false,slots),endingPetalPoint(a,start,1,12,false,slots));
});

test('each petal identity owns a different arrival path even with the same start and destination',()=>{
 const start=[20,60,-20],a={id:'petal-1',u:.35,longitude:1.1,branch:0},b={...a,id:'petal-2'};
 const slots=new Map([a,b].map(p=>[p.id,{phase:1.4,aspect:.46,position:new T.Vector3()}]));
 for(const t of [16.5/18,1])assert.deepEqual(endingPetalPoint(a,start,t,0,false,slots),endingPetalPoint(b,start,t,0,false,slots));
 const p=endingPetalPoint(a,start,17.1/18,0,false,slots),q=endingPetalPoint(b,start,17.1/18,0,false,slots);
 assert.ok(Math.hypot(...p.map((x,k)=>x-q[k]))>5,'independent timing and arcs cannot reduce to a shared ring transform');
 assert.ok(Math.abs(p[2]-q[2])>2,'individual paths use front/back depth');
});

test('the mark depth shell renders after particles and before petals with or without text',()=>{
 const memory=createMemoryScene(),asset=new T.Mesh(new T.SphereGeometry(2.2,8,6),new T.MeshStandardMaterial()),camera=new T.PerspectiveCamera(48,.46,.2,2400);
 const lists=new WebGLRenderLists();memory.install(asset,'garden','rose');
 try{
  for(const t of [.925,.95,1])for(const bounds of [null,new T.Box3(new T.Vector3(-40,-40,-10),new T.Vector3(40,-20,0))]){
   memory.update({memoryPhase:2,eventIndex:2,nextT:t,particleEnding:true},camera,1/60);
   memory.updateTextOcclusion(camera,bounds,2);
   const list=lists.get(memory.group,0);list.init();
   function visit(object,groupOrder=0){
    if(!object.visible)return;
    if(object.isGroup)groupOrder=object.renderOrder;
    if(object.material&&object.geometry)list.push(object,object.geometry,object.material,groupOrder,0,null);
    for(const child of object.children)visit(child,groupOrder);
   }
   visit(memory.group);list.sort();const queue=[...list.opaque,...list.transmissive,...list.transparent];
   const particle=queue.findIndex(item=>item.object.name==='ending-shape-swarm');
   const shell=memory.group.getObjectByName('ending-mark-depth'),shellIndexes=queue.map((item,i)=>shell.children.includes(item.object)?i:-1).filter(i=>i>=0);
   const petalIndexes=queue.map((item,i)=>item.object.isInstancedMesh?i:-1).filter(i=>i>=0);
   assert.equal(shellIndexes.length,2,'both original model parts supply occlusion');
   assert.ok(shellIndexes.every(i=>i>particle),'the depth surface must never discard its own moving particles');
   assert.ok(petalIndexes.every(i=>i>Math.max(...shellIndexes)),'front/back petals still test against the model surface');
  }
 }finally{lists.dispose();memory.dispose();asset.geometry.dispose();asset.material.dispose();}
});
