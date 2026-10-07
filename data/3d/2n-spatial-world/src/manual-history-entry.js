import {LEGACY_TOTAL_UNITS} from './people-story.js';
import {HISTORY_UNITS,HISTORY_SECONDS} from './guild-history-route.js';
const start=LEGACY_TOTAL_UNITS/28;
export const manualHistoryEntryEnd=start+HISTORY_UNITS/28*8/HISTORY_SECONDS;
const end=manualHistoryEntryEnd;
// Rendered manual progress follows input, but cannot skip the departure corridor.
// Land with the first text visible; main rebases overshoot. Autoplay bypasses.
export function limitManualHistoryEntry(current,candidate,dt,reduced=false){
 if(reduced||current===candidate)return candidate;
 const step=(end-start)*Math.max(0,Math.min(.05,dt))/2.8;
 if(candidate>current&&current<end&&candidate>start)return Math.min(candidate,end,Math.max(start,current)+step);
 if(candidate<current&&current>start&&candidate<end)return Math.max(candidate,Math.min(end,current)-step);
 return candidate;
}
