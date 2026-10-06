import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoundedDisplayPipeline} from '../src/petal-loader.js';

test('HD pipeline overlaps three downloads but bounds retained jobs until decoding completes',async()=>{
 const pipeline=createBoundedDisplayPipeline();let fetched=0,active=0,max=0;const release=[];
 const jobs=Array.from({length:7},()=>pipeline(async()=>{fetched++;return new ArrayBuffer(4);},async()=>{active++;max=Math.max(max,active);await new Promise(r=>release.push(r));active--;}));
 for(let i=0;i<15;i++)await Promise.resolve();
 assert.equal(fetched,3);assert.equal(max,2);
 while(release.length||fetched<7){release.splice(0).forEach(r=>r());for(let i=0;i<20;i++)await Promise.resolve();}
 await Promise.all(jobs);assert.equal(max,2);
});
