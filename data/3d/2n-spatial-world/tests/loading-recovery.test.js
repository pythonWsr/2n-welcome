import test from 'node:test';import assert from 'node:assert/strict';
import * as T from 'three';
import {createBiomes,prepareBiomePetals,limitUnreadyTravel} from '../src/biomes.js';
import {fetchPetalBytes,createPetalPipeline,cancelPendingModelLoads} from '../src/petal-loader.js';
import {coastalColor,oceanHeight} from '../src/ocean-production.js';
test('slow Garden never locks navigation or prevents Ocean preparation',async()=>{
 let release;const calls=[];const world=createBiomes(new T.Scene(),true,{garden:()=>{calls.push('garden');return new Promise(resolve=>release=resolve);},desert:async()=>{calls.push('desert');return {};},ocean:async()=>{calls.push('ocean');return {};}});
 const promise=prepareBiomePetals(world);assert.deepEqual(calls,['garden','desert','ocean']);assert.equal(limitUnreadyTravel(.9,.3,world),.9);release({});await promise;
});
test('a stalled request has a finite timeout and rejects instead of pending forever',async()=>{await assert.rejects(fetchPetalBytes('/test.glb',()=>new Promise(()=>{}),15),/timed out/);});
test('login HTML and server errors cannot be mistaken for model data',async()=>{await assert.rejects(fetchPetalBytes('/test.glb',async()=>new Response('<html>',{headers:{'content-type':'text/html'}})),/login page/);await assert.rejects(fetchPetalBytes('/test.glb',async()=>new Response('',{status:503})),/503/);});
test('Desert and Ocean continue across a lit, shallow coastline rather than a black trench',()=>{for(const x of [440,470,500,520,540,580,620]){assert.ok(oceanHeight(x,0)>-55);const c=coastalColor(x,0);assert.ok(c.r+c.g+c.b>.5);}const a=coastalColor(519.99,0),b=coastalColor(520.01,0);assert.ok(Math.abs(a.r-b.r)+Math.abs(a.g-b.g)+Math.abs(a.b-b.b)<.002);});

test('failed region can retry while already prepared regions stay intact',async()=>{
 let attempts=0;const world=createBiomes(new T.Scene(),true,{garden:async()=>{attempts++;if(attempts===1)throw new Error('offline');return {};},desert:async()=>({}),ocean:async()=>({})});
 await prepareBiomePetals(world);assert.equal(world.petalStatus,'error');assert.equal(world.oceanPetalStatus,'ready');await prepareBiomePetals(world);assert.equal(world.petalStatus,'ready');assert.equal(attempts,2);
});


test('a failed batch can clear queued downloads without discarding the active successful model',async()=>{
 const pipeline=createPetalPipeline(1,1);let release,queuedStarted=false;
 const active=pipeline(()=>new Promise(resolve=>release=resolve),async bytes=>bytes);
 const queued=pipeline(async()=>{queuedStarted=true;return 2;},async bytes=>bytes);
 const rejection=assert.rejects(queued,/批次已停止/);
 await new Promise(resolve=>setImmediate(resolve));cancelPendingModelLoads();release(1);
 assert.equal(await active,1);await rejection;assert.equal(queuedStarted,false);
 assert.equal(await pipeline(async()=>3,async bytes=>bytes),3,'queue cannot restart after cancellation');
});
