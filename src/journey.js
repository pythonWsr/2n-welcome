import * as T from 'three';
export const shots = [
  {t:0, p:[-8,-22,380], target:[0,5,0]},
  {t:.20,p:[-5,-26,130],target:[0,8,0]},
  {t:.34,p:[-14,-32,47],target:[-2,10,0]},
  {t:.46,p:[-23,-35,18],target:[-6,14,0]},
  {t:.60,p:[-14,0,14],target:[-4,23,0]},
  {t:.73,p:[10,29,17],target:[16,35,0]},
  {t:.84,p:[39,56,24],target:[22,22,0]},
  {t:1,p:[55,98,112],target:[7,7,0]}
];
const positions = shots.map(s=>new T.Vector3(...s.p));
const targets = shots.map(s=>new T.Vector3(...s.target));
const path = new T.CatmullRomCurve3(positions,false,'centripetal');
const look = new T.CatmullRomCurve3(targets,false,'centripetal');
const tmp = new T.Vector3();
export function pose(progress, camera, portrait = false) {
  const t = T.MathUtils.clamp(progress,0,1);
  let i=0; while(i<shots.length-2 && t>shots[i+1].t)i++;
  const local=(t-shots[i].t)/(shots[i+1].t-shots[i].t);
  const u=(i+local)/(shots.length-1);
  path.getPoint(u,camera.position); look.getPoint(u,tmp);
  // Same journey on phones, with additional breathing room near the sculpture.
  if(portrait) camera.position.z += 22 * Math.sin(Math.min(1,t/.34)*Math.PI/2);
  camera.lookAt(tmp);
  return {position:camera.position.toArray(),target:tmp.toArray()};
}
