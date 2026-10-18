import * as T from 'three';
import {GPUComputationRenderer} from 'three/addons/misc/GPUComputationRenderer.js';
import {nextSmooth} from './guild-next-route.js';
import {endingFlowCenter,endingFlowTangent,endingStreamPoint,endingGateProgress} from './guild-ending-flow.js';
import {ENDING_GATE_COUNT,endingDimensionTransforms,endingDimensionFrame} from './guild-ending-frames.js';
import {createMaterialGuides,materialTarget,materialSpring,materialGlyphProgress,materialRouteTime,MATERIAL_GLSL} from './guild-ending-material.js';

export const FLUID_DT=1/60,FLUID_START=.18,FLUID_SECONDS=18;
const LAST_TICK=Math.floor((1-FLUID_START)*FLUID_SECONDS/FLUID_DT+1e-7),CACHE_STRIDE=15;
// Integrate once, retain full-resolution positions, and sample in either
// direction. GPU history uses half-float targets: 60 x 2 MiB at 262144 points.
// Cubic interpolation keeps velocity continuous between quarter-second keys.
export function createFluidTimeline({reset,step,capture,release}){
 let tick=0,initialized=false,disposed=false;const frames=[];
 const clear=()=>{for(const frame of frames)release(frame);frames.length=0;tick=0;initialized=false;};
 return {
  get ready(){return initialized&&tick===LAST_TICK;},get frameCount(){return frames.length;},
  warm(budget=1){
   if(disposed)return;
   if(!initialized){reset();frames.push(capture());initialized=true;}
   const end=Math.min(LAST_TICK,tick+Math.max(0,Math.min(4,Math.floor(budget))));
   while(tick<end){step(FLUID_START+tick*FLUID_DT/FLUID_SECONDS,FLUID_DT);tick++;if(tick%CACHE_STRIDE===0)frames.push(capture());}
  },
  sample(progress){
   if(!frames.length)return null;
   const at=Math.max(0,Math.min(frames.length-1,((Number.isFinite(progress)?progress:0)-FLUID_START)*FLUID_SECONDS/FLUID_DT/CACHE_STRIDE));
   const j=Math.min(Math.max(0,frames.length-2),Math.floor(at)),u=at-j,u2=u*u,u3=u2*u;
   const weights=[-.5*u+u2-.5*u3,1-2.5*u2+1.5*u3,.5*u+2*u2-1.5*u3,-.5*u2+.5*u3];
   // Extrapolated boundary neighbours preserve the incoming/outgoing tangent.
   if(j===0){weights[1]+=2*weights[0];weights[2]-=weights[0];weights[0]=0;}
   if(j+2>=frames.length){weights[1]-=weights[3];weights[2]+=2*weights[3];weights[3]=0;}
   return {frames:[j-1,j,j+1,j+2].map(i=>frames[Math.max(0,Math.min(frames.length-1,i))]),weights};
  },
  invalidate(){if(!disposed)clear();},dispose(){if(disposed)return;clear();disposed=true;}
 };
}
// A fixed tick index, never accumulated display deltas. Backwards seeks reset
// and replay the same force history; pauses do not advance physics.
export function createFluidClock(reset,step){
 let tick=0,initialized=false;
 return {seek(progress,forceReset=false){
  const t=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
  const target=Math.max(0,Math.floor((t-FLUID_START)*FLUID_SECONDS/FLUID_DT+1e-7));
  if(!initialized||forceReset||target<tick){reset();tick=0;initialized=true;}
  while(tick<target){step(FLUID_START+tick*FLUID_DT/FLUID_SECONDS,FLUID_DT);tick++;}
  return tick;
 }};
}
export function fluidGuide(t,aspect=.6){
 const fit=Math.min(1,aspect/.6),route=materialRouteTime(t),x=Math.max(0,Math.min(1,(route-.18)/.40));
 const center=endingFlowCenter(endingGateProgress(route),fit);
 const ds=30*x*x*(1-x)*(1-x)/(8.5-.18*FLUID_SECONDS);
 return {center,velocity:endingFlowTangent(endingGateProgress(route),fit).map(v=>v*ds)};
}
export function fluidGateStates(t,aspect=.6,reduced=false){
 const route=materialRouteTime(t),frame=endingDimensionFrame(route,reduced,true);
 return endingDimensionTransforms(route,aspect,reduced,true).map((matrix,i)=>{
  const inv=matrix.clone().invert(),e=inv.elements;
  const normal=new T.Vector3(e[2],e[6],e[10]).normalize();
  return {center:new T.Vector3().setFromMatrixPosition(matrix).toArray(),normal:normal.toArray(),radius:frame.scales[i],visibility:frame.gates[i].visibility,inverse:Array.from(e)};
 });
}
// Curl of a smooth vector potential: local eddies, not a displacement applied
// to a fixed sheet. This field has zero analytic divergence before constraints.
export function fluidCurl(p,time){
 const [x,y,z]=p.map(v=>v*.045),a=time*.4;
 return [-Math.sin(x+a*.6)*Math.sin(y)-Math.cos(z-a*.8)*Math.cos(x),
  -Math.sin(y+a)*Math.sin(z)-Math.cos(x+a*.6)*Math.cos(y),
  -Math.sin(z-a*.8)*Math.sin(x)-Math.cos(y+a)*Math.cos(z)];
}
export function fluidVolumePressure(states,aspect=.6){
 const fit=Math.min(1,aspect/.6),center=[0,0,0],variance=[0,0,0],count=Math.max(1,states.length);
 for(const state of states){const p=state.position||state.p;for(let i=0;i<3;i++)center[i]+=p[i]/count;}
 for(const state of states){const p=state.position||state.p;for(let i=0;i<3;i++)variance[i]+=((p[i]-center[i])/(i===0?fit:1))**2/count;}
 // Coarse moment pressure counters squeezed axes without resetting any point
 // to a shape. This is an artistic volume constraint, not an SPH solver.
 return {center,pressure:variance.map(v=>Math.max(-.15,Math.min(2,(306.25/(v+16)-1)*.75)))};
}
function gateExtent(p,gate){
 if(!gate.inverse){const d=p.map((x,k)=>x-gate.center[k]),axial=d.reduce((s,x,k)=>s+x*gate.normal[k],0);return Math.sqrt(Math.max(0,d.reduce((s,x)=>s+x*x,0)-axial*axial))/gate.radius;}
 const e=gate.inverse;
 return Math.max(Math.abs(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12]),Math.abs(e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13]));
}
export function fluidAcceleration(p,v,seed,t,gates,mark,aspect=.6,reduced=false,volume=null){
 const fit=Math.min(1,aspect/.6),guide=fluidGuide(t,aspect),q=p.map((x,i)=>(x-guide.center[i])/(i===0?fit:1));
 const r=Math.max(.001,Math.hypot(...q)),curl=fluidCurl([p[0]/fit,p[1],p[2]],t*18);
 const start=nextSmooth((t-.18)/.06),motion=reduced?0:1;
 const pressure=20*Math.max(0,1-r/22)-2.5*Math.max(0,r-49);
 const a=q.map((x,i)=>{
  const scale=i===0?fit:1;
  const returnFlow=volume?(guide.center[i]-volume.center[i])*1.3*nextSmooth((t-.55)/.12):0;
  const desired=guide.velocity[i]+(curl[i]*14*motion-x*.025)*scale+returnFlow;
  const bulk=volume?(p[i]-volume.center[i])*volume.pressure[i]*nextSmooth((t-.45)/.15):0;
  return ((desired-v[i])*1.7+x/r*pressure*scale+bulk)*start;
 });
 for(const gate of gates){
  const d=p.map((x,i)=>x-gate.center[i]),axial=d.reduce((n,x,i)=>n+x*gate.normal[i],0);
  const side=d.map((x,i)=>x-gate.normal[i]*axial),extent=gateExtent(p,gate);
  if(extent>=1.15)continue;
  const near=Math.exp(-((axial/13)**2))*(1-nextSmooth((extent-.65)/.5))*gate.visibility;
  const n=gate.normal,tangent=[n[1]*side[2]-n[2]*side[1],n[2]*side[0]-n[0]*side[2],n[0]*side[1]-n[1]*side[0]];
  const along=guide.velocity.reduce((s,x,i)=>s+x*n[i],0)>=0?1:-1;
  for(let i=0;i<3;i++)a[i]+=near*(-side[i]*.75+n[i]*along*16+tangent[i]*.32*motion);
 }
 // Material guide centers need position transport as well as matching speed:
 // velocity-only following preserves the initial cloud's large offsets and
 // lets whole strands miss an aperture. This force acts on CPU guides only.
 if(volume?.transportGuide){
  const angle=seed[3]*Math.PI*2/5+seed[1]*2,offset=[Math.cos(angle)*10*fit,(seed[1]-.5)*16,Math.sin(angle)*10];
  for(let i=0;i<3;i++){
   const spring=8*(guide.center[i]+offset[i]-p[i])+2*Math.sqrt(8)*(guide.velocity[i]-v[i]);
   a[i]+=start*.85*(spring-a[i]);
  }
 }
 // Critically damped attraction grows only after the unshaped central hold.
 if(volume?.material){
  const frame=volume.material.sample(seed),target=materialTarget(seed,t,aspect,reduced,frame),h=.0001;
  const before=materialTarget(seed,t-h,aspect,reduced,frame),after=materialTarget(seed,t+h,aspect,reduced,frame),gather=nextSmooth((t-.46)/.15);
  const targetV=frame.velocity.map((x,i)=>x*(1-gather)+(after[i]-before[i])/(2*h*18));
  const spring=materialSpring(p,v,target,targetV,t);
  for(let i=0;i<3;i++)a[i]+=start*.85*(spring[i]-a[i]);
 }
 const glyph=materialGlyphProgress(t,seed[2]);
 const k=35*glyph,drag=2*Math.sqrt(k);
 return a.map((x,i)=>x*(1-glyph)+(k*(mark[i]-p[i])-drag*v[i]));
}
export function stepFluidParticle(p,v,seed,t,dt,gates,mark,aspect=.6,reduced=false,volume=null){
 const a=fluidAcceleration(p,v,seed,t,gates,mark,aspect,reduced,volume),velocity=v.map((x,i)=>x+a[i]*dt);
 const speed=Math.hypot(...velocity);if(speed>160)for(let i=0;i<3;i++)velocity[i]*=160/speed;
 return {position:p.map((x,i)=>x+velocity[i]*dt),velocity};
}
export function recordFluidPassage(hits,previous,current,t,gates){
 for(let i=0;i<gates.length;i++){
  const gate=gates[i],a=previous.map((x,k)=>x-gate.center[k]),b=current.map((x,k)=>x-gate.center[k]);
  const old=a.reduce((s,x,k)=>s+x*gate.normal[k],0),now=b.reduce((s,x,k)=>s+x*gate.normal[k],0);
  if(old*now<=0&&gateExtent(current,gate)<1&&gate.visibility>.1&&t-hits[i]>.045)hits[i]=t;
 }
}

