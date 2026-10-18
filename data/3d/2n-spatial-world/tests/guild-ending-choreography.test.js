import test from 'node:test';
import assert from 'node:assert/strict';
import {endingFlowPoint,endingStreamPoint} from '../src/guild-ending-flow.js';
import {createEndingParticles,endingPetalPoint} from '../src/guild-ending-particles.js';
const seed=[.2,.4,.6,1],cloud=[-22,18,12],mark=[12,46,-10];
test('opening keeps the original broad five-colour star stream before the gate segment',()=>{
 assert.deepEqual(endingFlowPoint(cloud,mark,seed,.1,.6),endingStreamPoint(seed,.1,.6));
 const turn=seed[0]*Math.PI*2,rad=32+seed[1]*68,angle=seed[3]*1.256637+seed[1]*5;
 const base=[Math.cos(angle)*rad*.65+Math.sin(turn)*5,30+(seed[1]-.5)*140+Math.cos(turn)*5,-14+Math.sin(angle)*rad+seed[2]*10];
 assert.ok(Math.hypot(...endingStreamPoint(seed,.1,.6).map((v,i)=>v-base[i]))<4);
});
test('gates and central unshaped gathering never depend on glyph surface coordinates',()=>{
 for(const t of [.1,.3,.42,.55,.65,.73])assert.deepEqual(endingFlowPoint(cloud,mark,seed,t,.6),endingFlowPoint(cloud,[-60,-20,80],seed,t,.6));
 assert.notDeepEqual(endingFlowPoint(cloud,mark,seed,.85,.6),endingFlowPoint(cloud,[-60,-20,80],seed,.85,.6));
 assert.deepEqual(endingFlowPoint(cloud,mark,seed,1,.6),mark);
});
test('gate dust deforms rather than translating identical compact clouds',()=>{
 const a=[.1,.3,.7,0],b=[.8,.6,.2,3];
 const delta=t=>endingFlowPoint(cloud,mark,a,t,.6).map((v,i)=>v-endingFlowPoint(cloud,mark,b,t,.6)[i]);
 assert.ok(Math.hypot(...delta(.35).map((v,i)=>v-delta(.48)[i]))>20);
});
test('petal escorts change depth and paths through the gates before final layout',()=>{
 const a={id:'x',u:.2,longitude:1,branch:1},start=[0,0,0];
 const p=endingPetalPoint(a,start,.3,0),q=endingPetalPoint(a,start,.5,0);
 assert.ok(Math.hypot(...p.map((v,i)=>v-q[i]))>20);assert.ok(Math.abs(p[2]-q[2])>15);
});

test('opening shader retains the legacy reveal, point size and unwhitened biome palette',()=>{
 const swarm=createEndingParticles(),shader=swarm.points.material.vertexShader;
 assert.ok(shader.includes('legacyReveal=ease((uT-aSeed.z*.07)/.12)'));
 assert.ok(shader.includes('star*.25*(1.-frontStage)'));
 assert.ok(shader.includes('1.1,frontStage)'));
 swarm.dispose();
});
test('central gathering fills a larger volume and visibly shears internally before glyph reveal',()=>{
 const points=[],later=[];
 for(let i=0;i<1200;i++){
  const seed=[i*.61803398875%1,i*.41421356237%1,i*.73205080757%1,i%5];
  points.push(endingFlowPoint(cloud,mark,seed,.70,.6));later.push(endingFlowPoint(cloud,mark,seed,.78,.6));
  assert.deepEqual(later.at(-1),endingFlowPoint(cloud,[-90,60,10],seed,.78,.6));
 }
 for(let k=0;k<3;k++)assert.ok(Math.max(...points.map(p=>p[k]))-Math.min(...points.map(p=>p[k]))>65,'the central volume must be visibly enlarged');
 let sheared=0;for(let i=1;i<points.length;i++)if(Math.abs(Math.hypot(...points[i].map((v,k)=>v-points[0][k]))-Math.hypot(...later[i].map((v,k)=>v-later[0][k])))>3)sheared++;
 assert.ok(sheared>points.length/2,'internal deformation cannot be only rigid rotation');
});
