import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPeopleRoute,resizeCourtyard,sampleCourtyard} from '../src/people-courtyard.js';
import {peopleTimeToDistance,peopleDistanceToTime} from '../src/people-distance.js';
import {PEOPLE_UNITS} from '../src/people-path.js';
import {petalBreath} from '../src/petal-breath.js';
const data={leaders:[{id:'awdc',name:'awdc'},{id:'vice',name:'vice',intro:'介绍'}],members:Array.from({length:95},(_,i)=>`member_${i}`)};
test('unmeasured roster stays balanced without singleton pages',()=>{
 const r=resizeCourtyard(createPeopleRoute(data),{width:390,height:844}),groups=r.stations.filter(s=>s.kind==='member');
 assert.ok(groups.every(s=>s.memberIndices.length>=5&&s.memberIndices.length<=7));
 assert.deepEqual(groups.flatMap(s=>s.memberIndices),Array.from({length:95},(_,i)=>i));
 assert.ok(Math.max(...groups.map(s=>s.memberIndices.length))-Math.min(...groups.map(s=>s.memberIndices.length))<=1);
});
test('five-region reading shots look at finite ground',()=>{
 const r=createPeopleRoute(data),regions=new Set();
 for(const w of r.windows.slice(1,-1)){
  regions.add(r.stations[w.stationIndex].region);const p=sampleCourtyard(r,(w.readStart+w.readEnd)/2);
  assert.ok(p.position[0]>=77&&p.position[0]<=1670&&p.position[1]-p.target[1]>50);
  const c=new T.PerspectiveCamera(48,390/844,.2,2400);c.position.fromArray(p.position);c.up.fromArray(p.up);c.lookAt(new T.Vector3(...p.target));c.updateMatrixWorld();
  const dir=new T.Vector3(0,0,-1).applyQuaternion(c.quaternion),hit=c.position.clone().addScaledVector(dir,(-40-p.position[1])/dir.y);
  assert.ok(hit.x>45&&hit.x<1740&&hit.z>-290&&hit.z<250);
 }
 assert.deepEqual([...regions],['garden','desert','ocean','jungle','hell']);
});
test('manual reading survives shorter autoplay and is reversible',()=>{
 const r=createPeopleRoute(data),w=r.windows[1],budget=(peopleTimeToDistance(w.readEnd,r)-peopleTimeToDistance(w.readStart,r))*PEOPLE_UNITS;
 assert.ok(budget>=.8&&budget<=1.4);assert.ok(r.stations.filter(s=>s.kind==='member').every(s=>s.readSeconds<=3.5));
 for(let i=0;i<=100;i++){const t=i/100;assert.ok(Math.abs(peopleDistanceToTime(peopleTimeToDistance(t,r),r)-t)<1e-9);}
});
test('stable breathing stays small and text transfer is exclusive',()=>{
 const offsets=Array.from({length:61},(_,i)=>petalBreath('courtyard-12-3',i/10,844,100));
 assert.ok(Math.max(...offsets.map(p=>p.offset))-Math.min(...offsets.map(p=>p.offset))>.7);
 assert.ok(offsets.every(p=>Math.abs(p.angle)<=Math.PI/90&&Math.abs(p.offset)<=p.amplitude));
 const r=resizeCourtyard(createPeopleRoute(data),{width:896,height:414});
 for(let i=0;i<=1000;i++){const p=sampleCourtyard(r,i/1000,896/414);assert.ok(p.visibleStations.filter(v=>v.opacity>1e-8&&['leader','member'].includes(r.stations[v.stationIndex].kind)).length<=1);}
});
