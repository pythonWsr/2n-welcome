import * as T from 'three';
import {nextSmooth} from './guild-next-route.js';
import {materialRouteTime} from './guild-ending-material.js';

import {endingFlowCenter,endingFlowTangent} from './guild-ending-flow.js';

// Reference: world-execute-web's unfolding geometry and camera choreography.
export const ENDING_GATE_STATIONS=[.35,.60,.69,.78,.87,.92];
export const ENDING_GATE_COUNT=ENDING_GATE_STATIONS.length;
// Six open gates occupy different points of one curved flight; they never
// form a concentric cage. Each rocks open, travels aside, then fades alone.
export function endingDimensionFrame(t=0,reduced=false,material=false){
 const u=Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
 const crossings=[.348,.408,.427,.450,.473,.50];
 const gates=crossings.map((cross,i)=>{
  const open=nextSmooth((u-cross+.12)/.065),retire=nextSmooth((u-cross-(material&&i===0?.12:.025))/.10);
  const action=reduced?0:nextSmooth((u-cross+.10)/.16);
  return {visibility:open*(1-retire),draw:open,retire,
   rotation:[[-.14,.18,-.08][i%3]+action*.18,[-.24,.20,-.18][i%3]+action*[-.22,.25,-.18][i%3],[-.10,.12,-.10][i%3]+action*[.24,-.26,.22][i%3]],
   // The first aperture receives the broad incoming stream before it narrows.
   scale:(material&&i===0?70:54)*(.82+.18*open)*(1-(reduced?0:.18*retire)),
   drift:reduced?[0,0,0]:[[-18,20,-16][i%3]*retire,8*retire,-20*retire]};
 });
 return {gates,visibility:Math.max(...gates.map(g=>g.visibility)),draw:Math.max(...gates.map(g=>g.draw)),
  rotations:gates.map(g=>g.rotation),scales:gates.map(g=>g.scale)};
}
export function endingDimensionTransforms(t,aspect=.6,reduced=false,material=false){
 const f=endingDimensionFrame(t,reduced,material),fit=Math.min(1,Math.max(.1,aspect)/.6);
 return f.gates.map((g,i)=>{
  // Put the receiving gate beyond the initial cloud rather than through it.
  const s=ENDING_GATE_STATIONS[i]+(material&&i===0?.07:0),center=endingFlowCenter(s,fit);
  const orientation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...endingFlowTangent(s,fit)).normalize());
  orientation.multiply(new T.Quaternion().setFromEuler(new T.Euler(...g.rotation)));
  return new T.Matrix4().compose(new T.Vector3(center[0]+g.drift[0]*fit,center[1]+g.drift[1],center[2]+g.drift[2]),
   orientation,new T.Vector3(g.scale*fit,g.scale*.88,g.scale));
 });
}
export function endingFaceProximity(point,t,aspect=.6,reduced=false){
 const f=endingDimensionFrame(t,reduced);let light=0;
 endingDimensionTransforms(t,aspect,reduced).forEach((m,i)=>{
  const p=new T.Vector3(...point).applyMatrix4(m.invert());
  const distance=Math.hypot(Math.max(0,Math.abs(p.x)-1),Math.max(0,Math.abs(p.y)-1),p.z);
  light=Math.max(light,Math.exp(-((distance/.15)**2))*f.gates[i].visibility);
 });return light;
}

export function createEndingFrames(){
 const group=new T.Group();group.name='ending-dimension-frames';group.visible=false;
 const geometry=new T.CylinderGeometry(1,1,1,8,1,true),rippleGeometry=new T.RingGeometry(.98,1,96),layers=[],materials=[];
 const vertices=[[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]].map(p=>new T.Vector3(...p));
 const edges=vertices.flatMap((a,i)=>{const b=vertices[(i+1)%4];return [[a,a.clone().lerp(b,.34)],[a.clone().lerp(b,.66),b]];});
 for(let i=0;i<ENDING_GATE_COUNT;i++){
  const layer=new T.Group(),core=new T.MeshBasicMaterial({color:[0x78cfe2,0xc5b5f1,0xf2d6a2][i%3],transparent:true,opacity:0,depthWrite:false,toneMapped:false});
  const halo=core.clone();materials.push(core,halo);const segments=[];group.add(layer);
  for(let index=0;index<edges.length;index++){
   const [a,b]=edges[index],edge=new T.Mesh(geometry,core),glow=new T.Mesh(geometry,halo);
   edge.userData.frameEdge=true;edge.name=`dimension-edge-${i}-${index}`;
   for(const mesh of [edge,glow]){mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());mesh.frustumCulled=false;layer.add(mesh);}
   segments.push({a,b,edge,glow,index});
  }
  const rippleMaterial=new T.MeshBasicMaterial({color:core.color,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,toneMapped:false});
  const ripple=new T.Mesh(rippleGeometry,rippleMaterial);ripple.name=`gate-pressure-wave-${i}`;ripple.frustumCulled=false;layer.add(ripple);materials.push(rippleMaterial);
  layers.push({layer,core,halo,segments,ripple,rippleMaterial});
 }
 let disposed=false;
 return {group,update(t,aspect=.6,reduced=false,hits=null){
  if(disposed)return;const route=hits?materialRouteTime(t):t,f=endingDimensionFrame(route,reduced,!!hits),transforms=endingDimensionTransforms(route,aspect,reduced,!!hits);
  group.visible=f.visibility>0;
  layers.forEach(({layer,core,halo,segments,ripple,rippleMaterial},i)=>{
   layer.matrixAutoUpdate=false;layer.matrix.copy(transforms[i]);
   const gate=f.gates[i];layer.visible=gate.visibility>0;
   const age=hits?(t-hits[i])*18:100;
   const pulse=age>=0&&age<1.2?(1-age/1.2)**2:0;
   const emphasis=.25+.75*Math.exp(-(((route-[.348,.408,.427,.450,.473,.50][i])/.026)**2));
   core.opacity=gate.visibility*(hits?(.68*emphasis+.14*pulse):.82);halo.opacity=gate.visibility*(hits?(.055*emphasis+.03*pulse):.085);
   ripple.visible=pulse>0&&!reduced;ripple.scale.setScalar(.18+Math.max(0,age)*.72);rippleMaterial.opacity=gate.visibility*pulse*.24;
   for(const {a,b,edge,glow,index} of segments){
    const draw=nextSmooth(gate.draw*1.65-index/20);const middle=a.clone().lerp(b,draw*.5),length=a.distanceTo(b)*draw;
    for(const [mesh,width] of [[edge,.16],[glow,.65]]){mesh.visible=draw>0;mesh.position.copy(middle);mesh.scale.set(width/Math.max(.1,f.scales[i]),length,width/Math.max(.1,f.scales[i]));}
   }
  });
 },dispose(){if(disposed)return;disposed=true;geometry.dispose();rippleGeometry.dispose();for(const m of materials)m.dispose();group.clear();}};
}
