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
test('particle protection reverses at the same bounded speed and preserves unrelated chapters and reduced motion',()=>{
 assert.equal(typeof guard.limitManualParticleEnding,'function');
 const p=start+(end-start)*.7,back=guard.limitManualParticleEnding(p,start-.1,1/60);
 assert.ok(back<p&&p-back<=(end-start)/1080+1e-10);
 assert.equal(guard.limitManualParticleEnding(start-.2,start-.1,1/60),start-.1);
 assert.equal(guard.limitManualParticleEnding(p,end,1/60,true),end);
 assert.equal(guard.limitManualParticleEnding(p,end,0),p);
 assert.equal(guard.limitManualParticleEnding(p,p,1/60),p);
 const slow=p+(end-start)/2160;
 assert.equal(guard.limitManualParticleEnding(p,slow,1/60),slow,'a slow drag retains its requested position');
 const entered=guard.limitManualParticleEnding(start-.01,end,1/60);
 assert.ok(entered>=start&&entered<=start+(end-start)/1080+1e-10,'crossing from the story cannot skip the particle entrance');
 const leaving=guard.limitManualParticleEnding(end,start,1/60);
 assert.ok(leaving<end&&end-leaving<=(end-start)/1080+1e-10,'reversing the final frame cannot jump straight to the story');
 assert.ok(guard.limitManualParticleEnding(p,end,5)-p<=(end-start)*.05/18+1e-10,'a resumed tab cannot consume the segment in a single long frame');
});
