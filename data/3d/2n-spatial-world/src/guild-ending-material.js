import * as T from 'three';
import {nextSmooth} from './guild-next-route.js';
import {endingStreamPoint} from './guild-ending-flow.js';
const TAU=Math.PI*2,SAMPLES=64,GROUPS=5;
export const materialRouteTime=t=>.18+(t-.18)*(.40/(8.5/18-.18));
export const materialGlyphProgress=(t,seed=0)=>nextSmooth((t-13.2/18-seed*.035)/(3.3/18-.035));
export function materialSpring(p,v,target,targetV,t){
 // A slightly underdamped arrival permits one small rebound. The coefficients
 // blend smoothly back to critical damping before the final glyph settles.
 const damping=1-.28*nextSmooth((t-.46)/.08)*(1-nextSmooth((t-.71)/.04));
 return p.map((x,k)=>8*(target[k]-x)+2*Math.sqrt(8)*damping*(targetV[k]-v[k]));
}
export function materialTarget(seed,t,aspect,reduced,frame){
 const [u,v,w,g]=seed,fit=Math.min(1,aspect/.6),clock=t*18*(reduced?0:1);
 const angle=u*TAU+clock*(.18+.12*w),radius=(12+2*Math.sin(v*7+clock*.4))*Math.sqrt(w);
 const flow=frame.center.map((x,k)=>x+(frame.u[k]*Math.cos(angle)+frame.v[k]*Math.sin(angle))*radius*(k===0?fit:1));
 const theta=g*TAU/5+(u-.5)*1.7+clock*(.10+.10*w),baseLat=v*2-1;
 // Fade latitude displacement at the poles: clamping used to collapse a
 // finite band onto x=z=0 and draw an unintended bright vertical filament.
 const lat=baseLat+.10*(1-baseLat*baseLat)*Math.sin(theta*2+clock*.3);
 const ring=Math.sqrt(Math.max(0,1-lat*lat)),r=38*Math.cbrt(w)*(1+.12*Math.sin(theta*3+lat*4+clock*.3));
 const body=[Math.cos(theta)*ring*r*fit,43+lat*r*.86+4*Math.sin(theta*2+clock*.2)*Math.cbrt(w),-14+Math.sin(theta)*ring*r];
 const gather=nextSmooth((t-.46)/.15);
 return flow.map((x,k)=>x+(body[k]-x)*gather);
}
export const MATERIAL_GLSL=`
float materialGlyphProgress(float t,float seed){return smooth5((t-13.2/18.-seed*.035)/(3.3/18.-.035));}
vec3 materialTarget(vec4 seed,float t,float fit,float reduced,vec3 center,vec3 a,vec3 b){
 float clock=t*18.*(1.-reduced),angle=seed.x*6.28318530718+clock*(.18+.12*seed.z);
 float radius=(12.+2.*sin(seed.y*7.+clock*.4))*sqrt(seed.z);
 vec3 flow=center+(a*cos(angle)+b*sin(angle))*radius*vec3(fit,1.,1.);
 float theta=seed.w*6.28318530718/5.+(seed.x-.5)*1.7+clock*(.10+.10*seed.z);
 float baseLat=seed.y*2.-1.,lat=baseLat+.10*(1.-baseLat*baseLat)*sin(theta*2.+clock*.3),ring=sqrt(max(0.,1.-lat*lat));
 float r=38.*pow(seed.z,1./3.)*(1.+.12*sin(theta*3.+lat*4.+clock*.3));
 vec3 body=vec3(cos(theta)*ring*r*fit,43.+lat*r*.86+4.*sin(theta*2.+clock*.2)*pow(seed.z,1./3.),-14.+sin(theta)*ring*r);
 return mix(flow,body,smooth5((t-.46)/.15));
}
vec3 materialSpring(vec3 p,vec3 v,vec3 target,vec3 targetV,float t){
 float damping=1.-.28*smooth5((t-.46)/.08)*(1.-smooth5((t-.71)/.04));
 return 8.*(target-p)+2.*sqrt(8.)*damping*(targetV-v);
}`;
export const MATERIAL_RENDER_GLSL=MATERIAL_GLSL.split('vec3 materialTarget')[0].replaceAll('smooth5','ease');

