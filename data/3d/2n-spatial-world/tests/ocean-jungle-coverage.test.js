import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRegionNames} from '../src/region-names.js';
import {oceanPose,coastalColor} from '../src/ocean-production.js';
import {createJunglePetals,JUNGLE_POPULATION} from '../src/jungle-production.js';
test('Ocean title waits until the camera has reached blue Ocean ground',()=>{
 for(const aspect of [390/844,16/9]){
  const camera=new T.PerspectiveCamera(48,aspect,.2,2400),labels=createRegionNames(n=>new T.Texture({width:n.length*82+64,height:192}));let shown=0;
  for(let i=0;i<=200;i++){oceanPose(i/200,camera,aspect<1);labels.update(camera);const label=labels.group.children[2];if(label.visible&&label.material.opacity>.05){shown++;const color=coastalColor(camera.position.x, camera.position.z);assert.ok(color.b>color.r*1.2,`Ocean title over beige ground at x=${camera.position.x}`);}}
  assert.ok(shown>=8);
 }
});
test('Jungle has petals throughout the formerly empty middle spans',()=>{
 const catalog=Object.fromEntries(Object.keys(JUNGLE_POPULATION).map(n=>[n,{geometry:new T.BoxGeometry(1,1,.3),material:new T.MeshStandardMaterial()}]));
 const group=createJunglePetals(catalog,true),m=new T.Matrix4(),bins=Array(10).fill(0);
 for(const batch of group.children)for(let i=0;i<batch.count;i++){batch.getMatrixAt(i,m);const x=m.elements[12],z=m.elements[14],bin=Math.floor((x-930)/25);if(bin>=0&&bin<10&&Math.abs(z)<65)bins[bin]++;}
 for(const [i,n] of bins.entries())assert.ok(n>=3,`empty middle lane ${930+i*25}: ${n} petals`);
});
