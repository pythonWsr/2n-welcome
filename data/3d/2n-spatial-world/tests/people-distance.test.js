import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPeopleRoute,resizeCourtyard,sampleCourtyard} from '../src/people-courtyard.js';
import {scrollToStory,storyToScroll,autoplayToScroll,scrollToAutoplay,autoplayDuration,chapterAt,TOTAL_UNITS,PEOPLE_UNITS} from '../src/people-story.js';
import {STORY_UNITS} from '../src/lookback.js';
const fixture={leaders:[{id:'one',name:'one'}],members:Array.from({length:95},(_,i)=>`person ${i}`)};
const base=createPeopleRoute(fixture);
const scrollAt=(route,t)=>storyToScroll((STORY_UNITS+PEOPLE_UNITS*t)/28,route);
for(const route of [base,resizeCourtyard(base,{width:240,height:568})])test(`manual reading budget retains transfer travel space (${route.stations.length} windows)`,()=>{
 const a=route.windows[2],b=route.windows[3];
 const read=scrollAt(route,a.readEnd)-scrollAt(route,a.readStart),transfer=scrollAt(route,b.readStart)-scrollAt(route,a.readEnd);
 assert.ok(transfer>read*.25&&transfer<read*3,`transfer ${transfer} relative to reading ${read}`);
 for(let i=0;i<=2000;i++){
  const s=i/2000,p=scrollToStory(s,route);assert.ok(Math.abs(storyToScroll(p,route)-s)<1e-11);
  const autoplay=scrollToAutoplay(s,route);assert.ok(Math.abs(autoplayToScroll(autoplay,route)-s)<1e-11);
 }
 // Constant manual increments must not retain the old hold/transfer speed cliff.
 const steps=[];const lo=scrollAt(route,a.readStart+.001),hi=scrollAt(route,b.readEnd-.001),delta=(hi-lo)/3000;
 for(let s=lo;s<=hi;s+=delta){const t=chapterAt(scrollToStory(s,route)).peopleT,u=chapterAt(scrollToStory(s+1e-8,route)).peopleT;steps.push(new T.Vector3(...sampleCourtyard(route,t).position).distanceTo(new T.Vector3(...sampleCourtyard(route,u).position)));}
 assert.ok(steps.every(Number.isFinite),'manual mapping produced non-finite local speed');
 const old=STORY_UNITS/TOTAL_UNITS;
 for(let i=0;i<=100;i++){const s=old*i/100;assert.ok(Math.abs(scrollToStory(s,route)-s*TOTAL_UNITS/28)<1e-12);}
 assert.equal(autoplayDuration(route),150+route.seconds+36+16);
});

test('stationary entry and empty people remain strictly invertible',()=>{
 for(const route of [base,createPeopleRoute({leaders:[],members:[]})]){
  let previous=-1;
  for(let i=0;i<=1000;i++){
   const t=route.windows[0].readEnd*i/1000,s=scrollAt(route,t);
   assert.ok(s>previous,'stationary entry collapsed to a flat scroll coordinate');
   assert.ok(Math.abs(chapterAt(scrollToStory(s,route)).peopleT-t)<1e-10);previous=s;
  }
  assert.equal(scrollAt(route,1),(STORY_UNITS+PEOPLE_UNITS)/TOTAL_UNITS);
 }
});

const distance=await import('../src/people-distance.js');
function idleQueue(){const queue=new Map();let id=0;return {queue,schedule(fn){queue.set(++id,fn);return id;},cancel(id){queue.delete(id);},step(){const [id,fn]=queue.entries().next().value;queue.delete(id);fn({timeRemaining:()=>10});}};}
test('idle preparation deduplicates, yields, and exactly matches synchronous mapping',()=>{
 const idle=idleQueue(),route=createPeopleRoute(fixture),sync=createPeopleRoute(fixture);
 assert.equal(typeof distance.preparePeopleDistance,'function');
 const cancel=distance.preparePeopleDistance(route,idle);
 assert.equal(distance.preparePeopleDistance(route,idle),cancel);assert.equal(idle.queue.size,1);
 idle.step();assert.equal(idle.queue.size,1,'full table blocked first idle slice');
 while(idle.queue.size)idle.step();
 for(let i=0;i<=1000;i++){const t=i/1000;assert.equal(distance.peopleTimeToDistance(t,route),distance.peopleTimeToDistance(t,sync));assert.equal(distance.peopleDistanceToTime(t,route),distance.peopleDistanceToTime(t,sync));}
 assert.equal(idle.queue.size,0);distance.preparePeopleDistance(route,idle);assert.equal(idle.queue.size,0);
});
test('partial synchronous fallback completes the same table and cancels queued work; replacement cancels stale work',()=>{
 const idle=idleQueue(),route=createPeopleRoute(fixture),sync=createPeopleRoute(fixture);
 const cancel=distance.preparePeopleDistance(route,idle);idle.step();
 assert.equal(distance.peopleTimeToDistance(.47,route),distance.peopleTimeToDistance(.47,sync));assert.equal(idle.queue.size,0);cancel();
 const next=resizeCourtyard(route,{width:240,height:568}),stop=distance.preparePeopleDistance(next,idle);idle.step();stop();assert.equal(idle.queue.size,0);
 distance.preparePeopleDistance(next,idle);while(idle.queue.size)idle.step();
 assert.equal(distance.peopleTimeToDistance(.47,next),distance.peopleTimeToDistance(.47,resizeCourtyard(sync,{width:240,height:568})));
});

test('busy idle deadline yields without sampling and stale cancellation cannot stop a new request',()=>{
 const idle=idleQueue(),route=createPeopleRoute(fixture);
 const stop=distance.preparePeopleDistance(route,idle);
 const [id,fn]=idle.queue.entries().next().value;idle.queue.delete(id);fn({timeRemaining:()=>0});
 assert.equal(idle.queue.size,1);stop();distance.preparePeopleDistance(route,idle);stop();assert.equal(idle.queue.size,1);
 while(idle.queue.size)idle.step();assert.ok(Number.isFinite(distance.peopleTimeToDistance(.5,route)));
});

