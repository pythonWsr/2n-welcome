import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBiomes,groundHeight} from '../src/biomes.js';
import {gardenPose} from '../src/garden-path.js';
import {pose} from '../src/journey.js';
import {gardenGroundColor} from '../src/garden-production.js';
import {preparedWorld} from './support/prepared-world.js';

for(const mobile of [false,true]){
  test(`Garden ${mobile?'mobile':'desktop'} replaces temporary realistic assets when ground is prepared`,async()=>{
    const scene=new T.Scene(),camera=new T.PerspectiveCamera();
    const world=await preparedWorld(scene,mobile);
    world.update(camera,.02);
    const garden=scene.getObjectByName('garden-asset-gate');
    assert.ok(garden,'the approved B scene is immediately present');
    assert.equal(world.gardenStatus,'ready');
    assert.equal(scene.getObjectByName('garden-sculpted-landscape'),undefined);
    assert.ok(garden.getObjectByName('garden-petal-portal'));
    const terrain=scene.getObjectsByProperty('name','continuous-3d-ground');
    assert.ok(terrain.length>=2);
    for(const ground of terrain.slice(0,2))assert.equal(ground.material.map,null,'no scanned forest texture');
  });
}

test('Garden entrance keeps the Hero camera continuous and provides a volumetric corridor',async()=>{
  const end=pose(1,new T.PerspectiveCamera(),false);
  const entry=gardenPose(0,new T.PerspectiveCamera(),false);
  assert.ok(Math.hypot(...end.position.map((v,i)=>v-entry.position[i]))<.0001);
  const scene=new T.Scene(),world=await preparedWorld(scene,false);
  world.update(new T.PerspectiveCamera(),.5);
  const art=scene.getObjectByName('garden-asset-gate');
  for(const mesh of art.children.filter(child=>child.isMesh&&child.name!=='garden-ground-marks')){
    const extent=new T.Box3().setFromObject(mesh).getSize(new T.Vector3());
    assert.ok(extent.y<18,'old procedural white/pink petals cannot dwarf runtime GLBs');
  }
  assert.ok(groundHeight(188,0)>-60,'the corridor is attached to the continuous ground');
});

test('Garden ground is saturated green with graphic tonal variation and terrain-following markings',async()=>{
  const colors=[gardenGroundColor(120,-75),gardenGroundColor(145,15),gardenGroundColor(205,75)];
  for(const color of colors){
    assert.ok(color.g>color.r*1.5&&color.g>color.b*2,'ground reads green in the main Garden');
    assert.ok(color.getHex()<0xacc789,'ground is no longer washed-out pale');
  }
  assert.ok(Math.abs(colors[0].r-colors[1].r)+Math.abs(colors[0].g-colors[1].g)>.025,
    'contours vary without a flat fill');
  const scene=new T.Scene(),world=await preparedWorld(scene,true);
  world.update(new T.PerspectiveCamera(),.48);
  const texture=scene.getObjectByName('garden-ground-marks');
  assert.ok(texture?.isMesh,'subtle flat geometric marks are part of the terrain');
  const position=texture.geometry.getAttribute('position');
  assert.ok(position.count>500,'graphic marks cover the field at low triangle cost');
  const index=texture.geometry.index;
  let broad=0;
  for(let k=0;k<index.count;k+=3){
    const a=index.getX(k),b=index.getX(k+1),c=index.getX(k+2);
    const extent=Math.max(Math.hypot(position.getX(a)-position.getX(b),position.getZ(a)-position.getZ(b)),Math.hypot(position.getX(a)-position.getX(c),position.getZ(a)-position.getZ(c)));
    if(extent>3) broad++;
  }
  assert.ok(broad>140,'garden has readable, broad graphic ground motifs at phone distance');
  for(let i=0;i<position.count;i+=Math.max(1,Math.floor(position.count/200))){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    assert.ok(y-groundHeight(x,z)>0&&y-groundHeight(x,z)<.15,'marks conform to terrain');
  }
});

test('garden terrain colors keep the same dark falloff as the continuous heightfield perimeter',async()=>{
  const scene=new T.Scene(),world=await preparedWorld(scene,true);world.update(new T.PerspectiveCamera(),.4);
  const ground=scene.getObjectsByProperty('name','continuous-3d-ground')[0];
  const colors=ground.geometry.getAttribute('color');
  const center=colors.getY(25*69+35),edge=colors.getY(0*69+35),far=colors.getY(25*69+68);
  assert.ok(edge<center*.1,'left edge is dark rather than a green slab');
  assert.ok(far<center*.1,'far edge also fades into the world');
});
