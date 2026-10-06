import * as T from 'three';
import {normalizePeople} from './people-data.js';
import {lookbackPose, readingPoint, readingQuaternion, FLOWER_SPECS, flowerPose} from './lookback.js';

const TRANSITION = .9;
const clamp = t => Math.max(0, Math.min(1, t));
const ease = t => { const u = clamp(t); return u * u * u * (10 + u * (-15 + 6 * u)); };
const entry = lookbackPose(1, new T.PerspectiveCamera());
const world = (x, y, z) => readingPoint(x, y, z).toArray();
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** Shared durations: half of each transition belongs to each neighboring window. */
function windowsFor(stations) {
  const seconds = stations.reduce((sum, station) => sum + station.readSeconds, 0) + Math.max(0, stations.length - 1) * TRANSITION;
  let cursor = 0;
  const windows = stations.map((station, stationIndex) => {
    const start = cursor;
    const readStart = start + (stationIndex ? TRANSITION / 2 : 0);
    const readEnd = readStart + station.readSeconds;
    cursor = readEnd + (stationIndex < stations.length - 1 ? TRANSITION / 2 : 0);
    return {stationIndex, start: start / seconds, readStart: readStart / seconds, readEnd: readEnd / seconds, end: cursor / seconds};
  });
  windows.at(-1).readEnd = 1;
  windows.at(-1).end = 1;
  return {windows, seconds};
}

const REGIONS=[['garden',130,260],['desert',325,465],['ocean',585,805],['jungle',965,1190],['hell',1400,1630]];
const shotQuaternion=new T.Quaternion().setFromEuler(new T.Euler(-35*Math.PI/180,0,0));
function balancedGroups(indices,capacity){
 const count=Math.ceil(indices.length/capacity),groups=[];let cursor=0;
 for(let i=0;i<count;i++){const size=Math.floor(indices.length/count)+(i<indices.length%count?1:0);groups.push(indices.slice(cursor,cursor+=size));}
 return groups;
}
// Bound every reading shot to the existing finite terrain, looking down 35°.
function authorShots(stations){
 const subjects=stations.filter(s=>s.kind==='leader'||s.kind==='member');let index=0;
 const shots=stations.map(s=>{
  if(s.kind==='entry'||s.kind==='ending')return s;
  const progress=subjects.length>1?index/(subjects.length-1):0;
  const regionIndex=Math.min(4,Math.floor(progress*5)),[region,x0,x1]=REGIONS[regionIndex];
  const phase=progress===1?1:progress*5-regionIndex;
  const position=[x0+(x1-x0)*phase,55,30+28*Math.sin(index*.7)],q=shotQuaternion.toArray();
  const cameraPosition=new T.Vector3(0,0,100).applyQuaternion(shotQuaternion).add(new T.Vector3(...position)).toArray();
  const petalAnchors=Array.from({length:6},(_,j)=>{
   const sourceIndex=(index*5+j)%FLOWER_SPECS.length,[kind,name,,extent]=FLOWER_SPECS[sourceIndex];
   return {id:`${s.id}-petal-${j}`,sourceIndex,key:`${kind}:${name}`,position:new T.Vector3((j%2?1:-1)*(20+j%3*7),[-23,25,-29,30,-20,23][j],[12,-10,-26,18,-35,-18][j]).applyQuaternion(shotQuaternion).add(new T.Vector3(...position)).toArray(),quaternion:[...q],scale:[extent,extent,extent]};
  });
  index++;return {...s,region,elevation:0,position,target:[...position],cameraPosition,quaternion:q,up:[0,1,0],petalAnchors};
 });
 const last=shots.at(-2);
 if(shots.at(-1)?.kind==='ending')shots[shots.length-1]={...shots.at(-1),region:last.region,position:[...last.position],target:[...last.target],cameraPosition:mix(last.target,last.cameraPosition,1.03),up:[...last.up]};
 return shots;
}
const memberSeconds=count=>count<=3?2:3.2;
export function createPeopleRoute(data){
 const people=normalizePeople(data);if(people.errors.length)throw new Error(people.errors.join('\n'));
 const memberGroups=balancedGroups(people.members.map((_,i)=>i),7).map((memberIndices,i)=>({id:`members-${i}`,memberIndices}));
 const stations=[{id:'entry',sourceStationId:'entry',kind:'entry',memberIndices:[],position:[...entry.target],target:[...entry.target],cameraPosition:[...entry.position],up:[0,1,0],petalAnchors:[],readSeconds:2}];
 people.leaders.forEach((person,leaderIndex)=>stations.push({id:`leader:${person.id}`,personId:person.id,sourceStationId:person.id,kind:'leader',leaderIndex,memberIndices:[],readSeconds:person.intro?6.5:4.5,scrollRead:person.intro?1.4:1}));
 memberGroups.forEach(g=>stations.push({...g,id:`member:${g.id}:0`,sourceStationId:g.id,kind:'member',readSeconds:memberSeconds(g.memberIndices.length),scrollRead:.9}));
 stations.push({id:'ending',sourceStationId:'ending',kind:'ending',memberIndices:[],petalAnchors:[],readSeconds:2});
 const authored=authorShots(stations);return {stations:authored,sourceStations:authored,memberGroups,...windowsFor(authored),people};
}
// Measured or conservative wrapped rows; balance the entire source roster.
export function resizeCourtyard(route,{width,height,glyphMetrics}){
 if(![width,height].every(v=>Number.isFinite(v)&&v>0))throw new RangeError('viewport must be positive');
 const indices=route.people.members.map((_,i)=>i),columns=width>=280?2:1,columnWidth=width*(columns===2?.34:.74);
 const widest=Math.max(0,...indices.map(i=>{const m=glyphMetrics?.members?.[i];return m?(m.maxX-m.minX)/Math.max(...m.glyphs.map(g=>g[3]-g[1]))*22:route.people.members[i].length*22*.7;}));
 const rowPixels=Math.max(44,Math.ceil(widest/columnWidth)*31+12),capacity=Math.max(2,Math.min(7,Math.floor(height*.4/rowPixels)*columns));
 const groups=balancedGroups(indices,capacity),sourceStations=route.sourceStations||route.stations;
 const stations=sourceStations.filter(s=>s.kind==='entry'||s.kind==='leader').map(s=>({...s}));
 groups.forEach((memberIndices,i)=>stations.push({id:`member:members-${i}:0`,sourceStationId:`members-${i}`,kind:'member',memberIndices,part:0,columns,rowPixels,readSeconds:memberSeconds(memberIndices.length),scrollRead:.9}));
 stations.push({...sourceStations.at(-1)});const authored=authorShots(stations);
 return {...route,sourceStations,stations:authored,memberGroups:groups.map((memberIndices,i)=>({id:`members-${i}`,memberIndices})),...windowsFor(authored),viewport:{width,height}};
}