export const FLUID_FORCE_GLSL=`
uniform float fT,fDt,fAspect,fReduced;
uniform vec3 fCenter,fGuideVelocity,fMassCenter,fVolumePressure;
uniform sampler2D fSeed,fGlyph;
uniform sampler2D fMaterialPosition,fMaterialVelocity,fMaterialU,fMaterialV;
uniform vec3 fGateCenter[${ENDING_GATE_COUNT}],fGateNormal[${ENDING_GATE_COUNT}];
uniform mat4 fGateInverse[${ENDING_GATE_COUNT}];
uniform float fGateRadius[${ENDING_GATE_COUNT}],fGateVisibility[${ENDING_GATE_COUNT}];
float smooth5(float x){x=clamp(x,0.,1.);return x*x*x*(10.+x*(-15.+6.*x));}
${MATERIAL_GLSL}
vec3 sampleMaterial(sampler2D field,vec4 seed){
 float x=clamp(seed.y*63.,0.,63.),j=min(62.,floor(x)),f=x-j;
 return mix(texture2D(field,vec2((j+.5)/64.,(seed.w+.5)/5.)).xyz,texture2D(field,vec2((j+1.5)/64.,(seed.w+.5)/5.)).xyz,f);
}
vec3 curlField(vec3 p,float time){
 vec3 q=p*.045;float a=time*.4;
 return vec3(-sin(q.x+a*.6)*sin(q.y)-cos(q.z-a*.8)*cos(q.x),
 -sin(q.y+a)*sin(q.z)-cos(q.x+a*.6)*cos(q.y),
 -sin(q.z-a*.8)*sin(q.x)-cos(q.y+a)*cos(q.z));
}
vec3 velocityStep(vec3 p,vec3 v,vec4 seed,vec3 mark){
 float fit=min(1.,fAspect/.6);vec3 scale=vec3(fit,1.,1.);
 vec3 q=(p-fCenter)/scale;float r=max(.001,length(q));
 vec3 curl=curlField(p/scale,fT*18.);
 float pressure=20.*max(0.,1.-r/22.)-2.5*max(0.,r-49.);
 vec3 returnFlow=(fCenter-fMassCenter)*1.3*smooth5((fT-.55)/.12);
 vec3 desired=fGuideVelocity+(curl*14.*(1.-fReduced)-q*.025)*scale+returnFlow;
 vec3 bulk=(p-fMassCenter)*fVolumePressure*smooth5((fT-.45)/.15);
 vec3 a=((desired-v)*1.7+q/r*pressure*scale+bulk)*smooth5((fT-.18)/.06);
 for(int i=0;i<${ENDING_GATE_COUNT};i++){
  vec3 d=p-fGateCenter[i],n=fGateNormal[i];float axial=dot(d,n);
  vec3 side=d-n*axial,local=(fGateInverse[i]*vec4(p,1.)).xyz;float extent=max(abs(local.x),abs(local.y));
  if(extent>=1.15)continue;
  float near=exp(-pow(axial/13.,2.))*(1.-smooth5((extent-.65)/.5))*fGateVisibility[i];
  float along=dot(fGuideVelocity,n)>=0.?1.:-1.;
  a+=near*(-side*.75+n*along*16.+cross(n,side)*.32*(1.-fReduced));
 }
 vec3 center=sampleMaterial(fMaterialPosition,seed),va=sampleMaterial(fMaterialVelocity,seed),ma=sampleMaterial(fMaterialU,seed),mb=sampleMaterial(fMaterialV,seed);
 vec3 target=materialTarget(seed,fT,fit,fReduced,center,ma,mb);
 vec3 before=materialTarget(seed,fT-.0001,fit,fReduced,center,ma,mb),after=materialTarget(seed,fT+.0001,fit,fReduced,center,ma,mb);
 vec3 targetV=va*(1.-smooth5((fT-.46)/.15))+(after-before)/(.0002*18.);
 vec3 spring=materialSpring(p,v,target,targetV,fT);
 a=mix(a,spring,smooth5((fT-.18)/.06)*.85);
 float glyph=materialGlyphProgress(fT,seed.z),k=35.*glyph,drag=2.*sqrt(k);
 a=a*(1.-glyph)+k*(mark-p)-drag*v;
 vec3 nextV=v+a*fDt;float speed=length(nextV);
 return speed>160.?nextV*(160./speed):nextV;
}`;

