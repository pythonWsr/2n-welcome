import * as T from 'three';
import {motionPath} from './motion-path.js';
const smooth=v=>{const u=T.MathUtils.clamp(v,0,1);return u*u*u*(10+u*(-15+6*u));};
export function memoryEntryProgress(t){return smooth(t*36/7);}
// A stationary story space beyond the final map. Never parent it to the camera.
export function memoryEntryFrame(entry){
 const frame=new T.Matrix4();if(!entry)return frame;
 const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-Math.PI/2);
 const arrival=new T.Vector3(...entry.position).add(new T.Vector3(340,160,180));
 const origin=arrival.sub(new T.Vector3(0,3,190).applyQuaternion(rotation));
 return frame.compose(origin,rotation,new T.Vector3(1,1,1));
}
export function applyMemoryEntry(camera,group,entry,u){
 group.matrixAutoUpdate=false;group.matrix.copy(memoryEntryFrame(entry));group.updateMatrixWorld(true);
 if(!entry)return;
 const destination=camera.position.clone().applyMatrix4(group.matrix);
 // The same position-and-focus Hermite mechanism as the five-biome glide.
 // Initial motion stays over terrain; gaze lifts only after passing its edge.
 const start=new T.Vector3(...entry.position),focus=new T.Vector3(...entry.target);
 const finalFocus=new T.Vector3(0,0,-14).applyMatrix4(group.matrix);
 const shots=[
  {t:0,p:start.toArray(),target:focus.toArray()},
  {t:.30,p:start.clone().add(new T.Vector3(100,4,-42)).toArray(),target:focus.clone().add(new T.Vector3(115,-30,-48)).toArray()},
  {t:.58,p:start.clone().add(new T.Vector3(205,42,-18)).toArray(),target:focus.clone().add(new T.Vector3(260,20,-28)).toArray()},
  {t:.82,p:destination.clone().add(new T.Vector3(-60,-46,-28)).toArray(),target:finalFocus.clone().add(new T.Vector3(-80,-40,-20)).toArray()},
  {t:1,p:destination.toArray(),target:finalFocus.toArray()}
 ];
 // Ease the final knot into the stationary reading shot as well as the first.
 motionPath(shots,{p:[0,0,0],target:[0,0,0]}, {p:[0,0,0],target:[0,0,0]})(T.MathUtils.clamp(u,0,1),camera,false);
 if(u>=1){camera.position.copy(destination);camera.lookAt(finalFocus);}
 camera.updateMatrixWorld();
}
