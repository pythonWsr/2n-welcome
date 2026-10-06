import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {pose} from '../src/journey.js';
import {createMonument} from '../src/monument.js';

test('camera travels from below the sculpture to above its highest point',()=>{
  const camera=new T.PerspectiveCamera();
  const box=new T.Box3().setFromObject(createMonument());
  pose(.46,camera);assert.ok(camera.position.y<box.min.y);
  pose(1,camera);assert.ok(camera.position.y>box.max.y+30);
  const direction=new T.Vector3();camera.getWorldDirection(direction);assert.ok(direction.y<-.4);
});
test('path is finite, reversible and remains in front of the sculpture',()=>{
  const camera=new T.PerspectiveCamera();const samples=[];
  for(let i=0;i<=1000;i++){pose(i/1000,camera);assert.ok(camera.position.toArray().every(Number.isFinite));assert.ok(camera.position.z>10);samples.push(camera.position.clone());}
  for(let i=1000;i>=0;i--){pose(i/1000,camera);assert.ok(camera.position.distanceTo(samples[i])<1e-9);}
});
test('geometry uses a bounded budget and finite normals on every device',()=>{
  const model=createMonument();let triangles=0;
  model.traverse(o=>{if(!o.isMesh)return;triangles+=o.geometry.index.count/3;assert.ok([...o.geometry.attributes.normal.array].every(Number.isFinite));});
  assert.ok(triangles<30000);
});
