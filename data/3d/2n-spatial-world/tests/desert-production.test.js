import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as biome from '../src/biomes.js';
const {createBiomes,groundHeight}=biome;
import {createDesertProduction} from '../src/desert-production.js';
import {readFileSync,statSync} from 'node:fs';
import {gardenPose} from '../src/garden-path.js';
async function preparedWorld(scene){
  const world=createBiomes(scene,true);world.prepare();
  for(let i=0;i<40&&world.groundStatus!=='ready';i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(world.groundStatus,'ready');
  return world;
}

test('Desert has its own continuous surface without generic placeholder objects',async()=>{
  const scene=new T.Scene(),world=await preparedWorld(scene);
  world.update(new T.PerspectiveCamera(),.95);
  const desert=scene.getObjectByName('florr-desert');
  assert.ok(desert,'late travel has its own cartoon desert');
  assert.equal(desert.children.length,0,'no invented cactus, stones, or ribbons');
  assert.equal(scene.getObjectsByProperty('name','continuous-3d-ground').length,4,
    'Desert does not become a new suspended tile');
});

test('Desert sand changes the late terrain palette while the Garden remains green',async()=>{
  const scene=new T.Scene(),world=await preparedWorld(scene);world.update(new T.PerspectiveCamera(),.99);
  const terrains=scene.getObjectsByProperty('name','continuous-3d-ground');
  const sample=mesh=>new T.Color().fromBufferAttribute(mesh.geometry.getAttribute('color'),35*69+35);
  const garden=sample(terrains[0]),desert=sample(terrains[2]);
  assert.ok(garden.g>garden.r*1.3,'Garden palette stays green');
  assert.ok(desert.r>desert.g&&desert.g>desert.b,'Desert reads warm beige');
});

test('only Cactus and Sand petals occupy Desert when optional models are absent',()=>{
  const catalog={
    cactus:new T.Mesh(new T.SphereGeometry(.04,8,6),new T.MeshStandardMaterial()),
    sand:new T.Mesh(new T.SphereGeometry(.05,8,6),new T.MeshStandardMaterial())
  };
  const desert=createDesertProduction(groundHeight,true,catalog);
  assert.equal(desert.children.length,2);
  const matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3();
  for(const family of desert.children){
    assert.ok(['desert-cactus-petal','desert-sand-petal'].includes(family.name));
    assert.equal(family.children.reduce((n,b)=>n+b.count,0),68);
    const locations=[];
    for(const batch of family.children)for(let i=0;i<batch.count;i++){
      batch.getMatrixAt(i,matrix);matrix.decompose(position,new T.Quaternion(),scale);
      assert.ok(position.x>=308&&position.x<=448,'Garden region receives no Desert petals');
      assert.ok(position.y>groundHeight(position.x,position.z)-.2, 'petal body is above terrain');
      assert.ok(scale.x>0&&Math.abs(scale.x-scale.y)<1e-5&&Math.abs(scale.y-scale.z)<1e-5);
      locations.push([position.x,position.z,scale.x]);
    }
    assert.ok(locations.some(([,z])=>z>65)&&locations.some(([,z])=>z< -75),'petals cross depth bands');
    assert.ok(new Set(locations.map(([x,z])=>`${Math.round(x)}:${Math.round(z)}`)).size>58);
    assert.ok(new Set(locations.map(([, ,s])=>s.toFixed(2))).size>5,'size variation is not a repeating pattern');
  }
});

test('Garden ground extends into broad green margins without changing Desert sand',async()=>{
  const scene=new T.Scene(),world=await preparedWorld(scene);world.update(new T.PerspectiveCamera(),.3);
  const terrain=scene.getObjectsByProperty('name','continuous-3d-ground')[0];
  const attr=terrain.geometry.getAttribute('position'),colors=terrain.geometry.getAttribute('color');
  const upper=[];
  for(let i=0;i<attr.count;i++)if(Math.abs(attr.getX(i)-122)<2&&attr.getZ(i)>205&&attr.getZ(i)<230){
    upper.push(new T.Color().fromBufferAttribute(colors,i));
  }
  assert.ok(upper.length>0);
  assert.ok(upper.every(c=>c.g>c.r*1.25&&c.g>.10),'outer visible Garden stays green');
  assert.ok(Math.max(...Array.from({length:attr.count},(_,i)=>attr.getZ(i)))>=320,'terrain opens wider');
});

test('Desert petals install into the Desert region without replacing Garden assets',async()=>{
  const scene=new T.Scene(),world=createBiomes(scene,true),camera=new T.PerspectiveCamera();
  world.update(camera,.95);
  const garden=scene.getObjectByName('florr-petal-assembly');
  const catalog={
    cactus:new T.Mesh(new T.SphereGeometry(.04,8,6),new T.MeshStandardMaterial()),
    sand:new T.Mesh(new T.SphereGeometry(.05,8,6),new T.MeshStandardMaterial())
  };
  assert.equal(typeof world.installDesertPetals,'function');
  await world.installDesertPetals(catalog);
  const desert=scene.getObjectByName('florr-desert');
  assert.equal(desert.children.length,2);
  assert.equal(scene.getObjectByName('florr-petal-assembly'),garden);
});

test('Garden and Desert prepare independently without serial regional loading',async()=>{
  let resolveGarden,resolveDesert,started=[];
  const gardenCatalog=Object.fromEntries(['glass','leaf','rose','clover','rock','goldenleaf'].map(name=>[name,new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshStandardMaterial())]));
  const desertCatalog={cactus:new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshStandardMaterial()),sand:new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshStandardMaterial())};
  const world=createBiomes(new T.Scene(),true,{
    garden:()=>{started.push('garden');return new Promise(resolve=>{resolveGarden=resolve;});},
    desert:()=>{started.push('desert');return new Promise(resolve=>{resolveDesert=resolve;});},
    ocean:async()=>({})
  });
  assert.equal(typeof biome.prepareBiomePetals,'function');
  const ready=biome.prepareBiomePetals(world);
  assert.deepEqual(started,['garden','desert']);
  resolveGarden(gardenCatalog);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(started,['garden','desert']);
  resolveDesert(desertCatalog);
  await ready;
  assert.equal(world.petalStatus,'ready');
  assert.equal(world.desertPetalStatus,'ready');
});

