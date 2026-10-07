import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as T from 'three';
import {createCompanionship} from '../src/companionship.js';
test('near-field display catalog has restored geometry and source-resolution images for all fourteen species',()=>{
 const path=new URL('../public/assets/companion-display/report.json',import.meta.url);
 assert.ok(existsSync(path),'high-detail display catalog is absent');
 const report=JSON.parse(readFileSync(path));assert.equal(report.length,14);
 for(const r of report){assert.ok(r.display_triangles>=r.ground_triangles*2,r.name+' was merely a renamed ground model');assert.ok(r.texture_size[0]>=1024&&r.texture_size[1]>=1024);assert.ok(Math.min(...Object.values(r.silhouette_iou))>.97,'display silhouette lost');}
});
test('high-detail display handoff preserves the exact world-space center and restores original terrain',()=>{
 const scene=new T.Scene(),root=new T.Group();root.name='florr-petal-assembly';scene.add(root);
 const ground=new T.Mesh(new T.BoxGeometry(2,.2,2),new T.MeshStandardMaterial()),batch=new T.InstancedMesh(ground.geometry,ground.material,1),native=new T.Matrix4().makeTranslation(166,-30,10);batch.setMatrixAt(0,native);root.add(batch);
 const rig=createCompanionship(scene);rig.install(ground,'garden','rose');
 const display=new T.Mesh(new T.BoxGeometry(20,2,20).translate(5,3,2),new T.MeshStandardMaterial());
 assert.equal(typeof rig.installDisplay,'function','separate display assets are not implemented');rig.installDisplay(display,'garden','rose');
 const mesh=rig.group.getObjectByName('companion-garden:rose');assert.notEqual(mesh.geometry,ground.geometry);
 rig.update(.653);const matrix=new T.Matrix4();mesh.getMatrixAt(0,matrix);
 assert.ok(mesh.geometry.boundingBox.getCenter(new T.Vector3()).applyMatrix4(matrix).distanceTo(new T.Vector3(166,-30,10))<1e-5);
 rig.update(1);batch.getMatrixAt(0,matrix);assert.equal(matrix.determinant(),0);
 rig.update(0);batch.getMatrixAt(0,matrix);assert.deepEqual(matrix.toArray(),native.toArray());rig.dispose();
});
test('Hell display upgrades keep each existing species identity instead of swapping skull and star',()=>{
 const original=JSON.parse(readFileSync(new URL('../studies/hell-asset-gate/web-asset-report.json',import.meta.url))),display=JSON.parse(readFileSync(new URL('../public/assets/companion-display/report.json',import.meta.url)));
 for(const asset of original)assert.equal(display.find(r=>r.name===asset.name).source_sha256,asset.source_sha256,asset.name+' changed identity');
});
test('Chinese text atlas uses exact integer glyph cells and power-of-two dimensions',()=>{
 const rig=createCompanionship(new T.Scene());
 try{for(const label of rig.group.children.filter(o=>o.userData.warmup)){
  const size=label.sdfGlyphSize,cols=2048/size,rows=256/(cols*4),height=size*rows;
  assert.ok(Number.isInteger(cols),'glyph cells do not divide atlas width');
  assert.ok(Number.isInteger(rows),'initial atlas has a fractional number of rows');
  assert.equal(Math.log2(size)%1,0,'SDF generator requires a power-of-two glyph size');
  assert.equal(Math.log2(height)%1,0,'initial atlas height must be power-of-two');
 }}finally{rig.dispose();}
});
