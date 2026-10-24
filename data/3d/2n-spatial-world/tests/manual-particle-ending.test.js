import test from 'node:test';
import assert from 'node:assert/strict';
import * as guard from '../src/manual-history-entry.js';

const start=97.6/28,end=100.8/28;
test('a manual fling cannot skip the particle ending or run faster than its eighteen second timeline',()=>{
 assert.equal(typeof guard.limitManualParticleEnding,'function');
 let p=start;
 for(let i=0;i<60;i++)p=guard.limitManualParticleEnding(p,end,1/60);
 assert.ok(p>start&&p<=start+(end-start)/18+1e-10);
 for(let i=0;i<18*60;i++)p=guard.limitManualParticleEnding(p,end,1/60);
 assert.equal(p,end);
});
test('particle protection reverses at the faster bounded speed and preserves unrelated chapters and reduced motion',()=>{
 assert.equal(typeof guard.limitManualParticleEnding,'function');
 const p=start+(end-start)*.7,back=guard.limitManualParticleEnding(p,start-.1,1/60);
 assert.ok(back<p&&p-back<=(end-start)*1.35/1080+1e-10);
 assert.equal(guard.limitManualParticleEnding(start-.2,start-.1,1/60),start-.1);
 assert.equal(guard.limitManualParticleEnding(p,end,1/60,true),end);
 assert.equal(guard.limitManualParticleEnding(p,end,0),p);
 assert.equal(guard.limitManualParticleEnding(p,p,1/60),p);
 const slow=p+(end-start)/2160;
 assert.equal(guard.limitManualParticleEnding(p,slow,1/60),slow,'a slow drag retains its requested position');
 const entered=guard.limitManualParticleEnding(start-.01,end,1/60);
 assert.ok(entered>=start&&entered<=start+(end-start)/1080+1e-10,'crossing from the story cannot skip the particle entrance');
 const leaving=guard.limitManualParticleEnding(end,start,1/60);
 assert.ok(leaving<end&&end-leaving<=(end-start)*1.35/1080+1e-10,'reversing the final frame cannot jump straight to the story');
 assert.ok(guard.limitManualParticleEnding(p,end,5)-p<=(end-start)*.05/18+1e-10,'a resumed tab cannot consume the segment in a single long frame');
});

test('the last reverse particle step lands on the story boundary before entering history',()=>{
 const p=start+(end-start)/2160;
 assert.ok(Math.abs(guard.limitManualParticleEnding(p,start-.5,1/60)-start)<1e-12);
 assert.equal(guard.limitManualParticleEnding(start,start-.0001,1/60),start-.0001);
});

// A saturated reverse request should consume 1.35 seconds of either chapter
// per wall-clock second; nearby targets must still stop exactly on request.
test('particles and history reverse at 1.35 times normal speed without changing forward playback',()=>{
 let forward=start,reverse=end,history=start;
 for(let i=0;i<60;i++){
  forward=guard.limitManualParticleEnding(forward,end,1/60);
  reverse=guard.limitManualParticleEnding(reverse,start,1/60);
  history=guard.limitManualHistoryReverse(history,91.2/28,1/60);
 }
 assert.ok(Math.abs((end-reverse)/(forward-start)-1.35)<1e-9);
 assert.ok(Math.abs((start-history)/(6.4/28)-1.35/36)<1e-9);
 const near=reverse-.000001;
 assert.equal(guard.limitManualParticleEnding(reverse,near,1/60),near);
 assert.equal(guard.limitManualHistoryReverse(history,history-.000001,1/60),history-.000001);
});
