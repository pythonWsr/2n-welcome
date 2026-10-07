import * as T from 'three';
export function* petalPlacementSteps(asset,count,width,placement,height,name,embed=.05){
 const batch=new T.InstancedMesh(asset.geometry,asset.material,count),dummy=new T.Object3D(),v=new T.Vector3();batch.name=name;
 asset.geometry.computeBoundingBox();const natural=Math.max(...asset.geometry.boundingBox.getSize(v).toArray());
 const a=asset.geometry.attributes.position;
 for(let i=0;i<count;i++){
  const p=placement(i),size=width*p.scale/natural;dummy.rotation.set(p.pitch,p.yaw,p.roll,'YXZ');dummy.scale.setScalar(size);let y=-Infinity;
  for(let j=0;j<a.count;j++){v.fromBufferAttribute(a,j).applyQuaternion(dummy.quaternion).multiplyScalar(size);y=Math.max(y,height(p.x+v.x,p.z+v.z)-v.y);if(j%256===255)yield;}
  dummy.position.set(p.x,y-embed,p.z);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
 }
 batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();return batch;
}
export function finishSteps(steps){let next;do{next=steps.next();}while(!next.done);return next.value;}
export function placedPetals(...args){return finishSteps(petalPlacementSteps(...args));}
// One shared CPU queue: concurrent downloads must not multiply frame budgets.
const jobs=[];let running=false;
const nextFrame=()=>new Promise(resolve=>typeof requestAnimationFrame==='function'?requestAnimationFrame(()=>setTimeout(resolve,0)):setTimeout(resolve,0));
async function drain(){
 running=true;
 while(jobs.length){const start=performance.now();
  do{const job=jobs[0];try{const n=job.steps.next();if(n.done){jobs.shift();job.resolve(n.value);}}catch(e){jobs.shift();job.reject(e);}}while(jobs.length&&performance.now()-start<3);
  if(jobs.length)await nextFrame();
 }
 running=false;
}
export function runSteps(steps,options){
 if(options)return (async()=>{let start=performance.now();for(;;){const n=steps.next();if(n.done)return n.value;if(performance.now()-start>=options.budgetMs){await options.yield();start=performance.now();}}})();
 return new Promise((resolve,reject)=>{jobs.push({steps,resolve,reject});if(!running)void drain();});
}
export const placedPetalsAsync=(...args)=>{const options=args[7];return runSteps(petalPlacementSteps(...args.slice(0,7)),options);};
