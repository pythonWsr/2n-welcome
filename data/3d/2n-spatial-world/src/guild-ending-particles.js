import * as T from 'three';
import {nextSmooth,PARTICLE_MARK_FORMED,PARTICLE_PETALS_ARRIVED} from './guild-next-route.js';
import {createMonument} from './monument.js';
import {MeshSurfaceSampler} from 'three/addons/math/MeshSurfaceSampler.js';
import {ENDING_FLOW_GLSL,endingGlyphProgress,endingGateProgress,endingFlowCenter} from './guild-ending-flow.js';
import {createEndingFluid} from './guild-ending-fluid.js';
import {materialRouteTime,MATERIAL_RENDER_GLSL} from './guild-ending-material.js';
import {endingDimensionTransforms,endingDimensionFrame,ENDING_GATE_COUNT} from './guild-ending-frames.js';

// Reference study: FrostNovaOrg/world-execute-web engine/swarm.js,
// engine/rig.js, ch/title/galaxy.js and 02_title.js drawGatherR. Independently authored:
// staggered morphs, curved travel, depth-aware luminous points and a settling orbit.
export const ENDING_PARTICLE_COUNT=262144;
// Irregular overlapping cloud volumes. Biome hues favour regions but spill
// across their neighbours; no five-fold silhouette or planar galaxy disk.
export function endingNebulaPoint(u,v,w,group){
 const cluster=(group+(u>.8?1:0))%3,centres=[[-18,-28,-8],[17,1,17],[-8,32,-20]],c=centres[cluster];
 const angle=u*Math.PI*2+group*.37,yy=v*2-1,xz=Math.sqrt(Math.max(0,1-yy*yy));
 const radius=27*Math.pow(w,.55)*(.92+.17*Math.sin(angle*3+yy*4));
 return [c[0]+Math.cos(angle)*xz*radius*.82,c[1]+yy*radius*1.12,c[2]+Math.sin(angle)*xz*radius];
}
export function endingFrame(t=0){
 const u=Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
 const gateOrbit=(-.12+.30*nextSmooth((u-.10)/.34))*(1-nextSmooth((u-.55)/.15));
 const orbit=T.MathUtils.lerp(Math.sin(Math.PI*nextSmooth(u))*.61,gateOrbit,nextSmooth((u-.18)/.12));
 return {reveal:nextSmooth(u/.16),cloud:nextSmooth(u/(3/18)),dimension:nextSmooth((u-3/18)/.14),glyph:endingGlyphProgress(u),settle:nextSmooth((u-.88)/.12),orbit,light:1+1.7*Math.sin(Math.PI*u)**2};
}
export function endingCamera(pose,t,reduced=false){
 const f=endingFrame(t),k=nextSmooth(t/.24),target=[0,30,-14];
 const finalTarget=pose.target.map((v,i)=>T.MathUtils.lerp(v,target[i],k));
 const radius=T.MathUtils.lerp(pose.position[2]-pose.target[2],250+(reduced?0:66*nextSmooth((t-.18)/.12)*(1-nextSmooth((t-.55)/.15))),k);
 const orbit=reduced?0:f.orbit;
 return {target:finalTarget,position:[T.MathUtils.lerp(pose.position[0],Math.sin(orbit)*radius,k),T.MathUtils.lerp(pose.position[1],34+(reduced?0:18*Math.sin(Math.PI*t)),k),finalTarget[2]+T.MathUtils.lerp(pose.position[2]-pose.target[2],Math.cos(orbit)*radius,k)]};
}
function petalFlight(a){
 let hash=2166136261;const key=String(a.id??`${a.branch}:${a.u}:${a.longitude}`);
 for(let i=0;i<key.length;i++)hash=Math.imul(hash^key.charCodeAt(i),16777619);
 hash=Math.imul(hash^(hash>>>16),0x7feb352d);hash=Math.imul(hash^(hash>>>15),0x846ca68b);hash^=hash>>>16;
 const random=()=>{hash=(Math.imul(hash,1664525)+1013904223)>>>0;return hash/4294967296;};
 const u=random(),v=random(),w=random();
 return {delay:u*.22,finish:.84+v*.16,bend:[(u-.5)*24,8+v*12,(w-.5)*48]};
}
export function endingPetalFrame(pose,aspect,anchors){
 const end=endingCamera(pose,1),camera=new T.PerspectiveCamera(48,aspect);camera.position.fromArray(end.position);camera.lookAt(...end.target);camera.updateMatrixWorld();
 const slots=new Map(),placed=[],half=Math.tan(T.MathUtils.degToRad(24));
 for(const [index,a] of anchors.entries()){
  const depth=[195,270,355][index%3];let best=null,score=-Infinity;
  for(let trial=0;trial<700;trial++){
   const angle=(trial*.61803398875+a.u*.413+a.branch*.27)*Math.PI*2;
   const r=.52+((trial*137+index*79)%997)/997*.42;
   const x=Math.cos(angle)*r,y=.27+Math.sin(angle)*r*.54;
   const radius=5.9/(depth*half),gap=placed.length?Math.min(...placed.map(p=>Math.hypot((x-p.x)*aspect,y-p.y)/(radius+p.radius))):2;
   if(gap>score){score=gap;best={x,y,radius};}
  }
  placed.push(best);slots.set(a.id,{position:new T.Vector3(best.x*depth*half*aspect,best.y*depth*half,-depth).applyMatrix4(camera.matrixWorld),phase:index*2.39996,ring:index%3,aspect,flight:petalFlight(a)});
 }
 return slots;
}
export function endingPetalPose(a,t,reduced=false){
 const escort=nextSmooth((t-.22)/.10)*(1-nextSmooth((t-.70)/.15));
 const phase=a.longitude+t*12+a.branch*.7;
 return reduced?[0,0,0]:[.07*Math.sin(phase)*escort,.08*Math.cos(phase*.8)*escort,.22*Math.sin(phase*.6)*escort];
}
export function endingPetalPoint(a,start,t,time=0,reduced=false,slots=null,particleEnding=true){
 const slot=slots?.get(a.id),aspect=slot?.aspect||.6,fit=Math.min(1,aspect/.6),motion=reduced?0:1;
 // Original 158c2fb entry: petals begin rotating while they move outwards.
 const spiral=nextSmooth((t-.12)/.35),theta=a.longitude+spiral*1.6+t*18*.09*spiral*motion;
 const radius=54+(a.branch||0)*18+12*a.u;
 const early=new T.Vector3(Math.cos(theta)*radius*fit,30+Math.sin(theta)*radius*.46,-14+Math.sin(theta)*radius*.62+(a.u-.5)*48);
 const route=endingFlowCenter(endingGateProgress(Math.max(0,t-(a.u-.5)*.035)),fit);
 const angle=a.longitude+(t-.22)*(3.2+.8*a.u)*motion+a.branch*.6;
 const spread=52+18*a.u+14*nextSmooth((t-.46)/.10)+12*nextSmooth((t-.55)/.15)*(1-nextSmooth((t-.80)/.10));
 const escort=new T.Vector3(route[0]+Math.cos(angle)*spread*fit,route[1]+Math.sin(angle)*spread*.65,route[2]+Math.sin(angle*1.4+a.branch)*45+(a.u-.5)*42);
 const cloud=early.lerp(escort,nextSmooth((t-.20)/.12));
 let destination;
 if(particleEnding){
  // Arrive directly in one loose lower XZ band. The old scattered landing
  // points belong only to the legacy ending, never to this transition.
  const phase=slot?.phase??a.longitude,r=60+6*Math.sin(phase*.73+a.u*4)+4*Math.cos(phase*1.21),orbitFit=Math.min(1,aspect/.75);
  const height=21+4*Math.sin(phase*1.7+a.u*4);
  // One angular phase throughout arrival and idle: blending opposite points
  // in Cartesian space would collapse the ring on a long-idle rewind.
  const angle=phase-(reduced?0:time*.14);
  destination=new T.Vector3(Math.cos(angle)*r*orbitFit,height+1.6*Math.sin(angle*2+a.branch),-14-Math.sin(angle)*r*.9);
 }else{
  destination=slot?.position.clone()||new T.Vector3(Math.cos(a.longitude)*radius*fit,30+Math.sin(a.longitude)*radius*.46,-14+Math.sin(a.longitude)*radius*.62);
  if(slot&&!reduced)destination.add(new T.Vector3(Math.sin(time*.12+slot.phase)*.8,Math.cos(time*.13+slot.phase)*.8,Math.sin(time*.11+slot.phase)*1.8));
 }
 if(particleEnding){
  const flight=slot?.flight||petalFlight(a),stage=(t-PARTICLE_MARK_FORMED)/(PARTICLE_PETALS_ARRIVED-PARTICLE_MARK_FORMED);
  const u=Math.max(0,Math.min(1,(stage-flight.delay)/(flight.finish-flight.delay)));
  cloud.lerp(destination,nextSmooth(u));
  // Each identity follows its own 3D arc. The bump and its first two
  // derivatives vanish at either end, retaining the escort/orbit velocity.
  const arc=64*u*u*u*(1-u)*(1-u)*(1-u)*motion;
  cloud.add(new T.Vector3(flight.bend[0]*fit,flight.bend[1],flight.bend[2]).multiplyScalar(arc));
 }else cloud.lerp(destination,nextSmooth((t-.68)/.22));
 const flight=slot?.flight||petalFlight(a),departure=.006+.018*flight.delay/.22;
 // Preserve each live story point and its velocity at the boundary, then
 // carry it into the star field over the existing first 3.24 seconds.
 const enter=particleEnding?nextSmooth((t-departure)/(.18-departure)):(nextSmooth((t-.10-(a.u%.2)*.12)/.58)+(1-nextSmooth((t-.10-(a.u%.2)*.12)/.58))*nextSmooth((t-.18)/.12));
 return start.map((v,i)=>T.MathUtils.lerp(v,cloud.getComponent(i),enter));
}
// Sample the exact opening sculpture, retaining its separate superscript n,
// pitched faces, original proportions and thickness. No hand-drawn glyph.
export function createEndingParticles({renderer}={}){
 const geometry=new T.BufferGeometry(),seed=new Float32Array(ENDING_PARTICLE_COUNT*4),glyph=new Float32Array(ENDING_PARTICLE_COUNT*3),normals=new Float32Array(ENDING_PARTICLE_COUNT*3),cloud=new Float32Array(ENDING_PARTICLE_COUNT*3);
 let state=971231;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const monument=createMonument(),box=new T.Box3().setFromObject(monument),center=box.getCenter(new T.Vector3()),point=new T.Vector3(),normal=new T.Vector3();
 const surfaces=monument.children.map(mesh=>{
  const sampler=new MeshSurfaceSampler(mesh).setRandomGenerator(random).build();
  return {sampler,area:sampler.distribution.at(-1)};
 });
 const total=surfaces.reduce((n,s)=>n+s.area,0);
 for(let i=0;i<ENDING_PARTICLE_COUNT;i++){
  seed.set([random(),random(),random(),i%5],i*4);
  cloud.set(endingNebulaPoint(seed[i*4],seed[i*4+1],seed[i*4+2],i%5),i*3);
  let pick=random()*total,surface=surfaces.at(-1);for(const s of surfaces){if(pick<s.area){surface=s;break;}pick-=s.area;}
  surface.sampler.sample(point,normal);point.sub(center);glyph.set(point.toArray(),i*3);normals.set(normal.toArray(),i*3);
 }
 // The same sculpture supplies an invisible depth surface. Transparent
 // particles alone cannot hide solid petals travelling behind the mark.
 monument.children[0].material.dispose();
 // Transparent queue order is particles -> depth-only shell -> solid petals.
 // Writing this surface before the fluid clipped its own settling particles;
 // alpha-hashed depth fading made the clipped surface appear to sparkle.
 const depthMaterial=new T.MeshBasicMaterial({colorWrite:false,transparent:true,depthWrite:true,depthTest:true,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
 const occluder=monument;occluder.name='ending-mark-depth';occluder.visible=false;occluder.renderOrder=0;
 for(const mesh of occluder.children){mesh.geometry.translate(-center.x,-center.y,-center.z);mesh.material=depthMaterial;mesh.renderOrder=1;}
 geometry.setAttribute('aNormal',new T.BufferAttribute(normals,3));
 geometry.setAttribute('aCloud',new T.BufferAttribute(cloud,3));
 geometry.setAttribute('position',new T.BufferAttribute(glyph,3));geometry.setAttribute('aSeed',new T.BufferAttribute(seed,4));
 const uv=new Float32Array(ENDING_PARTICLE_COUNT*2),side=Math.sqrt(ENDING_PARTICLE_COUNT);
 for(let i=0;i<ENDING_PARTICLE_COUNT;i++)uv.set([(i%side+.5)/side,(Math.floor(i/side)+.5)/side],i*2);
 geometry.setAttribute('aFluidUV',new T.BufferAttribute(uv,2));
 let fluid=null;
 try{fluid=renderer?createEndingFluid(renderer,geometry):null;}
 catch(error){geometry.dispose();occluder.traverse(o=>o.geometry?.dispose());depthMaterial.dispose();throw error;}
 // Ordinary alpha blending bounds dense crossings to the palette; visibility
 // comes from wider bright cores, not unbounded additive accumulation.
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:T.NormalBlending,toneMapped:false,uniforms:{uT:{value:0},uTime:{value:0},uPixels:{value:896},uAspect:{value:.6},uReduced:{value:0},uFrameInverse:{value:Array.from({length:ENDING_GATE_COUNT},()=>new T.Matrix4())},uFramePulse:{value:new Float32Array(ENDING_GATE_COUNT)}},
 vertexShader:`attribute vec4 aSeed; attribute vec3 aNormal,aCloud;attribute vec2 aFluidUV;uniform sampler2D uFluidA,uFluidB,uFluidC,uFluidD;uniform vec4 uFluidWeights;uniform float uFluidEnabled; uniform float uT,uTime,uPixels,uAspect,uReduced; uniform float uFramePulse[${ENDING_GATE_COUNT}]; uniform mat4 uFrameInverse[${ENDING_GATE_COUNT}]; varying vec3 vColor; varying float vEnergy; varying float vMorph; varying float vMetal;varying float vBlur;
 float ease(float x){x=clamp(x,0.,1.);return x*x*x*(10.+x*(-15.+6.*x));}
 ${ENDING_FLOW_GLSL}
 ${MATERIAL_RENDER_GLSL}
 vec3 biome(float i){if(i<.5)return vec3(.48,1.,.66);if(i<1.5)return vec3(1.,.78,.35);if(i<2.5)return vec3(.3,.77,1.);if(i<3.5)return vec3(.65,.95,.3);return vec3(1.,.28,.24);}
 void main(){
 float turn=aSeed.x*6.2831853,depth=aSeed.y,group=aSeed.w;
 float morph=uFluidEnabled>.5?materialGlyphProgress(uT,aSeed.z):glyphProgress(uT,aSeed.z),reveal=ease((uT-aSeed.z*.05)/.10);
 float gather=morph;
 float fit=min(1.,uAspect/.6);
 float motion=1.-uReduced;
 float sceneTime=uT*18.;
 float dimension=ease((uT-.1666667)/.105);
 float sculptureScale=min(1.12,uAspect*1.75);
 vec3 mark=position*sculptureScale+vec3(0.,43.,-14.);
 vec3 p;
 if(uFluidEnabled>.5&&uT>=.18){p=texture2D(uFluidA,aFluidUV).xyz*uFluidWeights.x+texture2D(uFluidB,aFluidUV).xyz*uFluidWeights.y+texture2D(uFluidC,aFluidUV).xyz*uFluidWeights.z+texture2D(uFluidD,aFluidUV).xyz*uFluidWeights.w;p=mix(p,mark,ease((uT-.96)/.04));}
 else{p=flowPoint(aCloud,mark,aSeed,uT,uAspect,uReduced);}
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
 float star=step(.955,aSeed.y);
 float frontStage=1.-ease((uT-.18)/.12);
 float px=clamp(uPixels*mix(mix(.72,1.1,max(star,gather)),1.1,frontStage)/max(1.,-mv.z),1.8,8.);
 float focusDepth=max(1.,-(modelViewMatrix*vec4(flowCenter(gateProgress(uT),fit),1.)).z);
 float blur=min(2.2,abs(-mv.z-focusDepth)*.018)*(1.-frontStage)*(1.-gather)*uFluidEnabled;
 gl_PointSize=px+blur;vBlur=blur/(px+blur);
 float front=mix(-48.,48.,ease((uT-.12)/.15));
 float wave=exp(-pow((aCloud.z-front)/12.,2.))*(1.-ease((uT-.25)/.08));
 // Each moving gate illuminates only its finite opening, using the same
 // transform and per-gate visibility as its rendered frame.
 float passage=0.;for(int i=0;i<${ENDING_GATE_COUNT};i++){
  vec3 local=(uFrameInverse[i]*vec4(p,1.)).xyz;
  vec2 outside=max(abs(local.xy)-vec2(1.),vec2(0.));
  float faceDistance=length(vec3(outside,local.z));
  passage=max(passage,exp(-pow(faceDistance/.15,2.))*uFramePulse[i]);
 }
 passage*=dimension*(1.-morph);
 float pulse=pow(max(0.,cos(depth*9.-sceneTime*.6*motion-group*.5)),12.);
 float climax=1.+1.8*sin(uT*3.141593)*sin(uT*3.141593);
 float pockets=.22+.78*smoothstep(-.4,.7,sin(aCloud.x*.13+aCloud.y*.08)+.6*cos(aCloud.z*.16-aCloud.y*.06));
 vEnergy=reveal*(.16+.3*aSeed.z)*climax*(.55+.55*pulse+1.1*wave+.7*passage);
 float nearSide=clamp((mv.z+300.)/100.,0.,1.);
 vEnergy*=mix(pockets*(.65+.35*nearSide)+star*.55,.75,gather);
 vMetal=.42+.45*max(0.,dot(normalize(aNormal),normalize(vec3(-.5,.7,1.))))+.10*pow(max(0.,dot(normalize(aNormal),normalize(vec3(.5,.2,1.)))),8.);
 float legacyPulse=pow(max(0.,sin(depth*14.-uT*19.+group)),12.);
 float legacyReveal=ease((uT-aSeed.z*.07)/.12);
 float legacyEnergy=legacyReveal*(.16+.3*aSeed.z)*climax*(.5+1.5*legacyPulse);
 vEnergy=mix(vEnergy,legacyEnergy,frontStage);
 vEnergy*=px*px/((px+blur)*(px+blur));
 float shade=mix(.55+.22*nearSide+.13*pockets+.10*aSeed.z,1.,frontStage);
 vec3 colour=mix(biome(group),vec3(.75,.82,.9),star*.25*(1.-frontStage))*shade;
 vMorph=gather;vColor=mix(colour,vec3(.72,.80,.89)*vMetal,gather);
 }`,
 fragmentShader:`varying vec3 vColor;varying float vEnergy;varying float vMorph;varying float vMetal;varying float vBlur;void main(){float r=length(gl_PointCoord-.5)*2.;float core=exp(-r*r*13.);float halo=exp(-r*r*5.)*(1.-smoothstep(.75,1.,r));float coverage=mix(core*.85+halo*.15,halo,vBlur);float alpha=coverage*min(.58,vEnergy*1.6);gl_FragColor=vec4(vColor,alpha);
 #include <colorspace_fragment>
 }`});
 for(const name of ['uFluidA','uFluidB','uFluidC','uFluidD'])material.uniforms[name]={value:null};
 material.uniforms.uFluidWeights={value:new T.Vector4(0,1,0,0)};material.uniforms.uFluidEnabled={value:fluid?1:0};
 const points=new T.Points(geometry,material);points.name='ending-shape-swarm';points.frustumCulled=false;points.visible=false;
 let disposed=false;
 return {points,occluder,update(t,time,camera,reduced=false,particleEnding=!!fluid){if(disposed)return;points.visible=Number.isFinite(t)&&t>0;material.uniforms.uT.value=Number.isFinite(t)?t:0;material.uniforms.uTime.value=time;material.uniforms.uAspect.value=camera.aspect;material.uniforms.uPixels.value=(globalThis.devicePixelRatio||1)*896;material.uniforms.uReduced.value=reduced?1:0;
  occluder.visible=particleEnding&&Number.isFinite(t)&&t>=PARTICLE_MARK_FORMED;occluder.position.set(0,43,-14);occluder.scale.setScalar(Math.min(1.12,camera.aspect*1.75));
  const sample=fluid?.update(t);
  if(sample){['uFluidA','uFluidB','uFluidC','uFluidD'].forEach((name,i)=>material.uniforms[name].value=sample.frames[i]);material.uniforms.uFluidWeights.value.fromArray(sample.weights);}
  const route=fluid?materialRouteTime(t):t;
  endingDimensionTransforms(route,camera.aspect,reduced,!!fluid).forEach((matrix,i)=>material.uniforms.uFrameInverse.value[i].copy(matrix).invert());material.uniforms.uFramePulse.value.set(endingDimensionFrame(route,reduced,!!fluid).gates.map(g=>g.visibility));
 },invalidate(){fluid?.invalidate();},warm(aspect,reduced=false){fluid?.warm(aspect,reduced);},get fluidReady(){return !!fluid?.ready;},get fluidHits(){return fluid?.hits||null;},dispose(){if(disposed)return;disposed=true;fluid?.dispose();geometry.dispose();material.dispose();occluder.traverse(o=>o.geometry?.dispose());depthMaterial.dispose();}};
}
