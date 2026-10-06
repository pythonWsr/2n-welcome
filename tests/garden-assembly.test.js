import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPetalInstances,PETAL_NAMES} from '../src/garden-assembly.js';
import {createBiomes,groundHeight} from '../src/biomes.js';
import {gardenPose} from '../src/garden-path.js';
import {readFileSync} from 'node:fs';
import {preparedWorld} from './support/prepared-world.js';

function actualWebGeometry(name){
  const glb=readFileSync(new URL(`../public/assets/garden-petals/${name}.glb`,import.meta.url));
  const length=glb.readUInt32LE(12),gltf=JSON.parse(glb.subarray(20,20+length).toString());
  const accessor=gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION];
  const view=gltf.bufferViews[accessor.bufferView];
  const offset=20+length+8+(view.byteOffset||0)+(accessor.byteOffset||0);
  const positions=new Float32Array(accessor.count*3);
  for(let i=0;i<positions.length;i++)positions[i]=glb.readFloatLE(offset+i*4);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.computeBoundingBox();
  return geometry;
}
const realCatalog=Object.fromEntries(PETAL_NAMES.map(name=>[name,new T.Mesh(actualWebGeometry(name),new T.MeshStandardMaterial())]));

const catalog=Object.fromEntries(PETAL_NAMES.map(name=>[name,new T.Mesh(
  name==='leaf'?new T.BoxGeometry(.2,.02,.2):new T.SphereGeometry(.05,12,10),
  new T.MeshStandardMaterial({color:0xffffff})
)]));

for(const mobile of [false,true]){
  test(`${mobile?'mobile':'desktop'} assembles all six distinct petals as distributed instances`,()=>{
    const assembly=createPetalInstances(groundHeight,catalog,mobile);
    const count=mobile?36:50;
    assert.equal(assembly.children.length,6);
    const matrix=new T.Matrix4(),point=new T.Vector3(),scale=new T.Vector3();
    for(const species of assembly.children){
      assert.ok(PETAL_NAMES.includes(species.name));
      assert.equal(species.children.length,3,'spatial sectors permit frustum culling');
      assert.ok(species.children.every(mesh=>mesh.isInstancedMesh));
      assert.equal(species.children.reduce((sum,mesh)=>sum+mesh.count,0),count);
      const locations=[];
      for(const mesh of species.children)for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,matrix);
        matrix.decompose(point,new T.Quaternion(),scale);
        assert.ok(point.x>90&&point.x<296,'kept inside Garden');
        assert.ok(point.y+mesh.geometry.boundingBox.max.y*scale.y>groundHeight(point.x,point.z),
          'visible upper surface remains above terrain');
        const sizes=mesh.geometry.boundingBox.getSize(new T.Vector3());
        assert.ok(scale.x*Math.max(sizes.x,sizes.y,sizes.z)<7,
          'even a flat leaf remains environmental rather than monumental');
        locations.push([point.x,point.z]);
      }
      assert.ok(new Set(locations.map(([x,z])=>`${x.toFixed(1)}:${z.toFixed(1)}`)).size===count);
      assert.ok(Math.max(...locations.map(([x])=>x))-Math.min(...locations.map(([x])=>x))>90);
    }
  });
}

test('six optimized species are installed into the scrolling world without a new route or terrain swap',async()=>{
  const scene=new T.Scene(),world=await preparedWorld(scene,true);
  const camera=new T.PerspectiveCamera();
  world.update(camera,.02);
  const terrain=scene.getObjectsByProperty('name','continuous-3d-ground');
  world.installPetals(catalog);
  world.update(camera,.1);
  const assembly=scene.getObjectByName('florr-petal-assembly');
  assert.ok(assembly);
  assert.equal(assembly.userData.instanceCount,216);
  assert.equal(scene.getObjectsByProperty('name','continuous-3d-ground')[0],terrain[0]);
  assert.equal(world.petalStatus,'ready');
});

test('Garden positions form mixed clusters and scattered gaps instead of six-slot templates',()=>{
  const assembly=createPetalInstances(groundHeight,catalog,true);
  const family=assembly.children[0],matrix=new T.Matrix4(),p=new T.Vector3(),positions=[];
  for(const batch of family.children)for(let i=0;i<batch.count;i++){
    batch.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);positions.push([p.x,p.z]);
  }
  const nearest=positions.map(([x,z],index)=>Math.min(...positions.filter((_,j)=>j!==index).map(([a,b])=>Math.hypot(x-a,z-b))));
  assert.ok(nearest.some(d=>d<9),'some petals gather in clusters');
  assert.ok(nearest.some(d=>d>17),'other petals leave natural gaps');
  assert.ok(positions.some(([,z])=>z>115)&&positions.some(([,z])=>z< -100),'near and far ground are represented');
});