test('world travel never builds all four ground spans on the first Garden frame',async()=>{
  const scene=new T.Scene(),world=createBiomes(scene,true);
  assert.equal(biome.limitUnreadyTravel(1,6/14,{petalStatus:'ready',desertPetalStatus:'ready',groundStatus:'pending'}),1);
  world.update(new T.PerspectiveCamera(),.001);
  assert.equal(scene.getObjectsByProperty('name','continuous-3d-ground').length,0);
  world.prepare();
  for(let i=0;i<60&&world.groundStatus!=='ready';i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(world.groundStatus,'ready');
  assert.equal(scene.getObjectsByProperty('name','continuous-3d-ground').length,4);
});

test('Desert petals have varied headings and contact the sand after tilting',()=>{
  const catalog=Object.fromEntries(['cactus','sand','stick','pincer','iris','goldenleaf'].map(name=>[
    name,new T.Mesh(new T.BoxGeometry(.09,.07,.02),new T.MeshStandardMaterial())
  ]));
  const group=createDesertProduction(groundHeight,true,catalog);
  const matrix=new T.Matrix4(),vertex=new T.Vector3(),normal=new T.Vector3(0,0,1),quaternion=new T.Quaternion();
  for(const family of group.children){
    const headings=[];
    for(const batch of family.children)for(let i=0;i<batch.count;i++){
      batch.getMatrixAt(i,matrix);
      const center=new T.Vector3().setFromMatrixPosition(matrix);
      matrix.decompose(new T.Vector3(),quaternion,new T.Vector3());
      normal.set(0,0,1).applyQuaternion(quaternion);
      assert.ok(Math.abs(normal.y)>.15,`${batch.name} is a three-dimensional tilt`);
      headings.push(Math.atan2(normal.x,normal.z).toFixed(2));
      let low=Infinity;
      const positions=batch.geometry.getAttribute('position');
      for(let j=0;j<positions.count;j++){
        vertex.fromBufferAttribute(positions,j).applyMatrix4(matrix);
        low=Math.min(low,vertex.y-groundHeight(vertex.x,vertex.z));
      }
      assert.ok(low>-.45&&low<.32,`${batch.name} touches sand instead of floating: ${low}`);
    }
    assert.ok(new Set(headings).size>1,`${family.name} needs varying tilt/heading`);
  }
});

test('travel remains available while Garden or Desert resources load',()=>{
  assert.equal(typeof biome.limitUnreadyTravel,'function');
  const hero=6/14;
  assert.equal(biome.limitUnreadyTravel(1,hero,{petalStatus:'loading',desertPetalStatus:'loading'}),1);
  const transition=biome.limitUnreadyTravel(1,hero,{petalStatus:'ready',desertPetalStatus:'loading'});
  assert.equal(transition,1,'loading must not trap camera travel');
  assert.equal(biome.limitUnreadyTravel(1,hero,{petalStatus:'ready',desertPetalStatus:'ready'}),1);
});

test('user-made Stick, Pincer and Iris add distinct Desert layers',()=>{
  const names=['cactus','sand','stick','pincer','iris','goldenleaf'];
  const catalog=Object.fromEntries(names.map(name=>[name,new T.Mesh(new T.BoxGeometry(.1,.07,.03),new T.MeshStandardMaterial())]));
  for(const [mobile,counts] of [[true,[68,68,27,26,23,4]],[false,[94,94,40,38,28,6]]]){
    const group=createDesertProduction(groundHeight,mobile,catalog);
    assert.deepEqual(group.children.map(child=>child.name),names.map(name=>`desert-${name}-petal`));
    assert.deepEqual(group.children.map(f=>f.children.reduce((n,b)=>n+b.count,0)),counts);
    const positions=new T.Vector3(),matrix=new T.Matrix4();
    for(const family of group.children){
      const xs=[],zs=[];
      for(const batch of family.children)for(let i=0;i<batch.count;i++){
        batch.getMatrixAt(i,matrix);positions.setFromMatrixPosition(matrix);
        xs.push(positions.x);zs.push(positions.z);
        assert.ok(positions.y>groundHeight(positions.x,positions.z)-.5);
      }
      assert.ok(new Set(xs.map(x=>Math.round(x))).size>=Math.min(xs.length,3));
      assert.ok(Math.max(...zs)-Math.min(...zs)>(family.name==='desert-goldenleaf-petal'?10:35));
      if(family.name==='desert-goldenleaf-petal')assert.ok(xs.every(x=>x>=315&&x<347),'gold is transition only');
      else assert.ok(xs.every(x=>x>308&&x<448),'Garden remains separate');
    }
  }
});

test('the three new Desert models have compact GLB runtime copies',()=>{
  for(const name of ['stick','pincer','iris']){
    const path=new URL(`../public/assets/desert-petals/${name}.glb`,import.meta.url);
    assert.ok(statSync(path).size<1_500_000,`${name} stays within the mobile transfer budget`);
    const file=readFileSync(path);
    assert.equal(file.subarray(0,4).toString(),'glTF');
    const length=file.readUInt32LE(12),descriptor=JSON.parse(file.subarray(20,20+length).toString());
    const faces=descriptor.meshes[0].primitives.reduce((total,primitive)=>total+descriptor.accessors[primitive.indices].count/3,0);
    assert.ok(faces>2000&&faces<30_000,`${name} is a real optimized mesh`);
  }
});

test('every new Desert type remains in the mobile camera at the final shot',()=>{
  const names=['cactus','sand','stick','pincer','iris','goldenleaf'];
  const catalog=Object.fromEntries(names.map(name=>[name,new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshStandardMaterial())]));
  const group=createDesertProduction(groundHeight,true,catalog),camera=new T.PerspectiveCamera(48,390/844,.2,900);
  gardenPose(1,camera,true);camera.updateMatrixWorld();
  const matrix=new T.Matrix4(),point=new T.Vector3();
  for(const name of ['stick','pincer','iris']){
    const family=group.getObjectByName(`desert-${name}-petal`);
    let visible=0;
    for(const batch of family.children)for(let i=0;i<batch.count;i++){
      batch.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix).project(camera);
      if(point.z>0&&point.z<1&&Math.abs(point.x)<.9&&Math.abs(point.y)<.9)visible++;
    }
    assert.ok(visible>0,`${name} is present in the final portrait composition`);
  }
});

