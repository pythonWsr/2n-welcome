import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import * as T from 'three';
import {pose} from '../src/journey.js';
import {gardenPose} from '../src/garden-path.js';
import {createBiomes,groundHeight,desertBlend} from '../src/biomes.js';
import {preparedWorld} from '../tests/support/prepared-world.js';

test('Hero passes position and orientation continuously into Garden on both layouts',()=>{
  for(const portrait of [false,true]){
    const from=new T.PerspectiveCamera(),to=new T.PerspectiveCamera();
    pose(1,from,portrait);gardenPose(0,to,portrait);
    assert.ok(from.position.distanceTo(to.position)<1e-5);
    assert.ok(from.quaternion.angleTo(to.quaternion)<1e-5);
    const back=new T.PerspectiveCamera(),ahead=new T.PerspectiveCamera();
    pose(.999,back,portrait);gardenPose(.001,ahead,portrait);
    const outgoing=from.position.clone().sub(back.position).multiplyScalar(1/.001/(6/14));
    const incoming=ahead.position.clone().sub(to.position).multiplyScalar(1/.001/(8/14));
    assert.ok(outgoing.distanceTo(incoming)/outgoing.length()<.035);
  }
});
test('Garden to Desert remains one sampled surface and material transition',async()=>{
  for(const x of [188,296,404])for(const z of [-120,-10,68]){
    assert.ok(Math.abs(groundHeight(x-.001,z)-groundHeight(x+.001,z))<.01);
    assert.ok(Math.abs(desertBlend(x-.001)-desertBlend(x+.001))<.001);
  }
  const scene=new T.Scene(),world=await preparedWorld(scene,true);
  const camera=new T.PerspectiveCamera(48,1,.2,900);
  gardenPose(.01,camera,true);world.update(camera,.01);
  assert.equal(scene.children.filter(o=>o.type==='Group'&&o.visible).length,7,'all completed distant ground is visible from entry');
  gardenPose(.65,camera,true);world.update(camera,.65);
  assert.ok(scene.children.filter(o=>o.type==='Group'&&o.visible).length>=2);
  let instances=0,triangles=0;
  scene.traverse(o=>{
    if(!o.isMesh)return;
    const count=o.isInstancedMesh?o.count:1;
    instances+=count;
    triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*count;
  });
  assert.ok(instances<250&&triangles<100000);
});
