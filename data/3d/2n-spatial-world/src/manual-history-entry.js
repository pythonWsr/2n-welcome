import {LEGACY_TOTAL_UNITS,NEXT_START_UNITS,TOTAL_UNITS} from './people-story.js';
import {HISTORY_UNITS,HISTORY_SECONDS} from './guild-history-route.js';
import {PARTICLE_ENDING_SECONDS} from './guild-next-route.js';
const start=LEGACY_TOTAL_UNITS/28;
export const manualHistoryEntryEnd=start+HISTORY_UNITS/28*8/HISTORY_SECONDS;
const end=manualHistoryEntryEnd;
const manualReverseRate=1.35;
// Rendered manual progress follows input, but cannot skip the departure corridor.
// Land with the first text visible; main rebases overshoot. Autoplay bypasses.
export function limitManualHistoryEntry(current,candidate,dt,reduced=false,reverseRate=1){
 if(reduced||current===candidate)return candidate;
 const step=(end-start)*Math.max(0,Math.min(.05,dt))/2.8;
 if(candidate>current&&current<end&&candidate>start)return Math.min(candidate,end,Math.max(start,current)+step);
 if(candidate<current&&current>start&&candidate<end)return Math.max(candidate,Math.min(end,current)-step*reverseRate);
 return candidate;
}

// A reverse target may already be several chapters behind the displayed picture.
// The particle guard owns its segment first; history then consumes the same
// target at its own reading speed, retaining the original departure corridor.
export function limitManualHistoryReverse(current,candidate,dt){
 if(candidate>=current||current>NEXT_START_UNITS/28)return candidate;
 if(current<=end)return limitManualHistoryEntry(current,candidate,dt,false,manualReverseRate);
 const step=HISTORY_UNITS/28*Math.max(0,Math.min(.05,dt))*manualReverseRate/HISTORY_SECONDS;
 return Math.max(candidate,end,current-step);
}

// The complete particle timeline uses the same local manual guard. Callers
// retain the native target until reached, but cancel queued lag on input reversal.
// Limiting the picture must never make the physical page end unreachable.
export function limitManualParticleEnding(current,candidate,dt,reduced=false){
 if(reduced||current===candidate)return candidate;
 const start=NEXT_START_UNITS/28,end=TOTAL_UNITS/28;
 const step=(end-start)*Math.max(0,Math.min(.05,dt))/PARTICLE_ENDING_SECONDS;
 if(candidate>current&&current<end&&candidate>start)return Math.min(candidate,end,Math.max(start,current)+step);
 if(candidate<current&&current>start&&candidate<end)return Math.max(candidate,start,Math.min(end,current)-step*manualReverseRate);
 return candidate;
}
