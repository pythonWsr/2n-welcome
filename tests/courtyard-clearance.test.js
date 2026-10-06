import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {createPeopleRoute,resizeCourtyard,sampleCourtyard,courtyardEnvironment} from '../src/people-courtyard.js';
import {worldHeight} from '../src/world-surface.js';
import {lookbackPose} from '../src/lookback.js';
const data=JSON.parse(readFileSync(new URL('../content/people.json',import.meta.url)));
// Exactly the finite terrainPart/createRegionGround grids and their triangle diagonal.
const regions=[[45,188,56],[188,296,56],[296,404,56],[404,520,56],[520,900,80],[900,1280,80],[1280,1740,80]];
function ground(x,z){
 const region=regions.find(([a,b])=>x>=a&&x<=b);if(!region||z< -365||z>330)return -Infinity;
 const [a,b,n]=region,dx=(b-a)/n,dz=695/68,i=Math.min(n-1,Math.floor((x-a)/dx)),j=Math.min(67,Math.floor((z+365)/dz));
 const X=a+i*dx,Z=-365+j*dz,u=(x-X)/dx,v=(z-Z)/dz;
 const h=(x,z)=>Math.fround(worldHeight(x,z));
 return u+v<=1?(1-u-v)*h(X,Z)+u*h(X+dx,Z)+v*h(X,Z+dz):(u+v-1)*h(X+dx,Z+dz)+(1-v)*h(X+dx,Z)+(1-u)*h(X,Z+dz);
}
function clear(p,message){assert.ok(p[1]>ground(p[0],p[2])+2,message+': '+p);}
function line(a,b){for(let i=0;i<=12;i++)clear(a.map((v,k)=>v+(b[k]-v)*i/12),'terrain occludes sightline');}
for(const count of [0,95])for(const [width,height] of [[414,896],[240,568],[896,414]])test(`terrain clears camera, full subject envelope and HD bounds: ${count}, ${width}x${height}`,()=>{
 const route=resizeCourtyard(createPeopleRoute({...data,members:data.members.slice(0,count)}),{width,height});
 const env=courtyardEnvironment(route);
 for(const p of env){const radius=Math.sqrt(3)*p.scale[0]/2+.9;for(const x of [-radius,radius])for(const z of [-radius,radius])clear([p.position[0]+x,p.position[1]-radius,p.position[2]+z],'complete rotating HD petal');}
 for(let i=0;i<=1200;i++){
  const pose=sampleCourtyard(route,i/1200,width/height);clear(pose.position,'camera');line(pose.position,pose.target);
  for(const v of pose.visibleStations){const s=route.stations[v.stationIndex];if(!s.quaternion||!v.opacity)continue;
   // Conservative full viewport ink envelope, including all rows and biography tiers.
   const halfY=100*Math.tan(Math.PI*24/180)*.42,halfX=halfY*(width/height)*2;
   for(const x of [-halfX,halfX])for(const y of [-halfY,halfY]){const p=new T.Vector3(x,y,0).applyQuaternion(new T.Quaternion(...s.quaternion)).add(new T.Vector3(...s.position)).toArray();clear(p,'complete glyph bounds');line(pose.position,p);}
  }
 }
 const old=lookbackPose(1,new T.PerspectiveCamera());assert.deepEqual(sampleCourtyard(route,0,width/height).position,old.position);
 const a=sampleCourtyard(route,1e-9,width/height);assert.ok(new T.Vector3(...a.position).distanceTo(new T.Vector3(...old.position))<1e-6);
});

test('clearance reference matches actual finite rendered triangle geometry',async()=>{
 const {preparedWorld}=await import('./support/prepared-world.js');
 const scene=new T.Scene();await preparedWorld(scene,true);
 const meshes=[];scene.traverse(o=>{if(o.isMesh&&['continuous-3d-ground','florr-ocean-ground','florr-jungle-ground','florr-hell-ground'].includes(o.name))meshes.push(o);});
 assert.equal(meshes.length,7);
 let highest=-Infinity;
 for(const mesh of meshes){const p=mesh.geometry.attributes.position,index=mesh.geometry.index;
  for(let i=0;i<p.count;i++)highest=Math.max(highest,p.getY(i));
  for(let i=0;i<index.count;i+=333){const points=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index.getX(i+k)));
   const center=points[0].clone().add(points[1]).add(points[2]).divideScalar(3);
   assert.ok(Math.abs(ground(center.x,center.z)-center.y)<2e-5,'reference differs from rendered triangle plane');
  }
 }
 assert.ok(highest< -19,'conservative terrain envelope changed');
 assert.equal(ground(1741,0),-Infinity);assert.equal(ground(500,331),-Infinity);
});
