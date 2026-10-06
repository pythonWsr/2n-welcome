import test from 'node:test';
import assert from 'node:assert/strict';
import {createMonument} from '../src/monument.js';
import {sculptureShapes} from '../src/sculpture-shapes.js';

test('two independent solids, no connector and no mobile substitute',()=>{
  const model=createMonument();assert.equal(model.children.length,2);
  assert.deepEqual(model.children.map(m=>m.name),['two-cut-solid','n-cut-solid']);
  for(const m of model.children){
    const g=m.geometry;assert.ok([...g.attributes.normal.array].every(Number.isFinite));
    const thickness=g.boundingBox.max.z-g.boundingBox.min.z;
    assert.ok(thickness>=7&&thickness<14);
    assert.equal(g.userData.construction,'pitched-contour-loft');
  }
});
test('base has square outer corner and direct diagonal-to-foot junction',()=>{
  const p=sculptureShapes().two.getPoints(48);
  for(const [x,y] of [[-24,-29],[-24,-20],[-15,-20],[17,-20],[17,-29]])
    assert.ok(p.some(v=>v.x===x&&v.y===y));
});
test('n retains a vertical stem and defined shoulder instead of a U bend',()=>{
  const p=sculptureShapes().n.getPoints(48);
  for(const [x,y] of [[18.4,20],[18.4,44],[23.8,44],[23.8,40.5],[27.5,44],[33.5,44]])
    assert.ok(p.some(v=>v.x===x&&v.y===y));
});
