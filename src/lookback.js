import * as T from 'three';
import {hellPose} from './hell-production.js';
export const HELL_EXIT=.8, RETURN_UNITS=28;
export const RETURN_START=(24+4*HELL_EXIT)/28;
export const STORY_UNITS=24+4*HELL_EXIT+RETURN_UNITS;
const entry=hellPose(HELL_EXIT,new T.PerspectiveCamera());
const near=hellPose(HELL_EXIT-1e-6,new T.PerspectiveCamera());
const shots=[
 {t:0,p:entry.position,target:entry.target},
 {t:.045,p:[1510,35,68],target:[1535,-35,5]},
 {t:.10,p:[1485,80,108],target:[1470,-35,10]},
 {t:.15,p:[1370,138,110],target:[1400,-35,0]},
 {t:.26,p:[1040,125,112],target:[1000,-35,10]},
 {t:.30,p:[940,125,112],target:[1000,-35,10]},
 {t:.40,p:[700,112,108],target:[650,-41,10]},
 {t:.44,p:[600,112,108],target:[650,-41,10]},
 {t:.54,p:[415,94,94],target:[366,-35,10]},
 {t:.58,p:[315,94,94],target:[366,-35,10]},
 {t:.66,p:[210,94,94],target:[166,-35,10]},
 {t:.70,p:[130,110,120],target:[166,-35,10]},
 {t:.76,p:[245,142,165],target:[355,-35,15]},
 {t:.88,p:[305,138,140],target:[450,90,20]},
 {t:1,p:[305,138,140],target:[450,90,20]},
];
const tracks={};
for(const [key,source] of [['p','position'],['target','target']]){
 const points=shots.map(s=>new T.Vector3(...s[key]));
 const tangents=shots.map((s,i)=>i===0?new T.Vector3(...entry[source].map((v,j)=>(v-near[source][j])/1e-6*RETURN_UNITS/4)):i>=shots.length-2?new T.Vector3():points[Math.min(i+1,points.length-1)].clone().sub(points[i-1]).divideScalar(shots[i+1].t-shots[i-1].t));
 tracks[key]={points,tangents};
}
function sample(t,key,out){
 let i=0;while(i<shots.length-2&&t>shots[i+1].t)i++;
 const h=shots[i+1].t-shots[i].t,u=(t-shots[i].t)/h,s=u*u,q=s*u,{points:p,tangents:m}=tracks[key];
 return out.set(0,0,0).addScaledVector(p[i],2*q-3*s+1).addScaledVector(m[i],(q-2*s+u)*h).addScaledVector(p[i+1],-2*q+3*s).addScaledVector(m[i+1],(q-s)*h);
}
const focus=new T.Vector3();
export function lookbackPose(t,camera){t=T.MathUtils.clamp(t,0,1);sample(t,'p',camera.position);sample(t,'target',focus);camera.lookAt(focus);return {position:camera.position.toArray(),target:focus.toArray()};}
const reading=new T.PerspectiveCamera();lookbackPose(1,reading);reading.updateMatrixWorld();
export const readingQuaternion=reading.quaternion.clone();
export const readingPoint=(x,y,z=-100,out=new T.Vector3())=>out.set(x,y,z).applyQuaternion(readingQuaternion).add(reading.position);
export const FLOWER_SPECS=[
 ['garden','rose',.653,4.3],['garden','clover',.663,4.2],['garden','goldenleaf',.673,3.8],
 ['desert','cactus',.533,4.2],['desert','sand',.543,4.3],['desert','iris',.553,2.9],
 ['ocean','pearl',.393,3.5],['ocean','shell',.403,4.4],['ocean','starfish',.413,4.5],
 ['jungle','peas',.253,4.6],['jungle','tomato',.263,4.0],['jungle','compass',.273,4.0],
 ['hell','darkmark',.08,4.2],['hell','corruption',.094,4.2],
];
const origins=[[166,-30,10],[366,-30,10],[650,-36,10],[1000,-30,10],[1470,-30,10]];
// Authored world paths, never offsets from the moving camera. Region flight
// remains over its source while the camera passes it; offscreen travel is valid.
const flowers=FLOWER_SPECS.map((_,i)=>{
 const angle=(i+.25)*Math.PI*2/14+(i%3-1)*.04,depth=92+i*4;
 const x=Math.cos(angle)*(.70+(i%4)*.02)*depth*Math.tan(Math.PI*24/180)*414/896,y=Math.sin(angle)*(.60+(i%3)*.025)*depth*Math.tan(Math.PI*24/180);
 return {start:new T.Vector3(...origins[Math.min(4,Math.floor(i/3))]),
  x,y,depth,end:readingPoint(x,y,-depth),gate:readingPoint(x*2.2,y*2.2,-depth),
  gather:.74+i*.002,arrive:.92+i*.002};
});
let readingAspectScale=1;
export function setReadingAspect(aspect){
 const scale=Math.min(1,Math.max(.4,aspect/(414/896)));readingAspectScale=scale;
 for(const f of flowers){readingPoint(f.x*scale,f.y,-f.depth,f.end);readingPoint(f.x*scale*2.2,f.y*2.2,-f.depth,f.gate);}
 return scale;
}
const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),d=new T.Vector3();
const readingInverse=readingQuaternion.clone().invert(),local=new T.Vector3();
const ease=u=>{u=T.MathUtils.clamp(u,0,1);return u*u*u*(10+u*(-15+6*u));};
function bezier(u,a,b,c,d,out){const v=1-u;return out.copy(a).multiplyScalar(v*v*v).addScaledVector(b,3*v*v*u).addScaledVector(c,3*v*u*u).addScaledVector(d,u*u*u);}
export const flowerReveal=i=>FLOWER_SPECS[i][2];
export function flowerPose(i,t,out=new T.Vector3(),origin=flowers[i].start,orbitAngle=0,flightTime=0){
 const f=flowers[i],phase=flowerReveal(i),lane=i%3-1;
 if(t<=phase)return out.copy(origin);
 a.copy(origin);a.x+=lane*13;a.y+=30+(i%3)*8;a.z-=18+(i%3)*18;
 const free=()=>{
  const weight=T.MathUtils.smoothstep(t,phase,phase+.04)*(1-T.MathUtils.smoothstep(t,.70,Math.min(.76,f.gather)));
  const wind=flightTime*.9+(t-phase)*35+i*1.7;
  out.x+=Math.sin(wind*.73)*7*weight;
  out.y+=(Math.sin(wind)*12+Math.sin(wind*.43+i)*5)*weight;
  out.z+=Math.cos(wind*.83)*10*weight;
  return out;
 };
 if(t<phase+.04){out.copy(origin).lerp(a,ease((t-phase)/.04));return free();}
 b.set(origin.x-60-(i%3)*20,100+(i%5)*12,-150-i*12);
 if(t<f.gather){out.copy(a).lerp(b,ease((t-phase-.04)/(f.gather-phase-.04)));return free();}
 // Rotate throughout gathering in an elliptical reading-space metric. This
 // preserves the portrait opening while the radius contracts from gate to end.
 const spiral=()=>{
  const blend=T.MathUtils.smoothstep(t,f.gather,f.gather+.04);
  const angle=-(1.2*ease((t-.74)/.22)+orbitAngle)*blend;
  local.copy(out).sub(reading.position).applyQuaternion(readingInverse);
  const ratio=.74*414/896*readingAspectScale/.64;
  const x=local.x/ratio,y=local.y,cos=Math.cos(angle),sin=Math.sin(angle);
  local.x=(x*cos-y*sin)*ratio;local.y=x*sin+y*cos;
  return out.copy(local).applyQuaternion(readingQuaternion).add(reading.position);
 };
 a.copy(b);c.copy(f.gate);c.y+=650+i*4;b.copy(a).lerp(f.gate,.5);b.y+=650+i*4;
 const gateTime=.84+i*.002;
 if(t<gateTime){bezier(ease((t-f.gather)/(gateTime-f.gather)),a,b,c,f.gate,out);return spiral();}
 if(t<f.arrive){out.copy(f.gate).lerp(f.end,ease((t-gateTime)/(f.arrive-gateTime)));return spiral();}
 const drift=ease((t-f.arrive)/(1-f.arrive));
 out.copy(f.end).addScaledVector(d.set((i%2?1:-1)*.35,.5,-.3),drift);
 return spiral();
}
