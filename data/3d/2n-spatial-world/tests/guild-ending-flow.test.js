import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {endingFlowPoint,ENDING_FLOW_GLSL} from '../src/guild-ending-flow.js';
import {createEndingParticles} from '../src/guild-ending-particles.js';
import {endingDimensionTransforms,endingDimensionFrame,ENDING_GATE_COUNT} from '../src/guild-ending-frames.js';
const cloud=[-22,18,12],mark=[12,46,-10],seed=[.2,.4,.6,1];
test('rendered flow uses the same continuous route through gates and into the original mark',()=>{
 const swarm=createEndingParticles();assert.ok(swarm.points.material.vertexShader.includes(ENDING_FLOW_GLSL));
 assert.deepEqual(endingFlowPoint(cloud,mark,seed,1,.6),mark);
 const h=1e-6;
 for(const t of [.18,.26,.30,.36,.46,.55,.58,.63,.70,.74,.82]){
  const a=endingFlowPoint(cloud,mark,seed,t-h,.6),b=endingFlowPoint(cloud,mark,seed,t,.6),c=endingFlowPoint(cloud,mark,seed,t+h,.6);
  const left=b.map((v,i)=>(v-a[i])/h),right=c.map((v,i)=>(v-b[i])/h);
  assert.ok(Math.hypot(...left)>2,'movement must not freeze before the mark');
  assert.ok(Math.hypot(...left.map((v,i)=>v-right[i]))<.2,'joined velocity must be continuous');
 }
 swarm.dispose();
});
test('gates separate in depth, move as particles pass, and each retires independently',()=>{
 const a=endingDimensionTransforms(.34,.6),b=endingDimensionTransforms(.42,.6);
 const centers=a.map(m=>new T.Vector3().setFromMatrixPosition(m));
 assert.ok(Math.max(...centers.map(p=>p.z))-Math.min(...centers.map(p=>p.z))>20);
 assert.ok(Math.max(...centers.map(p=>p.y))-Math.min(...centers.map(p=>p.y))>50);
 for(let i=0;i<ENDING_GATE_COUNT;i++)assert.ok(a[i].elements.some((v,k)=>Math.abs(v-b[i].elements[k])>.01),'each frame moves');
 const f=endingDimensionFrame(.42);assert.equal(f.gates.length,ENDING_GATE_COUNT);assert.notEqual(f.gates[0].visibility,f.gates[2].visibility);
});
test('flow stays volumetric and fits the portrait camera while closing onto sampled surfaces',async()=>{
 const {endingNebulaPoint,endingCamera}=await import('../src/guild-ending-particles.js');
 const swarm=createEndingParticles(),glyph=swarm.points.geometry.getAttribute('position');
 for(const aspect of [.46,.6,1.8])for(const t of [.32,.35,.45,.55,.65,.70,.78,.90,1]){
  const shot=endingCamera({position:[-4,7,198],target:[0,0,-14]},t);
  const cam=new T.PerspectiveCamera(48,aspect);cam.position.fromArray(shot.position);cam.lookAt(...shot.target);cam.updateMatrixWorld();
  const points=[];
  for(let i=0;i<1200;i++){
   const seed=[(i*.61803398875)%1,(i*.41421356237)%1,(i*.73205080757)%1,i%5];
   const cloud=endingNebulaPoint(...seed),scale=Math.min(1.12,aspect*1.75);
   const mark=[glyph.getX(i)*scale,glyph.getY(i)*scale+43,glyph.getZ(i)*scale-14];
   const p=endingFlowPoint(cloud,mark,seed,t,aspect),screen=new T.Vector3(...p).project(cam);points.push(p);
   assert.ok(Math.abs(screen.x)<.95&&Math.abs(screen.y)<.95&&screen.z<1,JSON.stringify({aspect,t,screen}));
   if(t>=.90)assert.ok(p.every((v,k)=>Math.abs(v-mark[k])<1e-7));
  }
  if(t===.35)for(const axis of [0,1,2])assert.ok(Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]))>15,'the moving dust is a volume, not several lines');
 }
 swarm.dispose();
});
test('legacy analytic path samples cross each moving gate opening while it is visible',()=>{
 const swarm=createEndingParticles(),geo=swarm.points.geometry;
 for(const aspect of [.46,.6])for(const reduced of [false,true]){
  const steps=[];
  for(let t=.12;t<.66;t+=.002)steps.push({t,inverses:endingDimensionTransforms(t,aspect,reduced).map(m=>m.invert()),gates:endingDimensionFrame(t,reduced).gates});
  const passed=Array(ENDING_GATE_COUNT).fill(0),count=256;
  for(let n=0;n<count;n++){
   const i=n*997,seed=Array.from({length:4},(_,k)=>geo.getAttribute('aSeed').array[i*4+k]);
   const cloud=Array.from({length:3},(_,k)=>geo.getAttribute('aCloud').array[i*3+k]);
   const scale=Math.min(1.12,aspect*1.75),mark=Array.from({length:3},(_,k)=>geo.getAttribute('position').array[i*3+k]*scale+[0,43,-14][k]);
   const crossed=Array(ENDING_GATE_COUNT).fill(false),previous=Array(ENDING_GATE_COUNT).fill(null);
   for(const step of steps){
    const p=new T.Vector3(...endingFlowPoint(cloud,mark,seed,step.t,aspect,reduced));
    for(let g=0;g<ENDING_GATE_COUNT;g++){
     const local=p.clone().applyMatrix4(step.inverses[g]);
     if(previous[g]!==null&&previous[g]*local.z<=0&&step.gates[g].visibility>.1&&Math.abs(local.x)<=1&&Math.abs(local.y)<=1)crossed[g]=true;
     previous[g]=local.z;
    }
   }
   crossed.forEach((yes,g)=>{if(yes)passed[g]++;});
  }
  for(let g=0;g<ENDING_GATE_COUNT;g++)assert.ok(passed[g]/count>.9,JSON.stringify({aspect,reduced,gate:g,passed,count}));
 }
 swarm.dispose();
});
