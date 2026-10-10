import {loadingDiagnostics,failureReason} from './loading-diagnostics.js';
import manifest from './transport-manifest.js';
import {assetProvider} from './asset-provider.js';
const glb=bytes=>bytes.byteLength>=4&&new DataView(bytes).getUint32(0,true)===0x46546c67;
async function unpack(bytes){return glb(bytes)?bytes:new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
async function verified(bytes,entry){
 if(!glb(bytes))throw new Error('Invalid GLB response');
 if(entry){if(bytes.byteLength!==entry.bytes)throw new Error('Asset size mismatch');
  const digest=await crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==entry.sha256)throw new Error('Asset checksum mismatch');
 }return bytes;
}
function lookup(url){
 for(const [path,entry] of Object.entries(manifest))if(url.endsWith(path))return {...entry,url:url.slice(0,-path.length)+entry.url};
}
function bounded(work,ms,fallback=null){let timer;return Promise.race([Promise.resolve(work).catch(()=>fallback),new Promise(resolve=>{timer=setTimeout(()=>resolve(fallback),ms);})]).finally(()=>clearTimeout(timer));}
let localStorePromise;
async function localStore(ms){try{localStorePromise??= typeof caches!=='undefined'?bounded(caches.open('2n-lossless-models-v1'),ms):Promise.resolve(null);return await localStorePromise;}catch{return null;}}
async function download(url,fetcher,timeout,signal){
 const controller=new AbortController();let timer;const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 try{return await Promise.race([(async()=>{const response=await fetcher(url,{signal:controller.signal,cache:'force-cache'});
  if(!response.ok)throw new Error(`Model request returned ${response.status}`);
  if((response.headers.get('content-type')||'').includes('text/html'))throw new Error('Model request returned a login page');
  return response.arrayBuffer();})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Model download timed out'));},timeout);})]);}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
// Mirrors are independent static copies. Only content-addressed, verified files race.
const configuredMirrors=(import.meta.env?.VITE_ASSET_MIRRORS||'https://2n.edgeone.llhleo.top/,https://2n-spatial-world.pages.dev/,https://2n-spatial-world.vercel.app/,https://llhleo.github.io/2n-spatial-world/').split(',').filter(Boolean);
let preferredSource='';
export function modelCandidates(entry,mirrors){
 const urls=[entry.url];
 if(entry.rawMirror)urls.push(entry.rawMirror);
 const marker=entry.url.indexOf('assets/model-transport/');
 if(marker>=0)for(const base of mirrors){try{const root=new URL(base);if(root.protocol==='https:')urls.push(new URL(entry.url.slice(marker),root.href.endsWith('/')?root.href:root.href+'/').href);}catch{}}
 const seen=new Set();return urls.filter(url=>{const key=assetProvider(url);if(seen.has(key))return false;seen.add(key);return true;});
}
async function racePacked(entry,fetcher,timeout,mirrors,hedgeDelay){
 const unique=modelCandidates(entry,mirrors);
 // Reuse the previous validated winner without permanently pinning a failed source.
 const rank=assetProvider;
 if(preferredSource)unique.sort((a,b)=>Number(rank(b)===preferredSource)-Number(rank(a)===preferredSource));
 return new Promise((resolve,reject)=>{
  let next=0,active=0,done=false,hedge;const controllers=new Map(),errors=[];
  for(const url of unique)loadingDiagnostics.record({kind:'candidate',url});
  const finish=()=>{if(!done&&next===unique.length&&!active){done=true;clearTimeout(hedge);reject(errors.at(-1)||new Error('No usable model source'));}};
  const launch=()=>{
   if(done||next===unique.length||active>=3)return;
   const url=unique[next++],controller=new AbortController(),started=performance.now();controllers.set(controller,url);active++;loadingDiagnostics.record({kind:'download',url});
   (async()=>{const packed=await download(url,fetcher,timeout,controller.signal),bytes=await unpack(packed);await verified(bytes,entry);return {packed,bytes};})().then(result=>{
    if(done)return;done=true;loadingDiagnostics.record({kind:'winner',url,duration:performance.now()-started});preferredSource=rank(url);clearTimeout(hedge);for(const [other,otherUrl] of controllers)if(other!==controller){loadingDiagnostics.record({kind:'cancel',url:otherUrl});other.abort();}resolve(result);
   },error=>{if(!done){loadingDiagnostics.record({kind:'error',url,reason:failureReason(error)});errors.push(error);launch();}}).finally(()=>{active--;controllers.delete(controller);if(!done){launch();finish();}});
  };
  launch();const rivals=()=>{launch();launch();};if(hedgeDelay>0)hedge=setTimeout(rivals,hedgeDelay);else rivals();
 });
}
export async function fetchAssetBytes(url,{entry=lookup(url),store,fetcher=fetch,timeout=30000,cacheTimeout=800,mirrors=configuredMirrors,hedgeDelay=0}={}){
 if(entry&&typeof globalThis.crypto?.subtle?.digest!=='function')throw new Error('模型校验需要安全连接，请使用有效证书的 HTTPS 地址');
 if(!entry)return verified(await download(url,fetcher,timeout));
 if(store===undefined)store=await localStore(cacheTimeout);
 const key=`${globalThis.location?.origin||'https://cache.invalid'}/__2n_model_cache__/${entry.sha256}`;
 if(store){try{const hit=await bounded(store.match(key),cacheTimeout);if(hit){const bytes=await bounded(hit.arrayBuffer(),cacheTimeout);if(bytes){const result=await verified(await unpack(bytes),entry);loadingDiagnostics.record({kind:'cache',url});return result;}}}catch{try{void bounded(store.delete(key),cacheTimeout);}catch{}}}
 let bytes,cacheBytes;
 try{
  const result=await racePacked(entry,fetcher,timeout,mirrors,hedgeDelay);bytes=result.bytes;cacheBytes=result.packed;
 }catch{loadingDiagnostics.record({kind:'download',url});const started=performance.now();try{bytes=await verified(await download(url,fetcher,timeout),entry);loadingDiagnostics.record({kind:'winner',url,duration:performance.now()-started});cacheBytes=bytes;}catch(error){loadingDiagnostics.record({kind:'error',url,reason:failureReason(error)});throw error;}}
 // Persistence is optional: a slow/quota-limited Safari cache cannot hold up a valid model.
 if(store){try{void bounded(store.put(key,new Response(cacheBytes,{headers:{'content-type':'application/octet-stream'}})),cacheTimeout);}catch{}}
 return bytes;
}
