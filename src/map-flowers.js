import * as T from 'three';
import {loadModelScene} from './petal-loader.js';
import {renderedGroundHeight} from './biomes.js';
import {desertSurface} from './world-surface.js';
import {oceanSurface} from './ocean-production.js';
import {jungleSurface} from './jungle-production.js';
import {hellSurface} from './hell-production.js';

export const FLOWER_PLACEMENTS=[
 ['01','garden',180,-18,8],['07','garden',265,-17,10],
 ['02','desert',350,-25,8],['05','desert',435,-10,8],
 ['03','ocean',690,-10,8],['04','jungle',1100,20,8],
 ...[1345,1410,1480,1560,1630].map((x,i)=>['06','hell',x,i%2?24:-18,9])
];
const surfaces={garden:renderedGroundHeight,desert:desertSurface,ocean:oceanSurface,jungle:jungleSurface,hell:hellSurface};
// Contact probes only: original render geometry, UVs and materials are untouched.
function contactPoints(model){
 const points=[];model.updateMatrixWorld(true);
 model.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position;
  const extrema=[0,0,0,0,0,0],bounds=[Infinity,-Infinity,Infinity,-Infinity,Infinity,-Infinity];
  for(let i=0;i<p.count;i++)for(let axis=0;axis<3;axis++){const v=p.getComponent(i,axis);if(v<bounds[axis*2]){bounds[axis*2]=v;extrema[axis*2]=i;}if(v>bounds[axis*2+1]){bounds[axis*2+1]=v;extrema[axis*2+1]=i;}}
  const indices=new Set(extrema);for(let i=0;i<p.count;i+=Math.ceil(p.count/512))indices.add(i);
  for(const i of indices)points.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));
 });return points;
}
export function createMapFlowers(){
 const group=new T.Group();group.name='map-flowers';const installed=new Set(),contacts=new Map(),target=new T.Object3D(),point=new T.Vector3();let prepared=0;
 function ground(root){let y=-Infinity;for(const p of contacts.get(root)){point.copy(p).applyQuaternion(root.quaternion);y=Math.max(y,surfaces[root.userData.region](root.position.x+point.x,root.position.z+point.z)-point.y);}root.position.y=Number.isFinite(y)?y:surfaces[root.userData.region](root.position.x,root.position.z);}
 function install(id,source){
  if(installed.has(id))return;installed.add(id);prepared++;
  for(const [kind,region,x,z,width] of FLOWER_PLACEMENTS){if(kind!==id)continue;
   const root=new T.Group(),model=source.clone(true),box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=width/size.x;
   model.scale.multiplyScalar(scale);model.position.addScaledVector(center,-scale);
   model.traverse(mesh=>{if(mesh.isMesh)mesh.userData.warmup=true;});
   root.name=`flower-${id}-${x}`;root.userData={id,region,width,facingReady:false};root.position.set(x,surfaces[region](x,z)+width/2,z);
   contacts.set(root,contactPoints(model));root.add(model);ground(root);group.add(root);
  }
 }
 function update(camera,dt){for(const root of group.children){
  if(dt>0&&root.userData.facingReady&&root.position.distanceToSquared(camera.position)>300*300)continue;
  const snap=!root.userData.facingReady||dt===0;
  // +Z is the inspected expression front for all seven original GLBs.
  for(let i=0;i<(snap?2:1);i++){target.position.copy(root.position);target.lookAt(camera.position);
   if(!snap&&root.quaternion.angleTo(target.quaternion)<.001)continue;
   if(snap)root.quaternion.copy(target.quaternion);else root.quaternion.slerp(target.quaternion,1-Math.exp(-5*dt));ground(root);
  }root.userData.facingReady=true;
 }}
 async function prepare(onPrepared=()=>{}){await Promise.all(['01','02','03','04','05','06','07'].map(async id=>{
  if(installed.has(id))return;const model=await loadModelScene(`assets/map-flowers/${id}.glb`,150);
  model.traverse(mesh=>{if(mesh.isMesh)onPrepared(mesh);});install(id,model);
 }));}
 return {group,install,update,prepare,get ready(){return installed.size===7;},get prepared(){return prepared;}};
}
