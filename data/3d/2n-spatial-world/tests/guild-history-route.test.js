import test from 'node:test';
import assert from 'node:assert/strict';
const data=await import('../src/guild-history-data.js').catch(()=>({}));
const api=await import('../src/guild-history-route.js').catch(()=>({}));
test('approved history validates exact dates and rejects invalid dates and duplicate IDs',()=>{
 assert.equal(typeof data.normalizeHistory,'function');
 const events=['a','b','c'].map(id=>({id,date:'2026-02-24',title:'从相遇，到同行',body:'同行',approved:true}));
 assert.equal(data.normalizeHistory({events}).errors.length,0);
 assert.ok(data.normalizeHistory({events:[{...events[0],date:'2026-02-30'},...events.slice(1)]}).errors.length);
 assert.ok(data.normalizeHistory({events:[events[0],events[0],events[2]]}).errors.length);
 for(const bad of [null,42,{...events[0],title:42},{...events[0],body:{}},{...events[0],date:null}])assert.ok(data.normalizeHistory({events:[bad,...events.slice(1)]}).errors.length);
});
test('history is continuous reversible and keeps final text with independent scroll mapping',()=>{
 assert.equal(typeof api.createHistoryRoute,'function');
 const entry={position:[1600,110,110],target:[1600,55,30],up:[0,1,0]};
 const r=api.createHistoryRoute([{id:'a'},{id:'b'},{id:'c'}],entry);
 assert.equal(r.seconds,36);assert.deepEqual(api.sampleHistory(r,0,.46).position,entry.position);
 assert.equal(api.sampleHistory(r,1,.46).eventOpacity,1);
 for(let i=0;i<=100;i++){const t=i/100;assert.ok(Math.abs(api.historyDistanceToTime(api.historyTimeToDistance(t,r),r)-t)<1e-6);const s=api.sampleHistory(r,t,.46);assert.ok(s.position.every(Number.isFinite));if(s.eventOpacity>0)assert.equal(s.peopleOpacity,0);}
 assert.deepEqual(api.sampleHistory(r,.4,.46),api.sampleHistory(r,.4,.46));
});
test('invalid history content has a finite safe pose instead of throwing in the render loop',()=>{
 assert.equal(typeof api.sampleHistoryForData,'function');
 const entry={position:[0,100,100],target:[0,55,30],up:[0,1,0]};
 for(const raw of [{events:[]},{events:[null,null,null]}]){const state=api.sampleHistoryForData(raw,entry,1,.46);assert.deepEqual(state.position,entry.position);assert.equal(state.eventOpacity,0);assert.equal(state.replayVisible,true);}
});
