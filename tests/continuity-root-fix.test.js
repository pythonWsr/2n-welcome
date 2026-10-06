import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createMemoryScene} from '../src/guild-memory-scene.js';
import {applyMemoryEntry} from '../src/guild-memory-entry.js';
import {createHellGround} from '../src/hell-production.js';
const entry={position:[1630,114,87],target:[1630,55,3],up:[0,1,0]};
function camera(){const c=new T.PerspectiveCamera(48,414/896,.2,2400);c.position.fromArray(entry.position);c.lookAt(...entry.target);c.updateMatrixWorld();return c;}
// Catches dropped offscreen instances and the old synthesized 56-petal replacement.
test('handoff transfers existing identities including offscreen tail without filler',()=>{
 const source=new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial()),memory=createMemoryScene();memory.install(source,'garden','rose');
 const c=camera(),old=new T.Group();old.userData.departureAnchors=[];
 for(let i=0;i<8;i++){const p=new T.Vector3((i-5)*14,i%2?30:-30,-90).applyMatrix4(c.matrixWorld);old.userData.departureAnchors.push({id:'original-'+i,key:'garden:rose',branch:i%2,order:i,worldMatrix:new T.Matrix4().compose(p,c.quaternion,new T.Vector3(1,1,1)),geometry:source.geometry,material:source.material});}
 memory.captureEntry(old,c);assert.equal(memory.instanceCount,8,'capture must not pad to a new fixed count');
 for(const u of [0,.2,.6,1,.2]){memory.update({entryPose:entry,entryBlend:u,memoryPhase:0,eventIndex:0},c,0);const meshes=memory.group.children.filter(m=>m.isInstancedMesh);assert.deepEqual(meshes.flatMap(m=>m.userData.anchorIds).sort(),Array.from({length:8},(_,i)=>'original-'+i).sort());}
 memory.update({entryPose:entry,entryBlend:0,memoryPhase:0,eventIndex:0},c,0);memory.group.updateMatrixWorld(true);
 const m=memory.group.children.find(m=>m.isInstancedMesh),matrix=new T.Matrix4();for(let i=0;i<m.count;i++){m.getMatrixAt(i,matrix);matrix.premultiply(m.matrixWorld);const original=old.userData.departureAnchors.find(a=>a.id===m.userData.anchorIds[i]);assert.ok(new T.Vector3().setFromMatrixPosition(matrix).distanceTo(new T.Vector3().setFromMatrixPosition(original.worldMatrix))<1e-5);}
 memory.dispose();
});
// Catches history lights changing the still-visible terrain at entry.
test('story light does not illuminate terrain during the departure overlap',()=>{const memory=createMemoryScene();memory.install(new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),'a','b');const c=camera();for(const u of [0,.25,.5,.7]){memory.update({entryPose:entry,entryBlend:u,memoryPhase:0,eventIndex:0},c,0);assert.ok(memory.group.children.filter(x=>x.isLight).every(x=>!x.visible||x.intensity===0),'story lamps must stay off until terrain cleared');}memory.update({entryPose:entry,entryBlend:1,memoryPhase:0,eventIndex:0},c,0);assert.ok(memory.group.children.some(x=>x.isLight&&x.visible&&x.intensity>0));memory.dispose();});
// Catches a camera accelerating sideways instantly at the member/story boundary.
test('departure inherits the stationary final reading velocity and initially looks over ground',()=>{const c=camera(),g=new T.Group();c.position.set(0,3,190);c.lookAt(0,0,-14);applyMemoryEntry(c,g,entry,.00001);assert.ok(c.position.distanceTo(new T.Vector3(...entry.position))<.001,'zero incoming speed');const d=new T.Vector3(0,0,-1).applyQuaternion(c.quaternion);assert.ok(d.y<-.45);});
// Counts boundary edges: a top-only sheet has open edges; closed land must not.
test('Hell ground has sealed volume while its original top stays unchanged',()=>{const ground=createHellGround(),meshes=[];ground.traverse(m=>{if(m.isMesh)meshes.push(m)});const edges=new Map();for(const m of meshes){const p=m.geometry.attributes.position,idx=m.geometry.index;const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(3)).join(',');for(let i=0;i<idx.count;i+=3)for(let j=0;j<3;j++){const a=key(idx.getX(i+j)),b=key(idx.getX(i+(j+1)%3)),e=[a,b].sort().join('|');edges.set(e,(edges.get(e)||0)+1);}}assert.equal([...edges.values()].filter(n=>n===1).length,0,'land must have no open perimeter');ground.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});});

// Catches regressions to exporting only extras.count instead of source anchors.
test('actual companionship snapshot includes existing offscreen neighbors and exact visible poses',async()=>{
 const {createCompanionship}=await import('../src/companionship.js'),{createPeopleRoute,courtyardEnvironment}=await import('../src/people-courtyard.js');
 const scene=new T.Scene(),native=new T.Group();native.name='florr-petal-assembly';scene.add(native);
 const geometry=new T.BoxGeometry(3,1,2),material=new T.MeshStandardMaterial();const batch=new T.InstancedMesh(geometry,material,1);batch.setMatrixAt(0,new T.Matrix4().makeTranslation(100,-34,0));native.add(batch);
 const companion=createCompanionship(scene);scene.add(companion.group);companion.install(new T.Mesh(geometry,material),'garden','rose');
 const route=createPeopleRoute({leaders:[{id:'a',name:'a'}],members:Array.from({length:95},(_,i)=>'m'+i)});
 companion.update(1,0,1,route);const {sampleCourtyardView}=await import('../src/people-courtyard.js'),view=sampleCourtyardView(route,1);const c=camera();c.position.fromArray(view.position);c.lookAt(...view.target);c.updateMatrixWorld();
 const records=companion.captureChain(c),existing=new Set(courtyardEnvironment(route).map(p=>p.id));assert.ok(records.length>0);assert.ok(records.every(a=>existing.has(a.id)));assert.equal(new Set(records.map(a=>a.id)).size,records.length);
 assert.ok(records.some(a=>Math.abs(new T.Vector3().setFromMatrixPosition(a.worldMatrix).project(c).x)>1.5),'GPU-excluded tail must still be captured');
 const extras=companion.group.children.find(m=>m.name==='courtyard-garden:rose'),matrix=new T.Matrix4();for(const [slot,id] of extras.userData.anchorIds.entries()){const record=records.find(a=>a.id===id);assert.ok(record,`visible ${id} omitted`);extras.getMatrixAt(slot,matrix);assert.ok(matrix.equals(record.worldMatrix),'visible geometry retains its exact matrix');}
 companion.dispose();geometry.dispose();material.dispose();
});

// Fog must not toggle at the light-ramp boundary, including reverse scrolling.
test('captured petals retain fog continuously across departure completion',()=>{
 const memory=createMemoryScene(),source=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),old=new T.Group(),c=camera();memory.install(source,'a','b');
 old.userData.departureAnchors=[{id:'existing',key:'a:b',branch:0,order:0,worldMatrix:new T.Matrix4().makeTranslation(1630,140,0),geometry:source.geometry,material:source.material}];memory.captureEntry(old,c);
 for(const u of [.89,.91,.99,1,.91,.89]){memory.update({entryPose:entry,entryBlend:u,memoryPhase:0,eventIndex:0},c,0);memory.setTerrainVisible(false);assert.equal(memory.group.children.find(m=>m.isInstancedMesh).material.fog,true,'captured material fog must remain stable');}memory.dispose();
});
