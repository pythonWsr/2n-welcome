import test from 'node:test';
import assert from 'node:assert/strict';
import * as story from '../src/people-story.js';
import {createPeopleRoute} from '../src/people-courtyard.js';
const api=await import('../src/guild-next-route.js').catch(()=>({}));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('next chapter has a 16 second reversible fade-open-read sequence',()=>{
 assert.equal(typeof api.sampleNext,'function');
 assert.equal(api.NEXT_SECONDS,16);assert.equal(api.NEXT_UNITS,3.2);
 const start=api.sampleNext(0);assert.equal(start.historyOpacity,1);assert.equal(start.opening,0);assert.equal(start.nextOpacity,0);
 assert.equal(api.sampleNext(3/16).opening,0);assert.equal(api.sampleNext(3/16).historyOpacity,0);
 assert.equal(api.sampleNext(10/16).opening,1);assert.equal(api.sampleNext(11/16).nextOpacity,1);
 assert.equal(api.sampleNext(14/16).buttonsVisible,false);
 assert.equal(api.sampleNext(15.99/16).buttonsVisible,false);
 assert.equal(api.sampleNext(1).buttonsVisible,true);
 assert.equal(api.sampleNext(1-1e-7).buttonsVisible,true);
 for(const t of [NaN,Infinity,-1,2])for(const value of Object.values(api.sampleNext(t)))assert.ok(typeof value==='boolean'||Number.isFinite(value));
 assert.deepEqual(api.sampleNext(.4),api.sampleNext(.4));
});
test('old absolute chapter coordinates remain unchanged, new segment roundtrips both scroll and time',()=>{
 assert.ok(story.NEXT_START_UNITS>story.LEGACY_TOTAL_UNITS);
 const route=createPeopleRoute({leaders:[],members:['a','b']});
 assert.equal(story.chapterAt(story.LEGACY_TOTAL_UNITS/28).chapter,'people');
 assert.equal(story.chapterAt((story.LEGACY_TOTAL_UNITS+3.2)/28).chapter,'history');
 const end=story.chapterAt(story.TOTAL_UNITS/28);assert.equal(end.chapter,'next');assert.equal(end.historyT,1);assert.equal(end.nextT,1);
 near(story.autoplayDuration(route),150+route.seconds+36+16);
 for(let i=0;i<=100;i++){
 const p=i/100*story.TOTAL_UNITS/28;near(story.scrollToStory(story.storyToScroll(p,route),route),p);
 const t=i/100;near(story.scrollToAutoplay(story.autoplayToScroll(t,route),route),t);
 }
 const before=150+route.seconds;
 near(story.autoplayToScroll(before/story.autoplayDuration(route),route)*story.TOTAL_UNITS,story.LEGACY_TOTAL_UNITS);
 near(story.autoplayToScroll((before+36)/story.autoplayDuration(route),route)*story.TOTAL_UNITS,story.NEXT_START_UNITS);
});
