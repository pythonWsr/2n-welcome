import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {endingCamera} from '../src/guild-ending-particles.js';
const frames=await import('../src/guild-ending-frames.js').catch(()=>null);
const pose={position:[-4,7,198],target:[0,0,-14]};
test('dimension frames enter, unfold and extinguish before the final mark',()=>{
 assert.equal(typeof frames?.endingDimensionFrame,'function','dimension choreography must exist');
 for(const t of [0,1,.70,NaN,Infinity])assert.equal(frames.endingDimensionFrame(t).visibility,0);
 const f=frames.endingDimensionFrame(.35);assert.ok(f.visibility>.9);assert.ok(f.draw>.99);
 assert.equal(f.rotations.length,6);assert.notDeepEqual(f.rotations[0],f.rotations[1]);assert.notDeepEqual(f.rotations[1],f.rotations[2]);
 const saved=frames.endingDimensionFrame(.35);frames.endingDimensionFrame(.9);assert.deepEqual(frames.endingDimensionFrame(.35),saved);
 assert.deepEqual(frames.endingDimensionFrame(.3,true).rotations,frames.endingDimensionFrame(.45,true).rotations);
});
test('all 48 luminous gate segments fit the portrait camera throughout the rotating stage',()=>{
 assert.equal(typeof frames?.createEndingFrames,'function');const art=frames.createEndingFrames();
 const edges=[];art.group.traverse(o=>{if(o.userData.frameEdge)edges.push(o);});assert.equal(edges.length,48);
 for(const aspect of [.46,.6,1.8])for(const t of [.25,.35,.45]){
  art.update(t,aspect);art.group.updateMatrixWorld(true);
  const shot=endingCamera(pose,t),cam=new T.PerspectiveCamera(48,aspect);cam.position.fromArray(shot.position);cam.lookAt(...shot.target);cam.updateMatrixWorld();
  for(const edge of edges)if(edge.parent.visible)for(const y of [-.5,.5]){const screen=new T.Vector3(0,y,0).applyMatrix4(edge.matrixWorld).project(cam);assert.ok(Math.abs(screen.x)<.9&&Math.abs(screen.y)<.9,JSON.stringify({aspect,t,screen}));}
 }
 art.dispose();
});
test('frame replay restores visible edges and disposal releases every owned resource once',()=>{
 assert.equal(typeof frames?.createEndingFrames,'function');const art=frames.createEndingFrames(),resources=new Set();
 art.group.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});
 let released=0;for(const r of resources)r.addEventListener('dispose',()=>released++);
 art.update(.35,.46);assert.equal(art.group.visible,true);art.update(1,.46);assert.equal(art.group.visible,false);art.update(.35,.46);assert.equal(art.group.visible,true);
 art.dispose();art.dispose();assert.equal(released,resources.size);
});
test('particle passage light follows bounded moving gate openings, not a world-space plane',()=>{
 assert.equal(typeof frames?.endingDimensionTransforms,'function');assert.equal(typeof frames?.endingFaceProximity,'function');
 for(const t of [.31,.34])for(const aspect of [.46,1.8]){
  const matrices=frames.endingDimensionTransforms(t,aspect),face=new T.Vector3(.2,.3,0).applyMatrix4(matrices[0]),outside=new T.Vector3(4,4,0).applyMatrix4(matrices[0]);
  assert.ok(frames.endingFaceProximity(face.toArray(),t,aspect)>.9);
  assert.ok(frames.endingFaceProximity(outside.toArray(),t,aspect)<.01,'infinite face planes must not illuminate off-gate particles');
 }
 assert.equal(frames.endingFaceProximity([0,30,-14],1,.46),0);
});