/** Hermite interpolation with shared derivatives makes random seeks C1 continuous. */
function sampleTrack(knots, seconds, key) {
  let i = 0;
  while (i < knots.length - 2 && seconds > knots[i + 1].time) i++;
  const a = knots[i], b = knots[i + 1], h = b.time - a.time, u = clamp((seconds - a.time) / h);
  const u2 = u * u, u3 = u2 * u;
  const derivative = index => {
    if (!index || index === knots.length - 1) return [0, 0, 0];
    // Each pair bounds one reading interval. Share its slow drift derivative
    // with the neighboring transfer, rather than letting transfer distances
    // pull the target away from the fixed readable subject during the hold.
    const first = knots[index - index % 2], last = knots[index - index % 2 + 1];
    return last[key].map((v, axis) => (v - first[key][axis]) / (last.time - first.time));
  };
  const da = derivative(i), db = derivative(i + 1);
  return a[key].map((v, axis) => (2 * u3 - 3 * u2 + 1) * v + (u3 - 2 * u2 + u) * h * da[axis] + (-2 * u3 + 3 * u2) * b[key][axis] + (u3 - u2) * h * db[axis]);
}

/** One reversible chapter gate, expressed in route time, including a moving
 * petals-only interval at the beginning of the first transfer. */
export function chapterHandoff(route,t) {
 if(!route)return {footprints:1,people:0};
 const end=route.windows[0].readEnd,arrival=route.windows[1].readStart;
 const start=end+(arrival-end)*.25;
 return {footprints:1-ease(t/Math.max(end,1e-9)),people:ease((t-start)/Math.max(arrival-start,1e-9))};
}

const tracks=new WeakMap();
/** Camera-only sampling also builds the manual distance table without allocating
 * the complete petal scene at every integration sample. */
export function sampleCourtyardView(route, t, aspect = 414 / 896) {
  if (!Number.isFinite(aspect) || aspect <= 0) throw new RangeError('camera aspect must be positive');
  t = clamp(Number.isFinite(t) ? t : 0);
  let knots=tracks.get(route);
  if(!knots){knots=[];
  route.windows.forEach(window => {
    const station = route.stations[window.stationIndex];
    const p = station.cameraPosition, target = station.target;
    const drift = window.stationIndex && window.stationIndex < route.stations.length - 1 ? .65 : 0;
    for (const [progress, direction] of [[window.readStart, -1], [window.readEnd, 1]]) {
      const offset = new T.Vector3(0, 0, direction * drift).applyQuaternion(station.quaternion?new T.Quaternion(...station.quaternion):readingQuaternion).toArray();
      knots.push({time: progress * route.seconds, position: p.map((v, i) => v + offset[i]), target: [...target], up: [...station.up]});
    }
  });
  tracks.set(route,knots);}
  let position = sampleTrack(knots, t * route.seconds, 'position');
  const target = sampleTrack(knots, t * route.seconds, 'target');
  const up = new T.Vector3(...sampleTrack(knots, t * route.seconds, 'up')).normalize().toArray();
  const widen = Math.max(1, (414 / 896) / aspect) - 1;
  position = mix(target, position, 1 + widen * ease(t / Math.max(route.windows[0].readEnd, 1e-6)));
  return {position,target,up};
}

