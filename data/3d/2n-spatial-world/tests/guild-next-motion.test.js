import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createMemoryScene} from '../src/guild-memory-scene.js';
import {createMemoryLayout,memoryPoint} from '../src/guild-memory-layout.js';
const api=await import('../src/guild-next-motion.js').catch(()=>({}));
const a={u:.4,branch:0,longitude:1.2,latitude:.6},p=[40,20,-12],pose={position:[-4,7,198],target:[0,0,-14]};
test('next path starts at actual expanded shell, is reversible and has smooth endpoints',()=>{
 assert.equal(typeof api.nextPoint,'function');
 for(const t of [0,3/16])assert.deepEqual(api.nextPoint(a,p,t),p);
 assert.deepEqual(api.nextCamera(pose,0),pose);
 const end=api.nextPoint(a,p,1);assert.notDeepEqual(end,p);assert.deepEqual(api.nextPoint(a,p,.6),api.nextPoint(a,p,.6));
 assert.notDeepEqual(end,api.nextPoint({...a,u:.8},p,1));
 for(const t of [3/16,10/16]){const q=api.nextPoint(a,p,t),r=api.nextPoint(a,p,t+1e-5);assert.ok(Math.hypot(...q.map((v,i)=>v-r[i]))<1e-5);}
 for(const t of [-1,0,.4,1,2,NaN])assert.ok(api.nextPoint(a,p,t).every(Number.isFinite));
 const camera=api.nextCamera(pose,1);assert.ok(camera.position[2]<pose.position[2]);
});
test('same rendered petal IDs open into depth without reallocating or modifying source material',()=>{
 const scene=createMemoryScene();const source=new T.Mesh(new T.BoxGeometry(3,1,2),new T.MeshStandardMaterial({color:0xff3333}));scene.install(source,'a','b');
 const cam=new T.PerspectiveCamera(48,.6,.2,2400);
 const capture=t=>{scene.update({memoryPhase:2,eventIndex:2,nextT:t},cam,0);return scene.group.children.filter(o=>o.isInstancedMesh).map(o=>Array.from(o.instanceMatrix.array));};
 const before=capture(undefined),pools=scene.group.children.filter(o=>o.isInstancedMesh),count=scene.instanceCount;
 assert.deepEqual(capture(0),before);const opened=capture(1);assert.notDeepEqual(opened,before);
 assert.deepEqual(capture(0),before);assert.equal(scene.instanceCount,count);assert.deepEqual(scene.group.children.filter(o=>o.isInstancedMesh),pools);
 assert.equal(source.material.opacity,1);assert.equal(source.material.color.getHex(),0xff3333);scene.dispose();
});
test('ending arc curves around the right, with open left space and genuine depth in portrait and landscape',()=>{
 const layout=createMemoryLayout({assets:[{key:'petal',radius:2.2}]});
 for(const aspect of [.46,.6,1.8]){
  const cam=new T.PerspectiveCamera(48,aspect,.2,2400),end=api.nextCamera(pose,1);
  cam.position.fromArray(end.position);cam.lookAt(...end.target);cam.updateMatrixWorld();
  const frame=api.nextArcFrame(pose,{aspect,fov:48});
  const points=layout.anchors.map(a=>new T.Vector3(...api.nextPoint(a,memoryPoint(a,2,0),1,frame)));
  const projected=points.map(p=>p.clone().project(cam));
  assert.ok(projected.every(p=>p.x>-.1&&p.x<.98&&Math.abs(p.y)<.9),'arc must fit without left side rail');
  const middle=projected.filter(p=>Math.abs(p.y)<.2),tips=projected.filter(p=>Math.abs(p.y)>.65);
  assert.ok(middle.length&&tips.length);
  assert.ok(Math.min(...middle.map(p=>p.x))>Math.max(...tips.map(p=>p.x))+.2,'middle must bulge right rather than form a vertical rail');
  const depths=points.map(p=>-p.applyMatrix4(cam.matrixWorldInverse).z);
  assert.ok(Math.max(...depths)-Math.min(...depths)>80,'preserve front/rear depth');
 }
});
test('ending individual breathing survives the settled arc without translating its whole shape',()=>{
 const frame=api.nextArcFrame(pose,{aspect:.6,fov:48});
 const base=api.nextPoint(a,[40,a.latitude*90.3,-12],1,frame);
 const up=api.nextPoint(a,[40,a.latitude*90.3+3,-12],1,frame);
 assert.ok(Math.hypot(...up.map((v,i)=>v-base[i]))>2.9);
 assert.deepEqual(api.nextPoint(a,p,0,frame),p);
});

