import {loadingDiagnostics} from './loading-diagnostics.js';
// Shared bounded queue: avoid duplicate Golden Leaf downloads and unbounded
// GLB/image decoding on Safari. Failed entries may be retried explicitly.
import {fetchAssetBytes} from './asset-transport.js';
const cache=new Map(),sceneCache=new Map();
const later=()=>new Promise(resolve=>setTimeout(resolve,0));
const queues=new Set();
export function cancelPendingModelLoads(){for(const cancel of queues)cancel();}
function scheduler(limit){
 const queue=[];let active=0;
 queues.add(()=>{for(const job of queue.splice(0))job.reject(new Error('资源批次已停止，请重试'));});
 function drain(){while(active<limit&&queue.length){const job=queue.shift();active++;Promise.resolve().then(job.run).then(job.resolve,job.reject).finally(()=>{active--;drain();});}}
 return (run,priority=0)=>new Promise((resolve,reject)=>{queue.push({run,resolve,reject,priority});queue.sort((a,b)=>a.priority-b.priority);drain();});
}
// Keep the network busy while GPU/image decoding is deliberately bounded.
export function createPetalPipeline(networkLimit=6,decodeLimit=2){
 const download=scheduler(networkLimit),decode=scheduler(decodeLimit);
 return async(fetchBytes,parse,priority=0)=>{const bytes=await download(fetchBytes,priority);return decode(()=>parse(bytes),priority);};
}
const pipeline=createPetalPipeline();
// Hold the admission slot until parsing finishes: at most three HD GLBs
// retained, two decoding and one prefetched, not an unbounded decoded queue.
export function createBoundedDisplayPipeline(){
 const admit=scheduler(3),decode=scheduler(2);
 return (fetchBytes,parse,priority=0)=>admit(async()=>{const bytes=await fetchBytes();return decode(()=>parse(bytes),priority);},priority);
}
const displayPipeline=createBoundedDisplayPipeline(),decodeModel=scheduler(2);
export async function fetchPetalBytes(url,fetcher=fetch,timeout=15000){
 const controller=new AbortController();let timer;
 try{return await Promise.race([(async()=>{const response=await fetcher(url,{signal:controller.signal});if(!response.ok)throw new Error(`Petal request returned ${response.status}`);const type=response.headers.get('content-type')||'';if(type.includes('text/html'))throw new Error('Petal request returned a login page');const bytes=await response.arrayBuffer();if(bytes.byteLength<4||new DataView(bytes).getUint32(0,true)!==0x46546c67)throw new Error('Invalid GLB response');return bytes;})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Petal download timed out'));},timeout);})]);}finally{clearTimeout(timer);}
}
export function loadPetal(url,priority=0){
 if(cache.has(url))return cache.get(url);
 const promise=loadModelScene(url,priority).then(scene=>{const mesh=scene.getObjectByProperty('isMesh',true);if(!mesh)throw new Error('GLB contains no mesh');return mesh;});cache.set(url,promise);promise.catch(()=>cache.delete(url));return promise;
}
export function loadModelScene(url,priority=0){
 if(sceneCache.has(url))return sceneCache.get(url);
 const near=url.includes('companion-display')||url.includes('map-flowers');
 const parse=async bytes=>decodeModel(async()=>{
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');await later();let timer;
  try{const result=(await Promise.race([new GLTFLoader().parseAsync(bytes,''),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Model decoding timed out')),90000);})])).scene;loadingDiagnostics.record({kind:'decode',url});return result;}finally{clearTimeout(timer);}
 },priority);
 const fetchBytes=async()=>{for(let attempt=0;attempt<(near?1:2);attempt++){try{return await fetchAssetBytes(url);}catch(error){if(near||attempt===1)throw error;await later();}}};
 const promise=near?displayPipeline(fetchBytes,parse,priority):pipeline(fetchBytes,parse,priority);
 sceneCache.set(url,promise);promise.catch(()=>sceneCache.delete(url));return promise;
}
export async function loadPetalCatalog(entries,onAsset){
 const catalog={},failures=[];
 await Promise.all(entries.map(async([name,path],index)=>{try{const mesh=await loadPetal(`${import.meta.env.BASE_URL}${path}`,index*4+(path.includes("jungle-petals")?3:path.includes("ocean-petals")?2:path.includes("desert-petals")?1:0));catalog[name]=mesh;if(onAsset){await later();await onAsset(name,mesh);}}catch(error){failures.push({name,message:error.message});}}));
 Object.defineProperty(catalog,'failures',{value:failures});return catalog;
}
