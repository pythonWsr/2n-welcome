import {loadingDiagnostics} from './loading-diagnostics.js';
// Native details defaults to closed; no frame work, DOM updates or announcements while closed.
const loading=document.querySelector('#loading-status');
if(loading){
 const details=document.createElement('details');details.id='loading-details';
 const summary=document.createElement('summary');summary.textContent='加载详情';details.append(summary);
 const panel=document.createElement('section');panel.className='loading-log-panel';panel.setAttribute('aria-label','加载详情');panel.setAttribute('aria-live','off');
 const header=document.createElement('div');header.className='loading-log-header';
 const title=document.createElement('strong');title.textContent='加载详情';
 const close=document.createElement('button');close.type='button';close.textContent='关闭';close.setAttribute('aria-label','关闭加载详情');
 header.append(title,close);
 const phase=document.createElement('p'),stats=document.createElement('p'),routes=document.createElement('ul'),list=document.createElement('ol');
 routes.setAttribute('aria-label','候选线路状态');list.setAttribute('aria-label','最近加载记录');panel.append(header,phase,stats,routes,list);details.append(panel);loading.append(details);
 const labels={candidate:'候选 / 未启动',download:'请求',winner:'完成',cancel:'取消落后请求',cache:'缓存命中',error:'换源 / 失败',decode:'模型解析完成'};
 let timer=null;
 function render(){
  timer=null;if(!details.open||loading.hidden)return;
  const state=loadingDiagnostics.snapshot();phase.textContent=loading.querySelector('span')?.textContent||'准备画面';
  stats.textContent=`最近获胜线路：${state.source||'等待校验'} · 下载 ${state.downloaded} · 缓存 ${state.cacheHits} · 失败 ${state.failures}`;
  routes.replaceChildren(...state.routes.map(route=>{const item=document.createElement('li');item.textContent=`${route.provider} · 最近状态 ${route.status} · 请求 ${route.requested} / 获胜 ${route.won} / 失败 ${route.failed} / 取消 ${route.cancelled}`;return item;}));
  const atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<24;
  list.replaceChildren(...state.events.map(event=>{const item=document.createElement('li');item.textContent=`${event.seconds.toFixed(1)}s ${labels[event.kind]||event.kind} · ${event.source} · ${event.file}${event.reason?' · '+event.reason:''}${event.duration?` · ${(event.duration/1000).toFixed(1)}s`:''}`;return item;}));
  if(atBottom)list.scrollTop=list.scrollHeight;
 }
 function schedule(){if(details.open&&!loading.hidden&&timer===null)timer=setTimeout(render,250);}
 loadingDiagnostics.subscribe(schedule);
 details.addEventListener('toggle',()=>{if(details.open)render();else{clearTimeout(timer);timer=null;}});
 close.addEventListener('click',event=>{event.stopPropagation();details.open=false;summary.focus();});
 details.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();details.open=false;summary.focus();}});
 // Keep log interaction inside the existing opening input exemption.
 details.addEventListener('pointerdown',event=>event.stopPropagation());
 const status=loading.querySelector('span');
 if(status)new MutationObserver(schedule).observe(status,{childList:true,characterData:true,subtree:true});
 new MutationObserver(()=>{if(loading.hidden){details.open=false;clearTimeout(timer);timer=null;}}).observe(loading,{attributes:true,attributeFilter:['hidden']});
}
