import {peopleTimeToDistance,peopleDistanceToTime} from './people-distance.js';
import {STORY_UNITS,RETURN_START,RETURN_UNITS,lookbackPose} from './lookback.js';
import {PEOPLE_UNITS,peoplePose} from './people-path.js';
import {pose} from './journey.js';
import {gardenPose} from './garden-path.js';
import {oceanPose} from './ocean-production.js';
import {junglePose} from './jungle-production.js';
import {hellPose} from './hell-production.js';
import {sampleCourtyard} from './people-courtyard.js';
import {HISTORY_UNITS,HISTORY_SECONDS,sampleHistoryForData,historyTimeToDistance,historyDistanceToTime} from './guild-history-route.js';
import {NEXT_SECONDS,NEXT_UNITS,sampleNext} from './guild-next-route.js';
import historyData from '../content/history.json' with {type:'json'};

export const LEGACY_TOTAL_UNITS=STORY_UNITS+PEOPLE_UNITS;
export const NEXT_START_UNITS=LEGACY_TOTAL_UNITS+HISTORY_UNITS;
export const TOTAL_UNITS=NEXT_START_UNITS+NEXT_UNITS;
export {PEOPLE_UNITS};
export const autoplayDuration=route=>150+(route?.seconds||0)+HISTORY_SECONDS+NEXT_SECONDS;
const clamp=t=>Math.max(0,Math.min(1,t));
// Keep the historical absolute coordinate: one progress unit is 28 scroll units.
export function scrollToStory(t,route){
 const units=clamp(t)*TOTAL_UNITS;
 if(units>=NEXT_START_UNITS)return units/28;
 if(units>=LEGACY_TOTAL_UNITS)return (LEGACY_TOTAL_UNITS+HISTORY_UNITS*historyDistanceToTime((units-LEGACY_TOTAL_UNITS)/HISTORY_UNITS))/28;
 return (units<=STORY_UNITS?units:STORY_UNITS+PEOPLE_UNITS*peopleDistanceToTime((units-STORY_UNITS)/PEOPLE_UNITS,route))/28;
}
export function storyToScroll(p,route){
 const units=clamp(p*28/TOTAL_UNITS)*TOTAL_UNITS;
 if(units>=NEXT_START_UNITS)return units/TOTAL_UNITS;
 if(units>=LEGACY_TOTAL_UNITS)return (LEGACY_TOTAL_UNITS+HISTORY_UNITS*historyTimeToDistance((units-LEGACY_TOTAL_UNITS)/HISTORY_UNITS))/TOTAL_UNITS;
 return (units<=STORY_UNITS?units:STORY_UNITS+PEOPLE_UNITS*peopleTimeToDistance((units-STORY_UNITS)/PEOPLE_UNITS,route))/TOTAL_UNITS;
}

