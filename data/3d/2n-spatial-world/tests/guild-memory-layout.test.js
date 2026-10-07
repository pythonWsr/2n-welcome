import test from 'node:test';
import assert from 'node:assert/strict';
test('memory layouts keep stable long chains, separate silhouettes and model clearance',async()=>{
 const {createMemoryLayout}=await import('../src/guild-memory-layout.js');
 const assets=[{key:'rose',radius:1.1},{key:'clover',radius:1.4}];
 for(const mobile of [true,false]){
  const a=createMemoryLayout({mobile,assets}),b=createMemoryLayout({mobile,assets});
  assert.deepEqual(a,b);assert.ok(a.anchors.length>=48);assert.ok(a.anchors.length<=(mobile?96:144));
  assert.equal(new Set(a.anchors.map(p=>p.id)).size,a.anchors.length);
  assert.notDeepEqual(a.shots[0],a.shots[1]);assert.notDeepEqual(a.shots[1],a.shots[2]);
  for(let stage=0;stage<3;stage++)for(let i=0;i<a.anchors.length;i++)for(let j=0;j<i;j++){
   const p=a.anchors[i],q=a.anchors[j];const d=Math.hypot(...p.positions[stage].map((v,k)=>v-q.positions[stage][k]));
   assert.ok(d>=p.radius+q.radius+.5,`clearance stage ${stage} ${i}/${j}`);
  }
 }
 assert.deepEqual(createMemoryLayout({mobile:true,assets:[]}).anchors,[]);
});

test('two chains become a true shell and then expand without changing identities',async()=>{
 const {createMemoryLayout,memoryPoint,sampleMemoryStory}=await import('../src/guild-memory-layout.js');
 const layout=createMemoryLayout({assets:[{key:'rose',radius:2.2}]});
 assert.equal(new Set(layout.anchors.map(a=>a.branch)).size,2);
 for(const a of layout.anchors){
  const shell=memoryPoint(a,1),large=memoryPoint(a,2);
  const radius=v=>Math.hypot(v[0],v[1],v[2]+14);
  assert.ok(Math.abs(radius(shell)-42)<1e-8);assert.ok(Math.abs(radius(large)-90.3)<1e-8);
  const before=memoryPoint(a,1-1e-6),after=memoryPoint(a,1+1e-6);
  assert.ok(Math.hypot(...before.map((v,i)=>v-after[i]))<1e-5,'morph is continuous');
 }
 const p=layout.anchors.map(a=>memoryPoint(a,1));assert.ok(Math.max(...p.map(v=>v[2]))-Math.min(...p.map(v=>v[2]))>75);
 assert.equal(sampleMemoryStory(0).eventIndex,0);assert.equal(sampleMemoryStory(.5).eventIndex,1);assert.equal(sampleMemoryStory(1).eventIndex,2);
});
