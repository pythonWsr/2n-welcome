import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPeopleRoute,sampleCourtyard} from '../src/people-courtyard.js';
import * as story from '../src/people-story.js';
const api=await import('../src/guild-closure.js').catch(()=>({}));
const entry={position:[1630,114,115],target:[1630,55,30],up:[0,1,0]};
test('closure clears names before revealing the mark and is reversible',()=>{
 assert.equal(typeof api.sampleClosure,'function');
 const initial=api.sampleClosure(0,entry);for(const k of ['position','target','up'])assert.deepEqual(initial[k],entry[k]);
 assert.equal(initial.peopleOpacity,1);assert.equal(initial.monumentOpacity,0);
 const handoff=api.sampleClosure(.25,entry);assert.equal(handoff.peopleOpacity,0);assert.equal(handoff.monumentOpacity,0);
 const read=api.sampleClosure(7/12,entry);assert.equal(read.monumentOpacity,1);assert.equal(read.replayVisible,true);
 const before=api.sampleClosure(.2,entry);api.sampleClosure(1,entry);assert.deepEqual(api.sampleClosure(.2,entry),before);
 assert.deepEqual(api.sampleClosure(-2,entry),initial);assert.deepEqual(api.sampleClosure(2,entry),api.sampleClosure(1,entry));
 assert.throws(()=>api.sampleClosure(NaN,entry),RangeError);assert.throws(()=>api.sampleClosure(0,{...entry,target:[NaN,0,0]}),RangeError);
});
test('history replacement adds thirty-six seconds without changing earlier absolute camera poses',()=>{
 const route=createPeopleRoute({leaders:[],members:['one','two','three']});
 assert.equal(story.autoplayDuration(route),150+route.seconds+36+16);
 assert.equal(story.chapterAt((55.2+36+1.5)/28).chapter,'history');
 assert.equal(story.chapterAt((55.2+36+1.5)/28).historyT,1.5/6.4);
 const camera=new T.PerspectiveCamera(48,414/896,.2,2400);
 const end=sampleCourtyard(route,1,camera.aspect),first=story.sampleStoryPose((55.2+36)/28,camera,true,route);
 assert.deepEqual(first.position,end.position);
 const next=story.sampleStoryPose((55.2+36+.001)/28,camera,true,route);assert.ok(new T.Vector3(...next.position).distanceTo(new T.Vector3(...end.position))<.001);
 for(let i=0;i<=100;i++){const a=i/100,b=story.scrollToAutoplay(story.autoplayToScroll(a,route),route);assert.ok(Math.abs(a-b)<1e-9);}
 for(const routeValue of [route,null])for(let i=0;i<=100;i++){const scroll=i/100;assert.ok(Math.abs(story.storyToScroll(story.scrollToStory(scroll,routeValue),routeValue)-scroll)<1e-9);}
});