export function createEndingFluid(renderer,geometry){
 if(!renderer.extensions.has('EXT_color_buffer_float'))throw new Error('此设备不支持当前流体实验所需的浮点缓冲，未回退到旧动画');
 const count=geometry.getAttribute('position').count,side=Math.sqrt(count);
 const gpu=new GPUComputationRenderer(side,side,renderer),pos0=gpu.createTexture(),vel0=gpu.createTexture(),seeds=gpu.createTexture(),glyphs=gpu.createTexture();
 seeds.image.data.set(geometry.getAttribute('aSeed').array);
 const pos=geometry.getAttribute('position');for(let i=0;i<count;i++)glyphs.image.data.set([pos.getX(i),pos.getY(i),pos.getZ(i),1],i*4);
 const common=FLUID_FORCE_GLSL+`\nvoid main(){
 vec2 uv=gl_FragCoord.xy/resolution.xy;vec3 p=texture2D(texturePosition,uv).xyz,v=texture2D(textureVelocity,uv).xyz;
 vec4 seed=texture2D(fSeed,uv);vec3 mark=texture2D(fGlyph,uv).xyz*min(1.12,fAspect*1.75)+vec3(0.,43.,-14.);
 vec3 nextV=velocityStep(p,v,seed,mark);`;
 const position=gpu.addVariable('texturePosition',common+'gl_FragColor=vec4(p+nextV*fDt,1.);}',pos0);
 const velocity=gpu.addVariable('textureVelocity',common+'gl_FragColor=vec4(nextV,1.);}',vel0);
 const material=createMaterialGuides();
 for(const variable of [position,velocity]){
  gpu.setVariableDependencies(variable,[position,velocity]);
  Object.assign(variable.material.uniforms,{fT:{value:.18},fDt:{value:FLUID_DT},fAspect:{value:.6},fReduced:{value:0},fCenter:{value:new T.Vector3()},fGuideVelocity:{value:new T.Vector3()},fSeed:{value:seeds},fGlyph:{value:glyphs},
   fMassCenter:{value:new T.Vector3()},fVolumePressure:{value:new T.Vector3()},fGateInverse:{value:Array.from({length:ENDING_GATE_COUNT},()=>new T.Matrix4())},fMaterialPosition:{value:material.textures[0]},fMaterialVelocity:{value:material.textures[1]},fMaterialU:{value:material.textures[2]},fMaterialV:{value:material.textures[3]},
   fGateCenter:{value:Array.from({length:ENDING_GATE_COUNT},()=>new T.Vector3())},fGateNormal:{value:Array.from({length:ENDING_GATE_COUNT},()=>new T.Vector3())},fGateRadius:{value:new Float32Array(ENDING_GATE_COUNT)},fGateVisibility:{value:new Float32Array(ENDING_GATE_COUNT)}});
 }
 let timeline=null;
 const clean=()=>{timeline?.dispose();gpu.dispose();position.material.dispose();velocity.material.dispose();seeds.dispose();glyphs.dispose();material.dispose();};
 // Compile the real compute shaders before declaring the preview ready.
 const previousError=renderer.debug.onShaderError,target=renderer.getRenderTarget(),xr=renderer.xr.enabled,shadow=renderer.shadowMap.autoUpdate;
 try{
  renderer.debug.onShaderError=(gl,program,vs,fs)=>{throw new Error(gl.getProgramInfoLog(program)||gl.getShaderInfoLog(fs)||'GPU流体着色器编译失败');};
  const error=gpu.init();if(error)throw new Error(error);gpu.compute();
 }catch(error){clean();throw error;}finally{renderer.debug.onShaderError=previousError;renderer.xr.enabled=xr;renderer.shadowMap.autoUpdate=shadow;renderer.setRenderTarget(target);}
 let aspect=.6,reduced=false,disposed=false,feedbackTick=0;
 const hits=new Float32Array(ENDING_GATE_COUNT).fill(-10),simulationHits=new Float32Array(ENDING_GATE_COUNT).fill(-10),feedback=new Float32Array((LAST_TICK+1)*ENDING_GATE_COUNT).fill(-10),observers=[];
 const reset=()=>{
  material.reset(aspect,reduced);
  for(let i=0;i<count;i++){
   const seed=Array.from(seeds.image.data.subarray(i*4,i*4+4));
   const p=endingStreamPoint(seed,.18,aspect,reduced),next=endingStreamPoint(seed,.18001,aspect,reduced);
   pos0.image.data.set([...p,1],i*4);vel0.image.data.set([...p.map((x,k)=>(next[k]-x)/(.00001*18)),1],i*4);
  }
  pos0.needsUpdate=true;vel0.needsUpdate=true;
  for(const variable of [position,velocity])for(const target of variable.renderTargets)gpu.renderTexture(variable.initialValueTexture,target);
  gpu.currentTextureIndex=0;
  hits.fill(-10);simulationHits.fill(-10);feedback.fill(-10);feedbackTick=0;observers.length=0;
  // Small deterministic witnesses trigger gate feedback; they never replace
  // or reduce the 262144 independently simulated GPU particles.
  for(let j=0;j<64;j++){
   const i=j*4093;observers.push({position:Array.from(pos0.image.data.subarray(i*4,i*4+3)),velocity:Array.from(vel0.image.data.subarray(i*4,i*4+3)),seed:Array.from(seeds.image.data.subarray(i*4,i*4+4)),glyph:Array.from(glyphs.image.data.subarray(i*4,i*4+3))});
  }
 };
 const step=(t,dt)=>{
  const guide=fluidGuide(t,aspect),gates=fluidGateStates(t,aspect,reduced),bulk=fluidVolumePressure(observers,aspect),volume={...bulk,material};
  for(const variable of [position,velocity]){
   const u=variable.material.uniforms;u.fT.value=t;u.fDt.value=dt;u.fAspect.value=aspect;u.fReduced.value=reduced?1:0;u.fCenter.value.fromArray(guide.center);u.fGuideVelocity.value.fromArray(guide.velocity);
   u.fMassCenter.value.fromArray(volume.center);u.fVolumePressure.value.fromArray(volume.pressure);
   for(let i=0;i<ENDING_GATE_COUNT;i++){u.fGateCenter.value[i].fromArray(gates[i].center);u.fGateNormal.value[i].fromArray(gates[i].normal);u.fGateInverse.value[i].fromArray(gates[i].inverse);u.fGateRadius.value[i]=gates[i].radius;u.fGateVisibility.value[i]=gates[i].visibility;}
  }
  gpu.compute();
  for(const o of observers){
   const mark=o.glyph.map((x,i)=>x*Math.min(1.12,aspect*1.75)+[0,43,-14][i]);
   const next=stepFluidParticle(o.position,o.velocity,o.seed,t,dt,gates,mark,aspect,reduced,volume);
   recordFluidPassage(simulationHits,o.position,next.position,t,gates);o.position=next.position;o.velocity=next.velocity;
  }
  material.step(t,dt,gates,bulk,stepFluidParticle);
  feedback.set(simulationHits,++feedbackTick*ENDING_GATE_COUNT);
 };
 timeline=createFluidTimeline({reset,step,capture(){
  const target=new T.WebGLRenderTarget(side,side,{type:T.HalfFloatType,format:T.RGBAFormat,minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:false});
  gpu.renderTexture(gpu.getCurrentRenderTarget(position).texture,target);return target;
 },release:target=>target.dispose()});
 return {hits,get ready(){return timeline.ready;},invalidate(){timeline.invalidate();hits.fill(-10);},warm(nextAspect,nextReduced){
  if(disposed)return;
  const change=aspect!==nextAspect||reduced!==!!nextReduced;
  aspect=nextAspect;reduced=!!nextReduced;if(change)timeline.invalidate();
  timeline.warm();
 },update(t){
  if(disposed||!timeline.ready)return null;
  const tick=Math.max(0,Math.min(LAST_TICK,Math.floor(((Number.isFinite(t)?t:0)-FLUID_START)*1080+1e-7)));
  hits.set(feedback.subarray(tick*ENDING_GATE_COUNT,(tick+1)*ENDING_GATE_COUNT));
  const sample=timeline.sample(t);return {frames:sample.frames.map(target=>target.texture),weights:sample.weights};
 },dispose(){if(disposed)return;disposed=true;clean();}};
}
