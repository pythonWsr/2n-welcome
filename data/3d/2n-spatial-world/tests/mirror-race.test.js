import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fetchAssetBytes,modelCandidates} from '../src/asset-transport.js';
const bytes=Buffer.from('glTFsame-release-model');
const entry={url:'/assets/model-transport/test-hash.glb.gz',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
test('three independent requests start immediately but a fourth stays queued',async()=>{
 let active=0,peak=0,calls=0;const pending=[];
 const fetcher=(url,{signal})=>new Promise((resolve,reject)=>{
  calls++;active++;peak=Math.max(peak,active);
  signal.addEventListener('abort',()=>{active--;reject(new Error('aborted'));},{once:true});
  pending.push(resolve);if(calls===3){active--;resolve(new Response(bytes));}
 });
 const result=await fetchAssetBytes('/assets/test.glb',{entry,store:null,fetcher,mirrors:['https://one.example/','https://two.example/','https://three.example/'],timeout:60});
 assert.deepEqual(Buffer.from(result),bytes);assert.equal(peak,3);assert.equal(calls,3);
});
test('default mirrors can recover through GitHub Pages with the repository subpath',async()=>{
 const fetcher=async url=>url==='https://llhleo.github.io/2n-spatial-world/assets/model-transport/test-hash.glb.gz'?new Response(bytes):new Response('missing',{status:404});
 assert.deepEqual(Buffer.from(await fetchAssetBytes('/assets/test.glb',{entry,store:null,fetcher,timeout:100})),bytes);
});
test('CF custom domain and pages.dev are one provider; raw CDN is an independent first rival',()=>{
 const previous=globalThis.location;globalThis.location={href:'https://2n.llhleo.top/',origin:'https://2n.llhleo.top'};
 try{const rawMirror='https://cdn.jsdelivr.net/gh/test/model.glb';const urls=modelCandidates({...entry,rawMirror},['https://2n-spatial-world.pages.dev/','https://2n-spatial-world.vercel.app/']);assert.deepEqual(urls,[entry.url,rawMirror,'https://2n-spatial-world.vercel.app/assets/model-transport/test-hash.glb.gz']);}finally{globalThis.location=previous;}
});
test('missing secure digest fails before any source is downloaded',async()=>{
 const saved=Object.getOwnPropertyDescriptor(globalThis,'crypto');Object.defineProperty(globalThis,'crypto',{value:{},configurable:true});
 try{let calls=0;await assert.rejects(fetchAssetBytes('/assets/test.glb',{entry,store:null,fetcher:async()=>{calls++;return new Response(bytes)}}),/HTTPS/);assert.equal(calls,0);}finally{Object.defineProperty(globalThis,'crypto',saved);}
});
test('two independent candidates start before either response completes',async()=>{
 const calls=[];let release;
 const fetcher=url=>{calls.push(url);if(calls.length===2)release(new Response(bytes));return new Promise(resolve=>{if(calls.length===1)release=resolve;});};
 const result=await fetchAssetBytes('/assets/test.glb',{entry,store:null,fetcher,mirrors:['https://immediate.example/'],timeout:100});
 assert.deepEqual(Buffer.from(result),bytes);assert.equal(calls.length,2);
});
test('commit-pinned raw CDN wins when packed sources fail',async()=>{
 const rawMirror='https://cdn.jsdelivr.net/gh/example/repo@123/public/assets/test.glb';
 const calls=[];const fetcher=async url=>{calls.push(url);return url===rawMirror?new Response(bytes):new Response('missing',{status:404});};
 assert.deepEqual(Buffer.from(await fetchAssetBytes('/assets/test.glb',{entry:{...entry,rawMirror},store:null,fetcher,mirrors:[],timeout:100})),bytes);
 assert.ok(calls.includes(rawMirror));assert.ok(!calls.includes('/assets/test.glb'));
});
test('wrong-version raw CDN is rejected before the original fallback',async()=>{
 const rawMirror='https://cdn.jsdelivr.net/gh/example/repo@123/public/assets/test.glb';let requested=false;
 const fetcher=async url=>{if(url===rawMirror){requested=true;return new Response(Buffer.from('glTFwrong-release'));}return url==='/assets/test.glb'?new Response(bytes):new Response('missing',{status:404});};
 assert.deepEqual(Buffer.from(await fetchAssetBytes('/assets/test.glb',{entry:{...entry,rawMirror},store:null,fetcher,mirrors:[],timeout:100})),bytes);assert.equal(requested,true);
});
test('fast valid mirror wins and cancels the stalled origin',async()=>{
 let aborted=false;
 const fetcher=async(url,{signal})=>url.startsWith('https://mirror.example/')?new Response(bytes):new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));},{once:true}));
 const result=await fetchAssetBytes('/assets/test.glb',{entry,store:null,fetcher,mirrors:['https://mirror.example/'],hedgeDelay:5,timeout:100});
 assert.deepEqual(Buffer.from(result),bytes);assert.equal(aborted,true);
});
test('fast wrong-version model cannot beat slower valid mirror',async()=>{
 const fetcher=async(url)=>{if(url.startsWith('https://mirror.example/')){await new Promise(r=>setTimeout(r,10));return new Response(bytes);}return new Response(Buffer.from('glTFwrong-release'))};
 assert.deepEqual(Buffer.from(await fetchAssetBytes('/assets/test.glb',{entry,store:null,fetcher,mirrors:['https://mirror.example/'],hedgeDelay:5,timeout:100})),bytes);
});
test('all sources failing rejects finitely without downloading duplicate original files from every mirror',async()=>{
 let calls=0;await assert.rejects(fetchAssetBytes('/assets/test.glb',{entry,store:null,fetcher:async()=>{calls++;return new Response('missing',{status:404})},mirrors:['https://mirror.example/'],hedgeDelay:5,timeout:100}));assert.equal(calls,3);
});
test('a mirror pointing at the current host never duplicates the same model request',async()=>{
 const previous=globalThis.location;globalThis.location={href:'https://mirror.example/',origin:'https://mirror.example'};
 try{let calls=0;await fetchAssetBytes('/assets/test.glb',{entry,store:null,fetcher:async()=>{calls++;await new Promise(r=>setTimeout(r,15));return new Response(bytes)},mirrors:['https://mirror.example/'],hedgeDelay:2,timeout:100});assert.equal(calls,1);}finally{globalThis.location=previous;}
});