test('Desert reaches Garden-like population without making Golden Leaf a deep-Desert species',()=>{
  const names=['cactus','sand','stick','pincer','iris','goldenleaf'];
  const catalog=Object.fromEntries(names.map(name=>[name,new T.Mesh(new T.BoxGeometry(.1,.07,.03),new T.MeshStandardMaterial())]));
  for(const [mobile,want] of [[true,216],[false,300]]){
    const group=createDesertProduction(groundHeight,mobile,catalog);
    assert.equal(group.children.reduce((total,family)=>total+family.children.reduce((n,b)=>n+b.count,0),0),want);
    const gold=group.getObjectByName('desert-goldenleaf-petal');
    assert.ok(gold);
    const matrix=new T.Matrix4(),xs=[];
    for(const batch of gold.children)for(let i=0;i<batch.count;i++){
      batch.getMatrixAt(i,matrix);xs.push(new T.Vector3().setFromMatrixPosition(matrix).x);
    }
    assert.ok(xs.length>=4&&xs.every(x=>x>=315&&x<347));
    for(const species of group.children.filter(f=>f!==gold)){
      assert.ok(species.children.length>=6,'depth and travel sectors can cull off-camera instances');
      assert.ok(species.children.every(batch=>batch.frustumCulled));
      assert.ok(species.children.every(batch=>batch.boundingSphere.radius<100),'each batch spans a limited view region');
    }
  }
});

