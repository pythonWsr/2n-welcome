import * as T from 'three';

/** Shares the opening sculpture's solids, but never its animation or lighting. */
export function createClosureView({monument}){
 const group=monument.clone(true);group.name='guild-closure-mark';group.visible=false;
 const materials=new Map();
 group.traverse(mesh=>{if(!mesh.isMesh)return;const clone=m=>{if(!materials.has(m)){const own=m.clone();own.transparent=true;own.depthWrite=false;materials.set(m,own);}return materials.get(m);};mesh.material=Array.isArray(mesh.material)?mesh.material.map(clone):clone(mesh.material);});
 const local=new T.Box3().setFromObject(group),size=local.getSize(new T.Vector3()),center=local.getCenter(new T.Vector3());
 const forward=new T.Vector3(),quaternion=new T.Quaternion(),point=new T.Vector3(),unit=new T.Vector3(1,1,1);
 const bounds=new T.Box3(),marginBounds=new T.Box3();let disposed=false;
 return {group,bounds:marginBounds,update(state,entry,camera,viewport){
  if(disposed)return;
  group.visible=state.monumentOpacity>0&&!local.isEmpty();if(!group.visible){marginBounds.makeEmpty();return;}
  materials.forEach(m=>{m.opacity=state.monumentOpacity;});
  forward.fromArray(entry.position).sub(new T.Vector3(...entry.target));
  quaternion.setFromRotationMatrix(new T.Matrix4().lookAt(forward,new T.Vector3(),new T.Vector3(...entry.up)));
  const distance=camera.position.distanceTo(new T.Vector3(...entry.target)),half=distance*Math.tan(T.MathUtils.degToRad(camera.fov/2));
  const width=half*2*camera.aspect*.30,height=half*2*.27;
  // Conservative depth margin protects the full solid, not only its front face.
  const scale=Math.min(width/Math.max(size.x,1),height/Math.max(size.y,1))*.88;
  group.quaternion.copy(quaternion);group.scale.setScalar(scale);
  point.copy(center).multiplyScalar(scale).applyQuaternion(quaternion);
  group.position.fromArray(entry.target).sub(point);group.updateMatrixWorld(true);
  bounds.copy(local).applyMatrix4(new T.Matrix4().compose(group.position,quaternion,unit.clone().multiplyScalar(scale)));
  marginBounds.copy(bounds).expandByVector(bounds.getSize(point).multiplyScalar(.075));
 },dispose(){if(disposed)return;disposed=true;materials.forEach(m=>m.dispose());group.removeFromParent();}};
}
