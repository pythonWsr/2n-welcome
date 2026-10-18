import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
const m=await import('../src/guild-ending-material.js').catch(()=>null);
const fluid=await import('../src/guild-ending-fluid.js');

test('a material cross-section fills depth within a bounded flow, without scattering the stream',()=>{
 assert.equal(typeof m?.materialTarget,'function');
 const frame={center:[0,20,-30],u:[1,0,0],v:[0,0,1]},points=[];
 for(let i=0;i<1000;i++)points.push(m.materialTarget([i*.61803398875%1,.4,i*.73205080757%1,1],.4,.6,false,frame));
 for(const p of points)assert.ok(Math.hypot(p[0],p[1]-20,p[2]+30)<19,'thickness has a local boundary, never a whole-screen spray');
 for(const k of [0,2])assert.ok(Math.max(...points.map(p=>p[k]))-Math.min(...points.map(p=>p[k]))>18,'both section axes retain visible thickness');
});
test('central volume retains biome color regions instead of uniformly mixing every color everywhere',()=>{
 assert.equal(typeof m?.materialTarget,'function');
 const means=[];
 for(let g=0;g<5;g++){
  const p=Array.from({length:1000},(_,i)=>m.materialTarget([i*.61803398875%1,i*.41421356237%1,i*.73205080757%1,g],.70,.6,false,{center:[0,0,0],u:[1,0,0],v:[0,0,1]}));
  means.push([0,1,2].map(k=>p.reduce((n,q)=>n+q[k]/p.length,0)));
 }
 assert.ok(Math.hypot(...means[0].map((x,k)=>x-means[2][k]))>18,'opposite biome regions remain distinct');
});
test('central flow never clamps a finite band of particles onto the polar axis',()=>{
 const frame={center:[0,43,-14],u:[1,0,0],v:[0,0,1]};
 for(const t of [.64,.68,.72]){
  let collapsed=0;
  for(let i=0;i<12000;i++){
   const seed=[i*.61803398875%1,(i+.5)/12000,.3+(i*.73205080757%1)*.7,i%5];
   const p=m.materialTarget(seed,t,.6,false,frame);
   if(Math.hypot(p[0],p[2]+14)<.1)collapsed++;
  }
  assert.ok(collapsed<12,`a bright polar line is not a designed feature: ${collapsed} samples collapsed at ${t}`);
 }
});
test('material volume keeps moving internally while morph remains gradual and separate',()=>{
 assert.equal(typeof m?.materialTarget,'function');
 const frame={center:[0,0,0],u:[1,0,0],v:[0,0,1]},seed=[.2,.4,.6,1];
 assert.notDeepEqual(m.materialTarget(seed,.65,.6,false,frame),m.materialTarget(seed,.72,.6,false,frame));
 assert.equal(m.materialGlyphProgress(13/18,.5),0);
 assert.ok(m.materialGlyphProgress(14/18,.5)<.4);
 assert.equal(m.materialGlyphProgress(16.5/18,.5),1);
});
test('arrival spring gives a small damped rebound instead of a dead stop at the target',()=>{
 assert.equal(typeof m.materialSpring,'function');
 let p=-12,v=0,peak=-Infinity;
 for(let i=0;i<240;i++){
  const a=m.materialSpring([p,0,0],[v,0,0],[0,0,0],[0,0,0],.64);
  v+=a[0]/120;p+=v/120;peak=Math.max(peak,p);
 }
 assert.ok(peak>.1&&peak<1.5,`arrival has a controlled, visible rebound: ${peak}`);
 assert.ok(Math.abs(p)<.5&&Math.abs(v)<1,'rebound damps rather than becoming a repeated oscillation');
});
test('the actual force follows the local section instead of remaining on the inherited thin band',()=>{
 const guides=m.createMaterialGuides();guides.reset(.6,false);
 const seed=[.2,.4,.6,1],frame=guides.sample(seed),target=m.materialTarget(seed,.4,.6,false,frame);
 const p=frame.center,v=[0,0,0],volume={center:[0,43,-14],pressure:[0,0,0]};
 const old=fluid.fluidAcceleration(p,v,seed,.4,[],[0,43,-14],.6,false,volume);
 const actual=fluid.fluidAcceleration(p,v,seed,.4,[],[0,43,-14],.6,false,{...volume,material:guides});
 assert.ok(Math.hypot(...actual.map((x,k)=>x-old[k]))>10,'rendered force must use the bounded material section');
 guides.dispose();
});
for(const aspect of [.46,.6])test(`the current material simulation crosses visible gates and flows continuously at aspect ${aspect}`,async()=>{
 const {createEndingParticles,endingCamera}=await import('../src/guild-ending-particles.js');
 const {endingStreamPoint}=await import('../src/guild-ending-flow.js');
 const swarm=createEndingParticles(),geometry=swarm.points.geometry,material=m.createMaterialGuides();material.reset(aspect,false);
 function state(i){const seed=Array.from(geometry.getAttribute('aSeed').array.subarray(i*4,i*4+4)),p=endingStreamPoint(seed,.18,aspect),n=endingStreamPoint(seed,.18001,aspect),a=geometry.getAttribute('position');return {seed,p,v:p.map((x,k)=>(n[k]-x)/.00018),mark:[a.getX(i),a.getY(i),a.getZ(i)].map((x,k)=>x*Math.min(1.12,aspect*1.75)+[0,43,-14][k]),previous:Array(6).fill(null),passed:Array(6).fill(false)};}
 const particles=Array.from({length:256},(_,i)=>state(i*997)),probes=Array.from({length:64},(_,i)=>state(i*4093));let before;
 try{for(let tick=0;tick<=831;tick++){
  const t=.18+tick/1080,gates=fluid.fluidGateStates(t,aspect),bulk=fluid.fluidVolumePressure(probes,aspect),volume={...bulk,material};
  let hardStops=0;
  for(const s of [...particles,...probes]){
   s.previousWorld=s.p;
   const previousSpeed=Math.hypot(...s.v);
   const next=fluid.stepFluidParticle(s.p,s.v,s.seed,t,1/60,gates,s.mark,aspect,false,volume);
   if(previousSpeed>2&&Math.hypot(...next.velocity)<previousSpeed*.2)hardStops++;
   assert.ok(Math.hypot(...next.position.map((x,k)=>x-s.p[k]))<2.67,'no per-frame position teleport');s.p=next.position;s.v=next.velocity;
  }
  if(t<.95)assert.ok(hardStops<(particles.length+probes.length)*.25,`the whole swarm cannot lose its velocity in one tick at ${t}`);
  for(const s of particles)for(let i=0;i<gates.length;i++){
   const gate=gates[i],inverse=new T.Matrix4().fromArray(gate.inverse),p=new T.Vector3(...s.p).applyMatrix4(inverse),previous=new T.Vector3(...s.previousWorld).applyMatrix4(inverse);
   if(previous.z*p.z<=0&&Math.abs(p.x)<1&&Math.abs(p.y)<1&&gate.visibility>.1)s.passed[i]=true;
  }
  material.step(t,1/60,gates,bulk,fluid.stepFluidParticle);
  if(tick===507)before=particles.map(s=>s.p.slice());
  if(tick===615){
   const shot=endingCamera({position:[-4,7,198],target:[0,0,-14]},t),cam=new T.PerspectiveCamera(48,aspect);cam.position.fromArray(shot.position);cam.lookAt(...shot.target);cam.updateMatrixWorld();
   for(const s of particles){const p=new T.Vector3(...s.p).project(cam);assert.ok(Math.abs(p.x)<.85&&Math.abs(p.y)<.7,'the compact central volume must not become full-screen dust');}
   let relative=0;for(let i=1;i<particles.length;i++)relative+=Math.abs(Math.hypot(...particles[i].p.map((x,k)=>x-particles[0].p[k]))-Math.hypot(...before[i].map((x,k)=>x-before[0][k])));
   assert.ok(relative/particles.length>1,'central movement must be nonrigid');
  }
 }
 for(let i=0;i<6;i++){const count=particles.filter(p=>p.passed[i]).length;assert.ok(count/particles.length>.8,JSON.stringify({gate:i,count,total:particles.length}));}
 assert.ok(Math.max(...particles.map(s=>Math.hypot(...s.p.map((x,k)=>x-s.mark[k]))))<1,'physical convergence precedes the tiny final render correction');
 }finally{material.dispose();swarm.dispose();}
});
