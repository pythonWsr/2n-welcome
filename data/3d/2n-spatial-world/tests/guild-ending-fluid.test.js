import test from 'node:test';
import assert from 'node:assert/strict';
const fluid=await import('../src/guild-ending-fluid.js').catch(()=>null);
test('fluid carries incoming velocity instead of replacing positions with a timed shape',()=>{
 assert.equal(typeof fluid?.stepFluidParticle,'function');
 const p=[0,30,-14],v=[20,0,0],seed=[.2,.4,.6,1];
 const a=fluid.stepFluidParticle(p,v,seed,.18,1/60,[],[0,43,-14]);
 assert.ok(a.position[0]>0);assert.ok(a.velocity[0]>15,'inertia survives the first step');
 const b=fluid.stepFluidParticle(p,[-20,0,0],seed,.18,1/60,[],[0,43,-14]);
 assert.ok(b.position[0]<0,'previous velocity changes the next position');
});
test('gate force is local, finite and changes motion when a particle approaches the opening',()=>{
 assert.equal(typeof fluid?.stepFluidParticle,'function');
 const gate={center:[0,30,-14],normal:[0,0,1],radius:40,visibility:1};
 const p=[18,30,-12],v=[0,0,-12],seed=[.2,.4,.6,1];
 const a=fluid.stepFluidParticle(p,v,seed,.35,1/60,[gate],[0,43,-14]);
 const b=fluid.stepFluidParticle(p,v,seed,.35,1/60,[],[0,43,-14]);
 assert.ok(Math.hypot(...a.velocity.map((x,i)=>x-b.velocity[i]))>.05);
 const far=[500,30,-12];
 assert.deepEqual(fluid.stepFluidParticle(far,v,seed,.35,1/60,[gate],[0,43,-14]),fluid.stepFluidParticle(far,v,seed,.35,1/60,[],[0,43,-14]));
});
test('fixed-step playback replays and seeks to the same physical state',()=>{
 assert.equal(typeof fluid?.createFluidClock,'function');
 const run=()=>{let total=0,state;const clock=fluid.createFluidClock(()=>{total=0;state={position:[2,30,-14],velocity:[12,1,-3]};},(t,dt)=>{total++;state=fluid.stepFluidParticle(state.position,state.velocity,[.2,.4,.6,1],t,dt,[],[0,43,-14]);});return {clock,get total(){return total;},get state(){return state;}};};
 const a=run(),b=run();a.clock.seek(.55);for(let p=.19;p<.55;p+=.01)b.clock.seek(p);b.clock.seek(.55);
 assert.equal(a.total,b.total);assert.deepEqual(a.state,b.state);a.clock.seek(.3);a.clock.seek(.55);assert.equal(a.total,b.total);assert.deepEqual(a.state,b.state);
 const paused=structuredClone(a.state);a.clock.seek(.55);assert.deepEqual(a.state,paused);
});
test('backscroll restores coupled material guides, particle motion and gate feedback from the same progress',async()=>{
 const {createMaterialGuides}=await import('../src/guild-ending-material.js');
 const {endingStreamPoint}=await import('../src/guild-ending-flow.js');
 function run(){
  const material=createMaterialGuides();let states,hits;
  const clock=fluid.createFluidClock(()=>{
   material.reset(.46,false);hits=new Float32Array(6).fill(-10);
   states=Array.from({length:64},(_,i)=>{const seed=[i*.61803398875%1,i*.41421356237%1,i*.73205080757%1,i%5],p=endingStreamPoint(seed,.18,.46),n=endingStreamPoint(seed,.18001,.46);return {seed,p,v:p.map((x,k)=>(n[k]-x)/.00018)};});
  },(t,dt)=>{
   const gates=fluid.fluidGateStates(t,.46),bulk=fluid.fluidVolumePressure(states,.46),volume={...bulk,material};
   for(const s of states){const next=fluid.stepFluidParticle(s.p,s.v,s.seed,t,dt,gates,[0,43,-14],.46,false,volume);fluid.recordFluidPassage(hits,s.p,next.position,t,gates);s.p=next.position;s.v=next.velocity;}
   material.step(t,dt,gates,bulk,fluid.stepFluidParticle);
  });
  return {clock,snapshot:()=>JSON.stringify({states,guides:material.textures.map(t=>Array.from(t.image.data)),hits:Array.from(hits)}),dispose:()=>material.dispose()};
 }
 const direct=run(),scrub=run();
 try{
  direct.clock.seek(.44);const expected=direct.snapshot();scrub.clock.seek(.97);scrub.clock.seek(.44);
  assert.equal(scrub.snapshot()===expected,true,'rewind includes transported frames and gate feedback, not just positions');
  scrub.clock.seek(.44);assert.equal(scrub.snapshot()===expected,true,'holding scroll never integrates another tick');
  scrub.clock.seek(.7);scrub.clock.seek(.44);assert.equal(scrub.snapshot()===expected,true);
 }finally{direct.dispose();scrub.dispose();}
});
test('a visible aperture crossing excites a ripple, off-aperture travel does not',()=>{
 assert.equal(typeof fluid?.recordFluidPassage,'function');
 const gates=[{center:[0,0,0],normal:[0,0,1],radius:10,visibility:1}],hits=new Float32Array(1).fill(-10);
 fluid.recordFluidPassage(hits,[-2,0,-1],[-2,0,1],.4,gates);assert.ok(Math.abs(hits[0]-.4)<1e-6);
 fluid.recordFluidPassage(hits,[20,0,-1],[20,0,1],.7,gates);assert.ok(Math.abs(hits[0]-.4)<1e-6);
});
test('physical central hold retains broad depth and height instead of collapsing into a sheet',async()=>{
 assert.equal(typeof fluid.fluidVolumePressure,'function');
 const {endingStreamPoint}=await import('../src/guild-ending-flow.js');
 const {createMaterialGuides}=await import('../src/guild-ending-material.js');
 const material=createMaterialGuides();material.reset(.6,false);
 const states=Array.from({length:96},(_,i)=>{const seed=[i*.61803398875%1,i*.41421356237%1,i*.73205080757%1,i%5];return {p:endingStreamPoint(seed,.18,.6),v:[0,0,0],seed};});
 for(let tick=0;tick<562;tick++){
  const t=.18+tick/1080,gates=fluid.fluidGateStates(t,.6);
  const bulk=fluid.fluidVolumePressure(states,.6),volume={...bulk,material};
  for(const s of states){const next=fluid.stepFluidParticle(s.p,s.v,s.seed,t,1/60,gates,[0,43,-14],.6,false,volume);s.p=next.position;s.v=next.velocity;}
  material.step(t,1/60,gates,bulk,fluid.stepFluidParticle);
 }
 for(let k=0;k<3;k++)assert.ok(Math.max(...states.map(s=>s.p[k]))-Math.min(...states.map(s=>s.p[k]))>50,'central fluid cannot collapse to a thin plane');
 const center=fluid.fluidVolumePressure(states,.6).center;
 assert.ok(Math.hypot(center[0],center[1]-43,center[2]+14)<8,'the broad unshaped mass returns to the middle before glyph attraction');
 material.dispose();
});
test('portrait-scaled frame rejects a crossing outside its rectangular opening',()=>{
 const inverse=[.25,0,0,0,0,.125,0,0,0,0,.1,0,0,0,0,1];
 const gate={center:[0,0,0],normal:[0,0,1],radius:10,visibility:1,inverse},hits=new Float32Array(1).fill(-10);
 fluid.recordFluidPassage(hits,[6,0,-1],[6,0,1],.4,[gate]);assert.equal(hits[0],-10);
});