/** Absolute sampling only: no camera, renderer, Text, loading, or accumulated time. */
export function sampleCourtyard(route,t,aspect=414/896) {
  t=clamp(Number.isFinite(t)?t:0);
  const {position,target,up}=sampleCourtyardView(route,t,aspect);
  const primaryStation = route.windows.findIndex(w => t >= w.start && (t < w.end || w.end === 1));
  const visibleStations = [];
  const handoff=chapterHandoff(route,t);
  for (let index = Math.max(0, primaryStation - 1); index <= Math.min(route.stations.length - 1, primaryStation + 1); index++) {
    const w = route.windows[index];
    const fadeStart = index ? route.windows[index - 1].readEnd : 0;
    const fadeEnd = index < route.windows.length - 1 ? route.windows[index + 1].readStart : 1;
    const keepLast = route.stations[index].kind === 'member' && route.stations[index + 1]?.kind === 'ending';
    const incoming=fadeStart+(w.readStart-fadeStart)*.54,outgoing=w.readEnd+(fadeEnd-w.readEnd)*.46;
    const opacity=t<w.readStart?ease((t-incoming)/Math.max(w.readStart-incoming,1e-9)):t>w.readEnd&&!keepLast?1-ease((t-w.readEnd)/Math.max(outgoing-w.readEnd,1e-9)):1;
    visibleStations.push({stationIndex: index, opacity: index?Math.min(opacity,handoff.people):opacity, reading: t >= w.readStart && t <= w.readEnd});
  }
  const petals = [...stationPetals(route)];
  // Entry metadata remains available to old clients; the live ring now exits in place.
  FLOWER_SPECS.forEach(([kind, name, , extent], index) => {
    const start = flowerPose(index, 1).toArray();
    const end = world((index % 2 ? 1 : -1) * (24 + index % 3 * 6), -25 + index * 4, -95 - index % 4 * 12);
    petals.push({id: `entry-petal-${index}`, sourceIndex: index, key: `${kind}:${name}`, position: mix(start, end, ease(t / route.windows[0].readEnd)), quaternion: readingQuaternion.toArray(), scale: [extent, extent, extent]});
  });
  return {position, target, up, visibleStations, primaryStation, petals};
}

const stationPetalCache=new WeakMap();
function stationPetals(route){if(!stationPetalCache.has(route))stationPetalCache.set(route,route.stations.flatMap(s=>s.petalAnchors));return stationPetalCache.get(route);}
const environments = new WeakMap();
/** Fixed world clusters authored once from the shared shots, including transfers.
 * Sampling their construction camera never creates a second rendered camera/path.
 */
export function courtyardEnvironment(route) {
  if (environments.has(route)) return environments.get(route);
  const aspect = route.viewport ? route.viewport.width / route.viewport.height : 414 / 896;
  const times = [];
  route.windows.forEach((w,i) => {
    times.push((w.readStart+w.readEnd)/2);
    if(i) for(const u of [.25,.5,.75]) times.push(route.windows[i-1].readEnd+(w.readStart-route.windows[i-1].readEnd)*u);
  });
  times.sort((a,b)=>a-b);
  const petals = [], authoredViews=[];
  const camera = new T.PerspectiveCamera(48,aspect,.2,2400);
  times.forEach((t,cluster) => {
    const view=sampleCourtyardView(route,t,aspect);
    camera.position.fromArray(view.position);camera.up.fromArray(view.up);camera.lookAt(new T.Vector3(...view.target));camera.updateMatrixWorld();
    // Reading drift and near-identical ending shots must not stack full clusters.
    if(authoredViews.some(v=>v.position.distanceTo(camera.position)<12&&v.quaternion.angleTo(camera.quaternion)<.05))return;
    authoredViews.push({position:camera.position.clone(),quaternion:camera.quaternion.clone()});
    for(let j=0;j<6;j++) {
      const sourceIndex=(cluster*5+j)%FLOWER_SPECS.length;
      const [kind,name,,extent]=FLOWER_SPECS[sourceIndex];
      const depth=j%2?112:84, half=depth*Math.tan(Math.PI*24/180);
      const x=[-.65,0,.65,-.65,0,.5][j], y=j<3?.73:-.73;
      const position=new T.Vector3(x*half*aspect,y*half,-depth).applyMatrix4(camera.matrixWorld);
      // Keep v45's world-depth layout and scale. Omit physical duplicates once,
      // rather than shrinking the entire visible chain each animation frame.
      const radius=extent*1.6*.8+.3;
      if(petals.some(p=>position.distanceTo(new T.Vector3(...p.position))<radius+p.radius))continue;
      petals.push({id:`courtyard-${cluster}-${j}`,cluster,time:t,key:`${kind}:${name}`,sourceIndex,
        position:position.toArray(),radius,depth,
        quaternion:camera.quaternion.toArray(),scale:[extent*1.6,extent*1.6,extent*1.6]});
    }
  });
  environments.set(route,petals);return petals;
}
