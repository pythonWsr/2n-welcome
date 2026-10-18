import test from 'node:test';
import assert from 'node:assert/strict';
import * as timeline from '../src/guild-ending-fluid.js';
import {DataUtils} from 'three';
import {createMaterialGuides} from '../src/guild-ending-material.js';
import {endingStreamPoint} from '../src/guild-ending-flow.js';

test('cached reverse playback never resets or reintegrates the physical history',()=>{
 assert.equal(typeof timeline.createFluidTimeline,'function');
 let resets=0,steps=0,state=0,released=0;
 const cache=timeline.createFluidTimeline({reset(){resets++;state=0;},step(){steps++;state++;},capture:()=>state,release(){released++;}});
 while(!cache.ready)cache.warm(3);
 assert.equal(resets,1);assert.equal(steps,885);
 const initialSteps=steps;
 for(let i=0;i<600;i++){
  const t=.18+(885-i)/1080,s=cache.sample(t);
  const value=s.frames.reduce((sum,frame,j)=>sum+frame*s.weights[j],0);
  assert.ok(Math.abs(value-(t-.18)*1080)<1e-8,'continuous cached samples retain every physical tick, including subframes');
 }
 assert.equal(steps,initialSteps);assert.equal(resets,1);
 cache.invalidate();assert.equal(cache.ready,false);assert.equal(released,60);
 cache.warm(2);assert.equal(resets,2);assert.equal(steps-initialSteps,2,'rebuilds have a strict per-frame work budget');
 cache.dispose();assert.equal(released,61,'all allocated history is released');
});

test('half-float cached physical motion stays close to the integrated path across gates and gathering',()=>{
 const material=createMaterialGuides(),history=[];let states;
 const cache=timeline.createFluidTimeline({reset(){
  material.reset(.46,false);
  states=Array.from({length:8},(_,i)=>{const seed=[i*.61803398875%1,i*.41421356237%1,i*.73205080757%1,i%5],p=endingStreamPoint(seed,.18,.46),n=endingStreamPoint(seed,.18001,.46);return {seed,p,v:p.map((x,k)=>(n[k]-x)/.00018)};});
  history.push(states.map(s=>s.p.slice()));
 },step(t,dt){
  const gates=timeline.fluidGateStates(t,.46),bulk=timeline.fluidVolumePressure(states,.46),volume={...bulk,material};
  for(const s of states){const n=timeline.stepFluidParticle(s.p,s.v,s.seed,t,dt,gates,[0,43,-14],.46,false,volume);s.p=n.position;s.v=n.velocity;}
  material.step(t,dt,gates,bulk,timeline.stepFluidParticle);history.push(states.map(s=>s.p.slice()));
 },capture:()=>states.map(s=>s.p.map(x=>DataUtils.fromHalfFloat(DataUtils.toHalfFloat(x)))),release(){}});
 try{
  while(!cache.ready)cache.warm(4);
  let maxError=0;
  for(let tick=0;tick<=885;tick++){
   const s=cache.sample(.18+tick/1080);
   for(let i=0;i<8;i++){
    const p=[0,1,2].map(k=>s.frames.reduce((v,frame,j)=>v+frame[i][k]*s.weights[j],0));
    maxError=Math.max(maxError,Math.hypot(...p.map((v,k)=>v-history[tick][i][k])));
   }
  }
  assert.ok(maxError<1,`physical path interpolation error ${maxError} world units must stay below one world unit`);
 }finally{cache.dispose();material.dispose();}
});

test('cached interpolation is continuous in position and velocity across stored frames',()=>{
 assert.equal(typeof timeline.createFluidTimeline,'function');
 let tick=0;
 const cache=timeline.createFluidTimeline({reset(){tick=0;},step(){tick++;},capture:()=>Math.sin(tick/100),release(){}});
 while(!cache.ready)cache.warm(4);
 const sample=t=>{const s=cache.sample(.18+t/1080);return s.frames.reduce((v,x,i)=>v+x*s.weights[i],0);};
 for(let tick=30;tick<850;tick+=15){
  const h=.001,left=(sample(tick)-sample(tick-h))/h,right=(sample(tick+h)-sample(tick))/h;
  assert.ok(Math.abs(left-right)<1e-6,'no velocity seam at a cache boundary');
  assert.ok(Math.abs(sample(tick)-Math.sin(tick/100))<1e-10);
 }
 assert.ok(cache.frameCount*262144*8<=128*1024*1024,'full particle history is bounded to 128 MiB, not a 60fps multi-GB recording');
 cache.dispose();
});
