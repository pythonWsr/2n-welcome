import {normalizeHistory} from './guild-history-data.js';
export const HISTORY_SECONDS=36,HISTORY_UNITS=6.4;
const clamp=t=>Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
const smooth=t=>{const u=clamp(t);return u*u*u*(10+u*(-15+6*u));};
const times=[0,7,12,15,24,27,36],distances=[0,1.25,2.05,2.6,4.05,4.6,6.4];
export function createHistoryRoute(events,entryPose){
 if(events.length!==3||!['position','target','up'].every(key=>entryPose[key]?.length===3&&entryPose[key].every(Number.isFinite)))throw new Error('历史路线缺少有效入口。');
 return {events,entryPose,seconds:HISTORY_SECONDS,distance:HISTORY_UNITS,segments:times};
}
function map(t,from,to){const v=clamp(t)*from.at(-1);let i=0;while(i<from.length-2&&v>from[i+1])i++;return (to[i]+(to[i+1]-to[i])*(v-from[i])/(from[i+1]-from[i]))/to.at(-1);}
export const historyTimeToDistance=(t,route)=>map(t,times,distances);
export const historyDistanceToTime=(t,route)=>map(t,distances,times);
export function sampleHistory(route,t,aspect){
 const seconds=clamp(t)*HISTORY_SECONDS,entry=route.entryPose;
 let eventIndex=seconds<15?0:seconds<27?1:2;
 const start=[7,15,27][eventIndex],end=[12,24,36][eventIndex];
 const opacity=seconds<start?0:seconds<start+1?smooth(seconds-start):eventIndex<2&&seconds>end-1?1-smooth(seconds-(end-1)):1;
 // Keep the verified terrain shot. A slow 3% dolly supplies continuous motion
 // without a speculative lateral path leaving the finite terrain footprint.
 const dolly=1+.03*smooth(seconds/HISTORY_SECONDS);
 return {position:entry.position.map((v,i)=>entry.target[i]+(v-entry.target[i])*dolly),target:[...entry.target],up:[...entry.up],eventIndex,eventId:route.events[eventIndex].id,eventOpacity:opacity,peopleOpacity:1-smooth(seconds/1),reading:opacity===1,historyT:clamp(t),replayVisible:seconds>=28};
}

export function sampleHistoryForData(raw,entry,t,aspect){
 const normalized=normalizeHistory(raw);
 if(normalized.errors.length)return {...entry,position:[...entry.position],target:[...entry.target],up:[...entry.up],eventOpacity:0,peopleOpacity:0,eventIndex:-1,eventId:null,replayVisible:true};
 return sampleHistory(createHistoryRoute(normalized.events,entry),t,aspect);
}
