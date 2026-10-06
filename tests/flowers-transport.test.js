import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createAutoplay} from '../src/autoplay.js';
const transport=await import('../src/asset-transport.js').catch(()=>({}));
const flowers=await import('../src/map-flowers.js').catch(()=>({}));
test('lossless transport decompresses exact GLB bytes and subsequent visits avoid downloading',async()=>{
 assert.equal(typeof transport.fetchAssetBytes,'function','compressed transport is missing');
 const bytes=Buffer.from('glTFexact-model-data'),packed=gzipSync(bytes),hash=createHash('sha256').update(bytes).digest('hex');
 const saved=new Map(),store={match:async key=>saved.get(key)?.clone(),put:async(key,value)=>saved.set(key,value.clone()),delete:async key=>saved.delete(key)};
 let downloads=0;const options={entry:{url:'/packed.gz',sha256:hash,bytes:bytes.length},store,fetcher:async()=>{downloads++;return new Response(packed);}};
 assert.deepEqual(Buffer.from(await transport.fetchAssetBytes('/original.glb',options)),bytes);
 assert.deepEqual(Buffer.from(await transport.fetchAssetBytes('/original.glb',options)),bytes);assert.equal(downloads,1);
});
test('broken compressed or cached data recovers through the unchanged original model',async()=>{
 assert.equal(typeof transport.fetchAssetBytes,'function');
 const bytes=Buffer.from('glTForiginal'),hash=createHash('sha256').update(bytes).digest('hex'),urls=[];
 const result=await transport.fetchAssetBytes('/original.glb',{entry:{url:'/broken.gz',sha256:hash,bytes:bytes.length},store:{match:async()=>new Response('wrong'),delete:async()=>true,put:async()=>{}},fetcher:async url=>{urls.push(url);return new Response(url.includes('broken')?'corrupt':bytes);}});
 assert.deepEqual(Buffer.from(result),bytes);assert.deepEqual(urls,['/broken.gz','/original.glb']);
});
test('flower installation retains all face parts, exact requested counts and larger size',()=>{
 assert.equal(typeof flowers.createMapFlowers,'function','map flower placement is missing');
 const catalog=Object.fromEntries(['01','02','03','04','05','06','07'].map(id=>{const root=new T.Group();for(const name of ['body','eyes','mouth']){const mesh=new T.Mesh(new T.SphereGeometry(1,8,6),new T.MeshStandardMaterial());mesh.name=name;root.add(mesh);}return [id,root];}));
 const rig=flowers.createMapFlowers();for(const [id,root] of Object.entries(catalog))rig.install(id,root);
 assert.equal(rig.group.children.length,11);
 const counts={};for(const o of rig.group.children){counts[o.userData.region]=(counts[o.userData.region]||0)+1;assert.equal(o.children[0].children.length,3);assert.ok(o.userData.width>=8);}
 assert.deepEqual(counts,{garden:2,desert:2,ocean:1,jungle:1,hell:5});assert.equal(rig.ready,true);
 const cam=new T.PerspectiveCamera();cam.position.set(1200,0,100);rig.update(cam,0);
 for(const o of rig.group.children){const front=new T.Vector3(0,0,1).applyQuaternion(o.quaternion),toward=cam.position.clone().sub(o.position).normalize();assert.ok(front.dot(toward)>.999,'wrong expression-facing axis');}
 const first=rig.group.children[0],before=first.quaternion.clone();cam.position.set(0,0,-100);rig.update(cam,.01);
 assert.ok(first.quaternion.angleTo(before)<.15,'return facing snaps');
});
test('default autoplay completes the journey in 150 seconds and starts disabled',()=>{
 const player=createAutoplay();assert.equal(player.playing,false);player.toggle(0,true);
 assert.equal(player.advance(75),.5);assert.equal(player.advance(75),1);assert.equal(player.playing,false);
});

test('stalled optional cache reads and writes cannot block a valid HD model',async()=>{
 const bytes=Buffer.from('glTFexact-hd-model'),hash=createHash('sha256').update(bytes).digest('hex');
 const never=()=>new Promise(()=>{}),entry={url:'/packed.gz',sha256:hash,bytes:bytes.length};
 const result=await transport.fetchAssetBytes('/original.glb',{entry,cacheTimeout:10,store:{match:never,put:never},fetcher:async()=>new Response(gzipSync(bytes))});
 assert.deepEqual(Buffer.from(result),bytes);
});
