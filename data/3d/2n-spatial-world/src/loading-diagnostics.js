// Session-only diagnostics: never include query strings, headers or credentials.
import {assetProvider} from './asset-provider.js';
export function createLoadingDiagnostics({limit=60,now=()=>performance.now()}={}){
 const started=now(),events=[],listeners=new Set(),routes=new Map();let source='',cacheHits=0,downloaded=0,failures=0;
 return {
  record({kind,url='',duration=0,reason=''}){
   let host='本站',file='';try{const parsed=new URL(url,globalThis.location?.href||'https://local.invalid/');host=parsed.hostname==='local.invalid'?'本站':parsed.host;file=decodeURIComponent(parsed.pathname.split('/').at(-1)||'');}catch{}
   const provider=assetProvider(url),status={candidate:'未启动',download:'下载中',winner:'获胜',error:'失败',cancel:'已取消'}[kind];
   if(status){if(!routes.has(provider)&&routes.size>=12)routes.delete(routes.keys().next().value);const route=routes.get(provider)||{provider,status:'未启动',requested:0,won:0,failed:0,cancelled:0};route.status=status;if(kind==='download')route.requested++;if(kind==='winner')route.won++;if(kind==='error')route.failed++;if(kind==='cancel')route.cancelled++;routes.set(provider,route);}
   if(kind==='winner')source=provider;
   if(kind==='cache')cacheHits++;if(kind==='winner')downloaded++;if(kind==='error')failures++;
   events.push({kind,source:host,file,seconds:Math.max(0,(now()-started)/1000),duration,reason});if(events.length>limit)events.shift();
   for(const listener of listeners)try{listener();}catch{}
  },
  snapshot:()=>({source,cacheHits,downloaded,failures,routes:Array.from(routes.values(),route=>({...route})),events:events.map(event=>({...event}))}),
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}
 };
}
export const loadingDiagnostics=createLoadingDiagnostics();
export function failureReason(error){const text=String(error?.message||'');return text.includes('timed out')?'超时':text.includes('checksum')||text.includes('size mismatch')?'版本校验失败':text.includes('login page')?'返回网页而非模型':text.match(/returned (\d{3})/)?.[1]?`HTTP ${text.match(/returned (\d{3})/)[1]}`:'连接或解码失败';}