test('Desert poses vary from flat to raised and Iris is small with its pink face camera-facing',()=>{
  const catalog=Object.fromEntries(['cactus','sand','stick','pincer','iris','goldenleaf'].map(name=>[
    name,new T.Mesh(new T.BoxGeometry(.12,.11,.04),new T.MeshStandardMaterial())
  ]));
  const group=createDesertProduction(groundHeight,true,catalog),matrix=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3();
  const normals=[],sizes={};
  for(const family of group.children){
    sizes[family.name]=[];
    for(const batch of family.children)for(let i=0;i<batch.count;i++){
      batch.getMatrixAt(i,matrix);matrix.decompose(new T.Vector3(),q,s);
      sizes[family.name].push(s.x);
      if(family.name==='desert-cactus-petal')normals.push(new T.Vector3(0,0,1).applyQuaternion(q).y);
      if(family.name==='desert-iris-petal'){
        const face=new T.Vector3(0,0,-1).applyQuaternion(q);
        assert.ok(face.x<-.3&&face.y>.25,'pale-pink -Z face looks toward the elevated incoming camera');
      }
    }
  }
  assert.ok(normals.some(y=>y<.45)&&normals.some(y=>y>.85));
  assert.ok(Math.max(...sizes['desert-iris-petal'])<Math.min(...sizes['desert-cactus-petal'])*.72);
});

test('Desert support uses rendered triangles, not the idealized heightfield',()=>{
  const x=421.5,z=-104,actual=biome.renderedGroundHeight(x,z);
  assert.ok(Math.abs(actual-groundHeight(x,z))>.2,'test point exposes mesh interpolation error');
  const step=116/56,along=695/68,u=(x-404)/step,v=(z+365)/along;
  const i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j;
  const X=404+i*step,Z=-365+j*along;
  const expected=a+b<=1?(1-a-b)*groundHeight(X,Z)+a*groundHeight(X+step,Z)+b*groundHeight(X,Z+along):
    (a+b-1)*groundHeight(X+step,Z+along)+(1-b)*groundHeight(X+step,Z)+(1-a)*groundHeight(X,Z+along);
  assert.ok(Math.abs(actual-expected)<1e-5);
});

test('Golden Leaf is actually visible in the portrait transition, not merely instantiated',()=>{
  const names=['cactus','sand','stick','pincer','iris','goldenleaf'];
  const catalog=Object.fromEntries(names.map(name=>[name,new T.Mesh(new T.BoxGeometry(.1,.1,.03),new T.MeshStandardMaterial())]));
  const family=createDesertProduction(groundHeight,true,catalog).getObjectByName('desert-goldenleaf-petal');
  const camera=new T.PerspectiveCamera(48,390/844,.2,900);
  gardenPose(.84,camera,true);camera.updateMatrixWorld();
  const matrix=new T.Matrix4(),point=new T.Vector3();let visible=0;
  for(const batch of family.children)for(let i=0;i<batch.count;i++){
    batch.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix).project(camera);
    if(point.z>0&&point.z<1&&Math.abs(point.x)<.9&&Math.abs(point.y)<.9)visible++;
  }
  assert.ok(visible>=2,'at least two cross-biome leaves appear before deep Desert');
});

test('all actual Desert GLB instances touch rendered ground and use independent species positions',()=>{
 const names=['cactus','sand','stick','pincer','iris','goldenleaf'];const catalog=Object.fromEntries(names.map(name=>{
  const folder=name==='goldenleaf'?'garden-petals':'desert-petals';const b=readFileSync(new URL(`../public/assets/${folder}/${name}.glb`,import.meta.url));const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),off=28+b.readUInt32LE(12),a=j.accessors[j.meshes[0].primitives[0].attributes.POSITION],view=j.bufferViews[a.bufferView];const values=new Float32Array(a.count*3);for(let i=0;i<values.length;i++)values[i]=b.readFloatLE(off+(view.byteOffset||0)+(a.byteOffset||0)+i*4);const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(values,3));return [name,{geometry,material:new T.MeshStandardMaterial()}];
 }));
 const group=createDesertProduction(biome.renderedGroundHeight,true,catalog),matrix=new T.Matrix4(),v=new T.Vector3(),places=new Map();
 for(const family of group.children){const coords=[];for(const mesh of family.children)for(let i=0;i<mesh.count;i++){
  mesh.getMatrixAt(i,matrix);coords.push(`${matrix.elements[12].toFixed(3)},${matrix.elements[14].toFixed(3)}`);let min=Infinity;const a=mesh.geometry.attributes.position;
  for(let k=0;k<a.count;k++){v.fromBufferAttribute(a,k).applyMatrix4(matrix);min=Math.min(min,v.y-biome.renderedGroundHeight(v.x,v.z));}assert.ok(Math.abs(min+.07)<.002,`${family.name} contact ${min}`);
 }places.set(family.name,coords);}
 const cactus=new Set(places.get('desert-cactus-petal'));assert.ok(places.get('desert-pincer-petal').every(p=>!cactus.has(p)),'species cannot stack at identical positions');
});