test('spatial crescent spreads all identities across depth and projected area instead of a thin rail',()=>{
 const layout=createMemoryLayout({assets:[{key:'petal',radius:2.2}]});
 for(const aspect of [.46,.6,1.8]){
  const frame=api.nextArcFrame(pose,{aspect,fov:48,anchors:layout.anchors});
  const inverse=frame.matrix.clone().invert();
  for(const time of [0,6,18,42]){
   const local=layout.anchors.map(a=>new T.Vector3(...api.nextPoint(a,memoryPoint(a,2,0),1,frame,{time})).applyMatrix4(inverse));
   const projected=local.map(p=>({x:p.x/(-p.z*frame.halfAngle*aspect),y:p.y/(-p.z*frame.halfAngle),r:3/(-p.z*frame.halfAngle)}));
   const depth=local.map(p=>-p.z);assert.ok(Math.max(...depth)/Math.min(...depth)>2.3,'near/far perspective must be legible');
   assert.ok(projected.every(p=>p.x>0&&p.x<1&&Math.abs(p.y)<.94),'portrait and landscape fit');
   let overlaps=0;for(let i=0;i<projected.length;i++)for(let j=0;j<i;j++){
    const a=projected[i],b=projected[j];if(Math.hypot((a.x-b.x)*aspect,a.y-b.y)<a.r+b.r)overlaps++;
   }
   assert.ok(overlaps<6,`screen stacking must be sparse (${overlaps})`);
   const middle=projected.filter(p=>Math.abs(p.y)<.45);
   assert.ok(Math.max(...middle.map(p=>p.x))-Math.min(...middle.map(p=>p.x))>.25,'arc has visible width');
  }
 }
});
test('settled petals orbit in three dimensions with independent phase and reduced-motion stability',()=>{
 const layout=createMemoryLayout({assets:[{key:'petal',radius:2.2}]});
 const frame=api.nextArcFrame(pose,{aspect:.6,anchors:layout.anchors}),inverse=frame.matrix.clone().invert();
 const positions=t=>layout.anchors.map(a=>new T.Vector3(...api.nextPoint(a,memoryPoint(a,2,0),1,frame,{time:t})).applyMatrix4(inverse));
 const before=positions(0),after=positions(5),later=positions(11);
 for(let i=0;i<before.length;i++)for(const axis of ['x','y','z'])assert.ok(Math.max(Math.abs(after[i][axis]-before[i][axis]),Math.abs(later[i][axis]-before[i][axis]))>.1,`${i} ${axis} must move across multiple samples`);
 assert.ok(after.some((v,i)=>v.z>before[i].z)&&after.some((v,i)=>v.z<before[i].z),'independent forward/back motion');
 for(const a of layout.anchors){const p=memoryPoint(a,2,0);assert.deepEqual(api.nextPoint(a,p,1,frame,{time:0,reducedMotion:true}),api.nextPoint(a,p,1,frame,{time:30,reducedMotion:true}));assert.deepEqual(api.nextPoint(a,p,0,frame,{time:30}),p);}
});

test('rendered final shot keeps its original pools and avoids stacked silhouettes while orbiting',()=>{
 for(const mobile of [true,false]){
  const scene=createMemoryScene({mobile}),source=new T.Mesh(new T.SphereGeometry(2.2,8,6),new T.MeshStandardMaterial());scene.install(source,'a','b');
  const cam=new T.PerspectiveCamera(48,mobile?.46:1.8,.2,2400);let pools;
  for(let step=0;step<480;step++){
   scene.update({memoryPhase:2,eventIndex:2,nextT:1},cam,.05);
   if(step===0)pools=scene.group.children.filter(o=>o.isInstancedMesh);
   if(step%120)continue;
   const points=[];for(const pool of pools)for(let i=0;i<pool.count;i++){
    const matrix=new T.Matrix4();pool.getMatrixAt(i,matrix);const world=new T.Vector3().setFromMatrixPosition(matrix),depth=-world.clone().applyMatrix4(cam.matrixWorldInverse).z;
    const screen=world.project(cam),radius=2.2*Math.max(...new T.Vector3().setFromMatrixScale(matrix).toArray())/(depth*Math.tan(T.MathUtils.degToRad(cam.fov/2)));
    points.push({x:screen.x,y:screen.y,radius});
   }
   assert.equal(points.length,mobile?56:84);assert.ok(points.every(p=>p.x>0&&p.x<1&&Math.abs(p.y)<.96));
   let overlaps=0;for(let i=0;i<points.length;i++)for(let j=0;j<i;j++){const a=points[i],b=points[j];if(Math.hypot((a.x-b.x)*cam.aspect,a.y-b.y)<a.radius+b.radius)overlaps++;}
   assert.ok(overlaps<6,`actual ${mobile?'phone':'desktop'} stacking: ${overlaps}`);
  }
  assert.deepEqual(scene.group.children.filter(o=>o.isInstancedMesh),pools);scene.dispose();source.geometry.dispose();source.material.dispose();
 }
});
