import * as T from 'three';
import {sampleNext,nextSmooth} from './guild-next-route.js';
const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const identity=a=>a.id??`${a.branch}:${a.u}:${a.longitude}`;
function orbitSlot(a,index=0,count=56){
 const seed=hash(identity(a)),layer=index<Math.min(10,Math.ceil(count*.18))?0:index<Math.min(26,Math.ceil(count*.47))?1:2;
 return {seed,depth:[136,218,354][layer]+(seed%19)-9,phase:(seed%6283)/1000,speed:.12+(seed%13)*.006,amplitude:1.1+(seed%11)*.08};
}
// Pack projected silhouettes once per viewport, while retaining actual world depth.
export function nextArcFrame(expandedPose,{aspect=.6,fov=48,anchors=[]}={}){
 const pose=nextCamera(expandedPose,1),camera=new T.PerspectiveCamera(fov,aspect);
 camera.position.fromArray(pose.position);camera.lookAt(...pose.target);camera.updateMatrixWorld();
 const halfAngle=Math.tan(T.MathUtils.degToRad(fov/2)),slots=new Map(),placed=[];
 const ordered=[...anchors].sort((a,b)=>hash(identity(a))-hash(identity(b))||identity(a).localeCompare(identity(b)));
 for(const [index,a] of ordered.entries()){
  const slot=orbitSlot(a,index,ordered.length);let best=null,bestScore=-Infinity;
  for(let trial=0;trial<512;trial++){
   const v=(slot.seed*.000013+trial*.61803398875)%1,angle=(v-.5)*3.35;
   const width=((slot.seed+trial*137)%997)/997-.5,vertical=((slot.seed+trial*283)%991)/991-.5;
   const y=.72*Math.sin(angle)+vertical*.22;
   const x=.28+.43*Math.cos(angle)+width*.44+y*.10;
   if(x<.07||x>.93||Math.abs(y)>.86)continue;
   const radius=4.8/(slot.depth*halfAngle);
   const score=placed.length?Math.min(...placed.map(p=>Math.hypot((x-p.x)*aspect,y-p.y)/(radius+p.radius))):2;
   if(score>bestScore){bestScore=score;best={x,y,radius};}
  }
  const chosen=best||{x:.6,y:0,radius:4.8/(slot.depth*halfAngle)};
  placed.push(chosen);slot.position=[chosen.x*slot.depth*halfAngle*aspect,chosen.y*slot.depth*halfAngle,-slot.depth];slots.set(identity(a),slot);
 }
 return {matrix:camera.matrixWorld.clone(),halfAngle,aspect,slots};
}
const defaultFrame=nextArcFrame({position:[-4,7,198],target:[0,0,-14]});
export function nextPoint(anchor,expandedPoint,nextT,frame=defaultFrame,{time=0,reducedMotion=false}={}){
 const {opening,nextT:progress}=sampleNext(nextT);if(!opening)return [...expandedPoint];
 let slot=frame.slots?.get(identity(anchor));
 if(!slot){slot=orbitSlot(anchor,Math.floor(anchor.u*55));const angle=anchor.latitude*1.9,half=slot.depth*frame.halfAngle;
  slot.position=[(.22+.66*Math.cos(angle)+.025*Math.sin(anchor.longitude))*half*frame.aspect,(.72*Math.sin(angle)+.10*Math.cos(angle))*half,-slot.depth];}
 const point=new T.Vector3(...slot.position),phase=(Number.isFinite(time)?time:0)*slot.speed+slot.phase;
 if(!reducedMotion){const r=slot.amplitude;point.x+=r*Math.cos(phase);point.y+=r*.72*Math.sin(phase+.6);point.z+=(3.5+r)*Math.sin(phase+1.3);}
 // Preserve the third act's independent breathing through a C2-continuous handoff.
 point.y+=expandedPoint[1]-anchor.latitude*90.3;
 const destination=point.applyMatrix4(frame.matrix).toArray();
 const delay=frame.slots?.size?(slot.seed%7)*.1:0;
 const blend=nextSmooth((progress*16-3-delay)/(7-delay));
 return expandedPoint.map((v,i)=>v+(destination[i]-v)*blend);
}
export function nextCamera(expandedPose,nextT){
 const {opening}=sampleNext(nextT);
 return {position:expandedPose.position.map((v,i)=>v+[8,-3,-58][i]*opening),target:expandedPose.target.map((v,i)=>v+[0,0,-36][i]*opening)};
}
