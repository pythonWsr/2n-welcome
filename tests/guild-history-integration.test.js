import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as story from '../src/people-story.js';
import {createPeopleRoute,sampleCourtyard} from '../src/people-courtyard.js';
test('history replaces closing sculpture and keeps original people endpoint and pacing',()=>{
 const route=createPeopleRoute({leaders:[],members:['a','b','c']});
 assert.equal(story.chapterAt(story.TOTAL_UNITS/28).chapter,'history');
 assert.equal(story.autoplayDuration(route),150+route.seconds+36);
 const cam=new T.PerspectiveCamera(48,414/896,.2,2400),entry=sampleCourtyard(route,1,cam.aspect);
 const state=story.sampleStoryPose((story.LEGACY_TOTAL_UNITS+.0000001)/28,cam,true,route);
 entry.position.forEach((x,i)=>assert.ok(Math.abs(state.position[i]-x)<1e-6));
 for(let i=0;i<=100;i++){const t=i/100;assert.ok(Math.abs(story.scrollToAutoplay(story.autoplayToScroll(t,route),route)-t)<1e-6);}
});
