import * as T from 'three';
import {pose} from './journey.js';

// Preserve Hero's exit velocity, then turn around the sculpture in one broad arc.
export const gardenShots=[
  {t:0,p:[55,98,112],target:[7,7,0]},
  {t:.12,p:[78,114,138],target:[30,-3,2]},
  {t:.28,p:[118,94,142],target:[115,-25,-8]},
  {t:.47,p:[156,32,91],target:[180,-28,-18]},
  {t:.68,p:[195,0,45],target:[260,-29,-17]},
  {t:.84,p:[245,-2,15],target:[312,-31,-22]},
  {t:1,p:[305,3,-9],target:[380,-34,-25]}
];
const start=new T.PerspectiveCamera();
const end=pose(1,start,false),near=pose(.999,new T.PerspectiveCamera(),false);
const dt=.001,scale=8/6; // Hero occupies six; world occupies eight viewport units.
const outward=new T.Vector3(...end.position).sub(new T.Vector3(...near.position)).multiplyScalar(scale/dt);
const gaze=new T.Vector3(...end.target).sub(new T.Vector3(...near.target)).multiplyScalar(scale/dt);
const point=new T.Vector3(),focus=new T.Vector3();
function tangent(i,key){
  if(i===0)return key==='p'?outward:gaze;
  const a=gardenShots[Math.max(0,i-1)],b=gardenShots[Math.min(gardenShots.length-1,i+1)];
  return new T.Vector3(...b[key]).sub(new T.Vector3(...a[key])).divideScalar(b.t-a.t);
}
function cubic(i,u,key,out){
  const a=gardenShots[i],b=gardenShots[i+1],span=b.t-a.t,s=u*u,s3=s*u;
  out.set(0,0,0)
    .addScaledVector(new T.Vector3(...a[key]),2*s3-3*s+1)
    .addScaledVector(tangent(i,key),(s3-2*s+u)*span)
    .addScaledVector(new T.Vector3(...b[key]),-2*s3+3*s)
    .addScaledVector(tangent(i+1,key),(s3-s)*span);
  return out;
}
export function gardenPose(t,camera,portrait=false){
  const u=T.MathUtils.clamp(t,0,1);
  let i=0;while(i<gardenShots.length-2&&u>gardenShots[i+1].t)i++;
  const local=(u-gardenShots[i].t)/(gardenShots[i+1].t-gardenShots[i].t);
  cubic(i,local,'p',point);cubic(i,local,'target',focus);
  camera.position.copy(point);
  if(portrait){
    camera.position.z+=22*(1-T.MathUtils.smoothstep(u,0,.35));
    camera.position.y+=5*T.MathUtils.smoothstep(u,0,.3);
  }
  camera.lookAt(focus);
  return {position:camera.position.toArray(),target:focus.toArray()};
}