// The player stores time only; scroll remains the historical physical coordinate.
export function autoplayToScroll(fraction,route){
 const seconds=clamp(fraction)*autoplayDuration(route);
 const before=150+(route?.seconds||0);
 if(seconds>=before+HISTORY_SECONDS)return (NEXT_START_UNITS+NEXT_UNITS*clamp((seconds-before-HISTORY_SECONDS)/NEXT_SECONDS))/TOTAL_UNITS;
 if(seconds>=before)return storyToScroll((LEGACY_TOTAL_UNITS+HISTORY_UNITS*clamp((seconds-before)/HISTORY_SECONDS))/28,route);
 return seconds<=150 ? seconds/150*STORY_UNITS/TOTAL_UNITS
  : storyToScroll((STORY_UNITS+PEOPLE_UNITS*clamp((seconds-150)/(route?.seconds||1)))/28,route);
}
export function scrollToAutoplay(scroll,route){
 const units=scrollToStory(scroll,route)*28;
 if(units>=NEXT_START_UNITS)return (150+(route?.seconds||0)+HISTORY_SECONDS+(units-NEXT_START_UNITS)/NEXT_UNITS*NEXT_SECONDS)/autoplayDuration(route);
 if(units>=LEGACY_TOTAL_UNITS)return (150+(route?.seconds||0)+(units-LEGACY_TOTAL_UNITS)/HISTORY_UNITS*HISTORY_SECONDS)/autoplayDuration(route);
 return (units<=STORY_UNITS ? units/STORY_UNITS*150 : 150+(units-STORY_UNITS)/PEOPLE_UNITS*(route?.seconds||0))/autoplayDuration(route);
}
export function capturePeoplePosition(route,t){
 const index=route.windows.findIndex(w=>t>=w.start&&(t<w.end||w.end===1));
 const w=route.windows[Math.max(0,index)],s=route.stations[w.stationIndex];
 return {kind:s.kind,sourceStationId:s.sourceStationId,memberIndex:s.memberIndices[0],fraction:(t-w.readStart)/(w.readEnd-w.readStart)};
}
export function restorePeoplePosition(route,token){
 const index=route.stations.findIndex(s=>s.kind===token.kind&&(token.kind==='member'?s.memberIndices.includes(token.memberIndex):s.sourceStationId===token.sourceStationId));
 const w=route.windows[Math.max(0,index)];return clamp(w.readStart+token.fraction*(w.readEnd-w.readStart));
}

export function chapterAt(progress){
 const p=Math.max(0,Math.min(TOTAL_UNITS/28,progress));
 // A normalized scroll round-trip can put the old endpoint a few ulps ahead.
 const inPeople=p*28>STORY_UNITS+1e-9;
 const peopleT=inPeople?clamp((p*28-STORY_UNITS)/PEOPLE_UNITS):0;
 const nextT=clamp((p*28-NEXT_START_UNITS)/NEXT_UNITS);
 const historyT=clamp((p*28-LEGACY_TOTAL_UNITS)/HISTORY_UNITS);
 const returnT=clamp((p-RETURN_START)/(RETURN_UNITS/28));
 const heroT=clamp(p/(6/28)),worldT=clamp((p-6/28)/(8/28));
 const chapter=p*28>NEXT_START_UNITS+1e-9?'next':p*28>LEGACY_TOTAL_UNITS+1e-9?'history':inPeople?'people':p>=RETURN_START?'lookback':p<=6/28?'hero':p<=14/28?'garden':p<=20/28?'ocean':p<=24/28?'jungle':'hell';
 return {chapter,peopleT,historyT,nextT,returnT,heroT,worldT};
}

/** Absolute sampling on the existing camera; no readiness or viewport history. */
export function sampleStoryPose(progress,camera,portrait,route){
 const {chapter,peopleT,historyT,nextT,returnT,heroT,worldT}=chapterAt(progress);
 if(chapter==='history'||chapter==='next'){
  const entry=route?sampleCourtyard(route,1,camera.aspect):lookbackPose(1,camera);
  const state={...sampleHistoryForData(historyData,{...entry,up:entry.up||[0,1,0]},historyT,camera.aspect),entryPose:{...entry,up:entry.up||[0,1,0]}};
  if(chapter==='next')Object.assign(state,sampleNext(nextT),{replayVisible:false});
  camera.position.fromArray(state.position);camera.up.fromArray(state.up);camera.lookAt(...state.target);return state;
 }
 if(chapter==='people')return peoplePose(peopleT,camera,camera.aspect,route);
 // The old samplers were authored against world-up and share this camera.
 camera.up.set(0,1,0);
 if(chapter==='lookback')return lookbackPose(returnT,camera);
 if(chapter==='hero')return pose(heroT,camera,portrait);
 if(chapter==='garden')return gardenPose(worldT,camera,portrait);
 if(chapter==='ocean')return oceanPose((progress-14/28)/(6/28),camera,portrait);
 if(chapter==='jungle')return junglePose((progress-20/28)/(4/28),camera);
 return hellPose((progress-24/28)/(4/28),camera);
}

