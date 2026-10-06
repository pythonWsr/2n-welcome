import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
test('preview restores world visibility and borrowed state even when rendering fails',async()=>{
 const {renderMemoryPreview}=await import('../src/guild-memory-preview.js');
 const scene=new T.Scene(),old=new T.Group(),group=new T.Group();scene.add(old,group);group.visible=false;scene.fog=new T.FogExp2(0xff0000,.1);
 const fog=scene.fog,camera=new T.PerspectiveCamera();camera.position.set(1,2,3);
 const memory={group,setPreview(){},update(_,cam){group.visible=true;cam.position.set(20,30,100);}};
 assert.throws(()=>renderMemoryPreview({scene,camera,memory,entryPose:{position:[0,0,0],target:[0,0,-1]},progress:.05,departureGroups:[old],viewport:{width:414,height:896},renderer:{render(){assert.equal(old.visible,false);assert.equal(group.visible,true);throw Error('context lost');}}}),/context lost/);
 assert.equal(old.visible,true);assert.equal(group.visible,false);assert.equal(scene.fog,fog);assert.deepEqual(camera.position.toArray(),[1,2,3]);
});
