import {petalBreath} from './petal-breath.js';
import * as T from 'three';
import {Text} from 'troika-three-text';
import {loadPetal} from './petal-loader.js';
import {flowerPose,flowerReveal,readingPoint,readingQuaternion,lookbackPose,setReadingAspect,FLOWER_SPECS} from './lookback.js';
import {sampleCourtyard,courtyardEnvironment,chapterHandoff} from './people-courtyard.js';
const selected=FLOWER_SPECS.map(([kind,name])=>kind+':'+name);
export const flightGrowth=age=>1+.7*T.MathUtils.smoothstep(age,0,.18);
// A sync callback is not re-fired when Troika is already syncing. Listen for
// completion instead, so a timeout and retry can adopt the original work.
export function prepareWorldText(text,timeoutMs=20000){
 if(text.textRenderInfo)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timeout);text.removeEventListener('synccomplete',complete);};
  const complete=()=>{cleanup();resolve();};
  const timeout=setTimeout(()=>{cleanup();reject(new Error('同行文字准备超时'));},timeoutMs);
  text.addEventListener('synccomplete',complete);
  try{text.sync();}catch(error){cleanup();reject(error);}
 });
}
export function createCompanionship(scene){
 const group=new T.Group();group.name='companionship';
 const batches=new Map(),assets=new Map(),displayAssets=new Map(),labels=[];
 const point=new T.Vector3(),scale=new T.Vector3(),matrix=new T.Matrix4(),pivot=new T.Matrix4(),rotation=new T.Quaternion(),heading=new T.Quaternion();
 let previousRoute=null,ornamentTime=0,anchorRoute=null,previousClosure=false;
 const anchorGroups=new Map();
 const view=new T.PerspectiveCamera(48,414/896,.2,2400);
 let previous=NaN,previousPeople=NaN,prepared=false,layoutScale=1,orbitAngle=0,flightTime=0;
 const sidePoint=new T.Vector3(),sideRotation=new T.Quaternion(),sideAxis=new T.Vector3(0,0,1);
 const smooth=u=>{u=T.MathUtils.clamp(u,0,1);return u*u*u*(10+u*(-15+6*u));};
 for(const [content,size,y] of [['每个地图，',3.6,3],['都有2n的足迹',3.6,-3]]){
  const text=new Text();text.text=content;text.font=`${import.meta.env?.BASE_URL||'/'}assets/fonts/companionship-sc-semibold.woff?v=footprints-sdf256-4`;
  text.fontSize=size;text.color=0xf4f0df;text.anchorX='center';text.anchorY='middle';
  text.position.copy(readingPoint(0,y));text.quaternion.copy(readingQuaternion);
  text.material.depthWrite=false;text.material.transparent=true;text.material.toneMapped=false;
  text.sdfGlyphSize=256;text.gpuAccelerateSDF=false;text.userData.warmup=true;
  text.visible=false;labels.push(text);group.add(text);
 }
 function install(source,kind,name){
  const key=kind+':'+name,index=selected.indexOf(key);if(index<0||batches.has(key))return;
  assets.set(key,{source,kind,name});
  const geometry=source.geometry;geometry.computeBoundingBox();
  const box=geometry.boundingBox,size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
  const normal=size.y<Math.min(size.x,size.z)?new T.Vector3(0,1,0):size.x<size.z?new T.Vector3(1,0,0):new T.Vector3(0,0,1);
  const face=new T.Quaternion().setFromUnitVectors(normal,new T.Vector3(0,0,1));
  const nativeRoot=scene?.getObjectByName(kind==='garden'?'florr-petal-assembly':'florr-'+kind);
  const view=new T.PerspectiveCamera(48,414/896,.2,2400);lookbackPose(flowerReveal(index)+.015,view);view.updateMatrixWorld();
  let original=null,best=Infinity;
  nativeRoot?.updateWorldMatrix(true,true);
  nativeRoot?.traverse(batch=>{if(!batch.isInstancedMesh||batch.geometry!==geometry)return;for(let slot=0;slot<batch.count;slot++){
   const local=new T.Matrix4();batch.getMatrixAt(slot,local);const world=new T.Matrix4().multiplyMatrices(batch.matrixWorld,local),position=center.clone().applyMatrix4(world),screen=position.clone().project(view);
   const score=Math.abs(screen.x)*2+Math.abs(screen.y)+(screen.z>1||screen.z< -1?100:0);
   if(score<best){best=score;original={batch,slot,local,world,position};}
  }});
  if(!original)return; // Garden may still be detached while its ground is prepared.
  const nativeRotation=new T.Quaternion(),nativeScale=new T.Vector3();original.world.decompose(new T.Vector3(),nativeRotation,nativeScale);
  const material=source.material.clone(),mesh=new T.InstancedMesh(geometry,material,1);
  mesh.userData.assetKey=key;mesh.name='companion-'+key;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  const twist=new T.Quaternion().setFromEuler(new T.Euler((index%3-1)*.13,(index%4-1.5)*.06,(index-6)*.075));
  const finalScale=new T.Vector3().setScalar(FLOWER_SPECS[index][3]/Math.max(size.x,size.y,size.z));
  const extras=null; // Allocate the optional courtyard pool only on route entry.
  batches.set(key,{mesh,extras,index,face,twist,original,nativeRotation,nativeScale,finalScale,center,taken:false,displayOwned:false});group.add(mesh);previous=NaN;
  if(displayAssets.has(key))installDisplay(displayAssets.get(key),kind,name);
 }
 function installDisplay(source,kind,name){
  const key=kind+':'+name;if(!selected.includes(key))return;
  displayAssets.set(key,source);const batch=batches.get(key);if(!batch||batch.displayOwned)return;
  const geometry=source.geometry.clone();geometry.computeBoundingBox();
  const center=geometry.boundingBox.getCenter(new T.Vector3()),size=geometry.boundingBox.getSize(new T.Vector3()),nativeSize=batch.mesh.geometry.boundingBox.getSize(new T.Vector3());
  const ratio=Math.max(nativeSize.x,nativeSize.y,nativeSize.z)/Math.max(size.x,size.y,size.z);
  geometry.translate(-center.x,-center.y,-center.z);geometry.scale(ratio,ratio,ratio);geometry.translate(batch.center.x,batch.center.y,batch.center.z);geometry.computeBoundingBox();
  batch.mesh.material.dispose();batch.mesh.geometry=geometry;batch.mesh.material=source.material.clone();
  const dimensions=geometry.boundingBox.getSize(size),normal=dimensions.y<Math.min(dimensions.x,dimensions.z)?new T.Vector3(0,1,0):dimensions.x<dimensions.z?new T.Vector3(1,0,0):new T.Vector3(0,0,1);
  batch.face.setFromUnitVectors(normal,new T.Vector3(0,0,1));
  batch.finalScale.setScalar(FLOWER_SPECS[batch.index][3]/Math.max(dimensions.x,dimensions.y,dimensions.z));
  if(batch.extras){batch.extras.geometry=batch.mesh.geometry;batch.extras.material=batch.mesh.material;}
  batch.displayOwned=true;previous=NaN;
 }
 function update(t,dt=0,peopleT=0,route=null,closure=null){
  peopleT=route?T.MathUtils.clamp(peopleT,0,1):0;
  const step=Math.min(.05,Math.max(0,dt));ornamentTime+=step;
  let pose=null;
  if(route&&peopleT>0){
   const aspect=route.viewport?route.viewport.width/route.viewport.height:view.aspect;
   pose=sampleCourtyard(route,peopleT,aspect);
   if(anchorRoute!==route){anchorRoute=route;anchorGroups.clear();for(const p of courtyardEnvironment(route)){if(!anchorGroups.has(p.sourceIndex))anchorGroups.set(p.sourceIndex,[]);anchorGroups.get(p.sourceIndex).push(p);}}
   view.aspect=aspect;view.updateProjectionMatrix();view.position.fromArray(pose.position);view.up.fromArray(pose.up);view.lookAt(new T.Vector3(...pose.target));view.updateMatrixWorld();
   if(closure?.camera){view.position.copy(closure.camera.position);view.quaternion.copy(closure.camera.quaternion);view.updateMatrixWorld();}
  }
  if(t<=0)flightTime=0;else flightTime+=step;
  if(t<.74)orbitAngle=0;
  const orbitStep=step*.10*T.MathUtils.smoothstep(t,.74,.80);
  orbitAngle=(orbitAngle+orbitStep)%(Math.PI*2);
  if(t===previous&&peopleT===previousPeople&&route===previousRoute&&!step&&!closure&&!previousClosure)return;previous=t;previousPeople=peopleT;previousRoute=route;previousClosure=!!closure;
  for(const batch of batches.values()){
   const {mesh,index,face,twist,original,nativeRotation,nativeScale,finalScale,center}=batch;
   const phase=flowerReveal(index),taken=t>=phase;
   mesh.visible=taken;
   if(taken!==batch.taken){original.batch.setMatrixAt(original.slot,taken?matrix.makeScale(0,0,0):original.local);original.batch.instanceMatrix.needsUpdate=true;batch.taken=taken;}
   flowerPose(index,t,point,original.position,orbitAngle,flightTime);
   const orient=T.MathUtils.smoothstep(t,phase,phase+.09);
   heading.copy(readingQuaternion).multiply(twist).multiply(face);
   rotation.copy(nativeRotation).slerp(heading,orient);
   // Grow from the exact grounded size, then gently fit the reading perimeter.
   const settle=T.MathUtils.smoothstep(t,.76,.92);
   scale.copy(nativeScale).multiplyScalar(flightGrowth(t-phase)).lerp(finalScale,settle).multiplyScalar(1+(layoutScale-1)*settle);
   if(pose){
    // Retire the old ring in place, rather than leaving entry columns behind.
    const exit=1-smooth((peopleT-route.windows[0].readEnd)/Math.max(route.windows[1].readStart-route.windows[0].readEnd,1e-6));
    scale.multiplyScalar(exit);mesh.visible=taken&&exit>0;
   }
   matrix.compose(point,rotation,scale);pivot.makeTranslation(-center.x,-center.y,-center.z);matrix.multiply(pivot);mesh.setMatrixAt(0,matrix);
   mesh.instanceMatrix.needsUpdate=true;
   const anchors=anchorGroups.get(index)||[];
   if(pose&&(!batch.extras||batch.extras.instanceMatrix.count<anchors.length)){
    if(batch.extras){group.remove(batch.extras);batch.extras.dispose();}
    batch.extras=new T.InstancedMesh(mesh.geometry,mesh.material,Math.max(1,anchors.length));
    batch.extras.name='courtyard-'+selected[index];batch.extras.frustumCulled=false;
    batch.extras.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(batch.extras);
   }
   const extras=batch.extras;if(!extras)continue;
   extras.visible=!!pose;if(!pose)continue;
   const entry=smooth((peopleT-route.windows[0].readEnd)/Math.max(route.windows[1].readStart-route.windows[0].readEnd,1e-6));
   const dimensions=mesh.geometry.boundingBox.getSize(new T.Vector3()),maximum=Math.max(dimensions.x,dimensions.y,dimensions.z);
   let drawn=0;extras.userData.anchorIds=[];
   for(const p of anchors){
    point.fromArray(p.position);
    const local=sidePoint.copy(point).applyMatrix4(view.matrixWorldInverse),depth=-local.z;
    if(depth<35||depth>200)continue;
    const half=depth*Math.tan(Math.PI*24/180),x=local.x/(half*view.aspect),y=local.y/half;
    // Cull outside a generous screen envelope, never by nearest-anchor rank.
    // Visible identities cannot be evicted by another petal winning a slot.
    if(Math.abs(x)>1.5||Math.abs(y)>1.4)continue;
    const breath=petalBreath(p.id,ornamentTime,route.viewport?.height??896,p.depth);
    const extent=p.scale[0],radius=dimensions.length()/maximum*extent/2+breath.amplitude+.1;
    if(closure?.exclusionBox&&!closure.exclusionBox.isEmpty()&&closure.exclusionBox.distanceToPoint(point)<radius)continue;
    if(depth<=radius)continue;
    const rx=radius/((depth-radius)*Math.tan(Math.PI*24/180)*view.aspect),ry=radius/((depth-radius)*Math.tan(Math.PI*24/180));
    const clearance=Math.max(Math.abs(x)-rx-.76,Math.abs(y)-ry-.4);
    const amount=entry*smooth(clearance/.12)*smooth((depth-35)/15)*smooth((200-depth)/35)*smooth((1.5-Math.abs(x))/.25)*smooth((1.4-Math.abs(y))/.3);
    if(amount<=0)continue;
    rotation.fromArray(p.quaternion).multiply(sideRotation.setFromAxisAngle(sideAxis,breath.angle)).multiply(face);
    point.add(sidePoint.set(0,breath.offset,0).applyQuaternion(new T.Quaternion(...p.quaternion)));
    scale.setScalar(extent/maximum*amount);
    matrix.compose(point,rotation,scale).multiply(pivot);extras.setMatrixAt(drawn++,matrix);extras.userData.anchorIds.push(p.id);
   }
   // Only nearby drawn instances reach the GPU; backing matrices share HD assets.
   matrix.makeScale(0,0,0);for(let slot=drawn;slot<extras.instanceMatrix.count;slot++)extras.setMatrixAt(slot,matrix);
   extras.count=drawn;extras.visible=drawn>0;extras.instanceMatrix.needsUpdate=true;
  }
  const opacity=T.MathUtils.smoothstep(t,.952,.962)*chapterHandoff(route,peopleT).footprints;
  for(const label of labels){label.visible=opacity>0;label.material.opacity=opacity;}
 }
 // Capture animation data, not the compacted GPU draw list. Offscreen anchors
 // retain identity and full geometry; already drawn instances retain exact poses.
 function captureChain(camera){
  camera.updateMatrixWorld();group.updateMatrixWorld(true);
  const candidates=[];
  for(const [key,batch] of batches){
   const {mesh,extras,index,face,center}=batch,geometry=mesh.geometry;
   const maximum=Math.max(...geometry.boundingBox.getSize(new T.Vector3()).toArray());
   const rendered=new Map();for(const [slot,id] of (extras?.userData.anchorIds||[]).entries()){const m=new T.Matrix4();extras.getMatrixAt(slot,m);rendered.set(id,m.premultiply(extras.matrixWorld));}
   for(const p of anchorGroups.get(index)||[]){
    const position=new T.Vector3(...p.position),local=position.clone().applyMatrix4(camera.matrixWorldInverse),depth=-local.z;
    const screen=position.clone().project(camera);
    if(depth<35||depth>200||Math.abs(screen.y)<.35||Math.abs(screen.y)>1.4||screen.x>1.5)continue;
    const breath=petalBreath(p.id,ornamentTime,anchorRoute?.viewport?.height??896,p.depth);
    position.add(new T.Vector3(0,breath.offset,0).applyQuaternion(new T.Quaternion(...p.quaternion)));
    const quaternion=new T.Quaternion(...p.quaternion).multiply(new T.Quaternion().setFromAxisAngle(sideAxis,breath.angle)).multiply(face);
    const worldMatrix=rendered.get(p.id)||new T.Matrix4().compose(position,quaternion,new T.Vector3().setScalar(p.scale[0]/maximum)).multiply(new T.Matrix4().makeTranslation(-center.x,-center.y,-center.z)).premultiply(group.matrixWorld);
    candidates.push({id:p.id,key,branch:screen.y>0?0:1,order:screen.x,worldMatrix,geometry,material:mesh.material});
   }
  }
  // Existing neighboring tails only: no interpolation, duplication or padding.
  const limit=(anchorRoute?.viewport?.width??414)<700?28:42;
  group.userData.departureAnchors=[0,1].flatMap(branch=>candidates.filter(p=>p.branch===branch).sort((a,b)=>b.order-a.order).slice(0,limit).reverse());
  return group.userData.departureAnchors;
 }
 return {get displayPrepared(){return displayAssets.size;},group,install,installDisplay,update,captureChain,resize(aspect){layoutScale=setReadingAspect(aspect);for(const label of labels)label.scale.setScalar(layoutScale);previous=NaN;},capture(){for(const asset of assets.values())install(asset.source,asset.kind,asset.name);if(batches.size!==14)throw new Error('起飞花瓣尚未准备完整');},get ready(){return prepared&&batches.size===14;},async prepare(onPrepared=()=>{},onDisplay=()=>{}){
  if(prepared)return;
  await Promise.all([...labels.map(text=>prepareWorldText(text)),...FLOWER_SPECS.map(async([kind,name])=>{const source=await loadPetal(`${import.meta.env?.BASE_URL||'/'}assets/companion-display/${name}.glb`,100);onPrepared(source);installDisplay(source,kind,name);onDisplay(source,kind,name);})]);prepared=true;
 },dispose(){for(const {mesh,extras,displayOwned} of batches.values()){mesh.material.dispose();if(displayOwned)mesh.geometry.dispose();mesh.dispose();extras?.dispose();}for(const label of labels)label.dispose();}};
}