// Transported guides are not extra rendered particles. Bounded sections follow
// them with a soft spring instead of a density atlas or random velocity spray.
export function createMaterialGuides(){
 const arrays=Array.from({length:4},()=>new Float32Array(SAMPLES*GROUPS*4));
 const textures=arrays.map(a=>{const t=new T.DataTexture(a,SAMPLES,GROUPS,T.RGBAFormat,T.FloatType);t.minFilter=t.magFilter=T.NearestFilter;t.needsUpdate=true;return t;});
 let states=[],aspect=.6,reduced=false,disposed=false;
 function refresh(){
  const fit=Math.min(1,aspect/.6);
  for(let g=0;g<GROUPS;g++)for(let j=0;j<SAMPLES;j++){
   const i=g*SAMPLES+j,s=states[i],before=states[g*SAMPLES+Math.max(0,j-1)].position,after=states[g*SAMPLES+Math.min(SAMPLES-1,j+1)].position;
   const tangent=new T.Vector3((after[0]-before[0])/fit,after[1]-before[1],after[2]-before[2]);
   if(tangent.lengthSq()<1e-8)tangent.copy(s.tangent||new T.Vector3(0,1,0));tangent.normalize();
   let a=s.a;
   if(a){a.applyQuaternion(new T.Quaternion().setFromUnitVectors(s.tangent,tangent));a.addScaledVector(tangent,-a.dot(tangent)).normalize();}
   else{a=new T.Vector3().crossVectors(Math.abs(tangent.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0),tangent).normalize();}
   s.a=a;s.tangent=tangent;const b=new T.Vector3().crossVectors(tangent,a).normalize();
   arrays[0].set([...s.position,1],i*4);arrays[1].set([...s.velocity,1],i*4);arrays[2].set([...a.toArray(),0],i*4);arrays[3].set([...b.toArray(),0],i*4);
  }
  for(const t of textures)t.needsUpdate=true;
 }
 return {textures,get states(){return states;},reset(nextAspect,nextReduced){
  aspect=nextAspect;reduced=!!nextReduced;states=[];
  for(let g=0;g<GROUPS;g++)for(let j=0;j<SAMPLES;j++){
   const v=j/(SAMPLES-1),seed=[.25,v,.5,g];
   const at=t=>{const a=endingStreamPoint([0,v,.5,g],t,aspect,reduced),b=endingStreamPoint([.5,v,.5,g],t,aspect,reduced);return a.map((x,k)=>(x+b[k])/2);};
   const p=at(.18),n=at(.18001);states.push({seed,position:p,velocity:p.map((x,k)=>(n[k]-x)/.00018)});
  }
  refresh();
 },step(t,dt,gates,volume,advance){
  const guideVolume={...volume,transportGuide:true};
  for(const s of states){const next=advance(s.position,s.velocity,s.seed,t,dt,gates,[0,43,-14],aspect,reduced,guideVolume);s.position=next.position;s.velocity=next.velocity;}
  refresh();
 },sample(seed){
  const x=Math.max(0,Math.min(SAMPLES-1,seed[1]*(SAMPLES-1))),j=Math.min(SAMPLES-2,Math.floor(x)),f=x-j,offset=Math.round(seed[3])*SAMPLES+j;
  const values=arrays.map(a=>[0,1,2].map(k=>a[offset*4+k]+(a[(offset+1)*4+k]-a[offset*4+k])*f));
  return {center:values[0],velocity:values[1],u:values[2],v:values[3]};
 },dispose(){if(disposed)return;disposed=true;for(const t of textures)t.dispose();}};
}