test('late Garden installation never fades in a low-quality placeholder',async()=>{
  const scene=new T.Scene(),world=await preparedWorld(scene,true);
  world.update(new T.PerspectiveCamera(),.45);
  world.installPetals(catalog);
  const assembly=scene.getObjectByName('florr-petal-assembly');
  for(const family of assembly.children)for(const batch of family.children){
    assert.equal(batch.material.opacity,1);
    assert.equal(batch.material.transparent,false);
  }
});

test('real six GLBs have coherent apparent size and all remain readable in portrait Garden camera',()=>{
  const assembly=createPetalInstances(groundHeight,realCatalog,true);
  const camera=new T.PerspectiveCamera(48,390/844,.2,900);
  const box=new T.Box3(),matrix=new T.Matrix4(),projected=new T.Vector3();
  for(const t of [.28,.47,.68,.84]){
    gardenPose(t,camera,true);camera.updateMatrixWorld();
    for(const species of assembly.children){
      let readable=0;
      for(const batch of species.children)for(let i=0;i<batch.count;i++){
        batch.getMatrixAt(i,matrix);
        box.copy(batch.geometry.boundingBox).applyMatrix4(matrix);
        const size=box.getSize(new T.Vector3());
        assert.ok(Math.max(size.x,size.y,size.z)<7.5,`${species.name} is not a giant slab`);
        const center=box.getCenter(new T.Vector3());
        projected.copy(center).project(camera);
        if(projected.z<0||projected.z>1||Math.abs(projected.x)>1||Math.abs(projected.y)>1)continue;
        const span=box.getSize(new T.Vector3());
        const depth=camera.position.distanceTo(center);
        const pixels=Math.max(span.x,span.y,span.z)*844/(2*depth*Math.tan(T.MathUtils.degToRad(24)));
        if(pixels>12&&pixels<160)readable++;
        const width=span.x*844/(2*depth*Math.tan(T.MathUtils.degToRad(24)));
        assert.ok(width<390*.30,`${species.name} cannot fill a third of the portrait viewport`);
      }
      if(t===.47||t===.68)assert.ok(readable>=2,`${species.name} needs multiple recognizable portrait instances at t=${t}`);
    }
  }
});

test('per-asset orientation and geometry support keep real GLBs visible and grounded',()=>{
  const assembly=createPetalInstances(groundHeight,realCatalog,true);
  const matrix=new T.Matrix4(),p=new T.Vector3(),range=[];
  for(const species of assembly.children){
    const geometry=realCatalog[species.name].geometry,extent=geometry.boundingBox.getSize(new T.Vector3());
    const localFace=extent.y<Math.min(extent.x,extent.z)?new T.Vector3(0,1,0):new T.Vector3(0,0,1);
    for(const batch of species.children)for(let i=0;i<batch.count;i++){
      batch.getMatrixAt(i,matrix);
      const face=localFace.clone().transformDirection(matrix);
      assert.ok(face.dot(new T.Vector3(0,.45,.9).normalize())>.52,`${species.name} is not edge-on or inverted`);
      const attr=geometry.getAttribute('position');
      let lowest=Infinity;
      for(let n=0;n<attr.count;n+=11){
        p.fromBufferAttribute(attr,n).applyMatrix4(matrix);
        lowest=Math.min(lowest,p.y-groundHeight(p.x,p.z));
      }
      assert.ok(lowest>-.13&&lowest<.55,`${species.name} touches terrain, clearance=${lowest}`);
    }
    range.push(extent);
  }
});

test('middle portrait journey has petals across the ground rather than an empty central frame',()=>{
  const assembly=createPetalInstances(groundHeight,realCatalog,true);
  const camera=new T.PerspectiveCamera(48,390/844,.2,900),matrix=new T.Matrix4(),box=new T.Box3();
  for(const [time,minimum] of [[.47,9],[.58,6],[.68,12]]){
    gardenPose(time,camera,true);camera.updateMatrixWorld();
    let center=0;
    for(const family of assembly.children)for(const batch of family.children)for(let i=0;i<batch.count;i++){
      batch.getMatrixAt(i,matrix);
      box.copy(batch.geometry.boundingBox).applyMatrix4(matrix);
      const screen=box.getCenter(new T.Vector3()).project(camera);
      if(screen.z>0&&screen.z<1&&Math.abs(screen.x)<.6&&screen.y>-.3&&screen.y<.85)center++;
    }
    assert.ok(center>=minimum,`portrait at t=${time} has only ${center} visible central petals`);
  }
});
