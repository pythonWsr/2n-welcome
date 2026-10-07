import * as T from 'three';
import {worldHeight} from './world-surface.js';
import {gardenPose} from './garden-path.js';
import {oceanPose} from './ocean-production.js';
import {junglePose} from './jungle-production.js';
import {hellPose} from './hell-production.js';
const places=[['Garden',133,-12,88,182],['Desert',352,-18,295,424],['Ocean',586,-12,475,707],['Jungle',975,-10,845,1092],['Hell',1400,-12,1245,1540]];
// Entry poses selected from the actual camera paths, not arbitrary map centres.
const entryShots=[[gardenPose,.38,110],[gardenPose,.96,70],[oceanPose,.56,110],[junglePose,.13,70],[hellPose,.13,70]];
function textTexture(name){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='500 144px Georgia, serif';canvas.width=Math.ceil(ctx.measureText(name).width)+64;canvas.height=192;
 ctx.font='500 144px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#faf5e9';ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=9;ctx.shadowOffsetY=3;ctx.fillText(name,canvas.width/2,96);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}
export function createRegionNames(textureFactory=textTexture){
 const group=new T.Group();group.name='world-region-names';
 for(const [name,x,z] of places){const label=new T.Sprite(new T.SpriteMaterial({map:textureFactory(name),transparent:true,depthTest:true,depthWrite:false,toneMapped:false,fog:false}));label.name=`region-name-${name.toLowerCase()}`;label.position.set(x,worldHeight(x,z)+17,z);label.scale.set(25,6.25,1);label.visible=false;group.add(label);}
 let configuredAspect=0;
 function configure(camera){
  configuredAspect=camera.aspect;
  for(let i=0;i<places.length;i++){
   const ref=new T.PerspectiveCamera(camera.fov,camera.aspect,.2,2400),[path,t,depth]=entryShots[i],label=group.children[i];path(t,ref,camera.aspect<1);ref.updateMatrixWorld();
   const ray=new T.Vector3(0,.10,.5).unproject(ref).sub(ref.position).normalize(),forward=ref.getWorldDirection(new T.Vector3());
   label.position.copy(ref.position).addScaledVector(ray,depth/ray.dot(forward));
   const width=2*depth*Math.tan(T.MathUtils.degToRad(camera.fov/2))*Math.min(camera.aspect,1.3)*.58;
   const image=label.material.map.image;label.scale.set(width,width*(image?image.height/image.width:.32),1);
   label.position.y=Math.max(label.position.y,worldHeight(label.position.x,label.position.z)+label.scale.y/2+6);
   label.userData.entryX=ref.position.x;
   // Ocean is introduced after the coastal palette has become blue, including
   // the foreground. Keep the fixed world anchor and its usual safe-area fade.
   label.userData.minimumX=i===2?560:-Infinity;
  }
 }
 return {group,update(input){
  if(typeof input==='number'){for(let i=0;i<places.length;i++){const [,,,start,end]=places[i],label=group.children[i];label.visible=input>start&&input<end;label.material.opacity=T.MathUtils.smoothstep(input,start,start+12)*(1-T.MathUtils.smoothstep(input,end-22,end));}return;}
  const camera=input;if(camera.aspect!==configuredAspect)configure(camera);camera.updateMatrixWorld();
  for(const label of group.children){
   const p=label.position.clone().project(camera),depth=-label.position.clone().applyMatrix4(camera.matrixWorldInverse).z,tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));
   const halfY=label.scale.y/(2*depth*tan),halfX=label.scale.x/(2*depth*tan*camera.aspect);
   const margin=Math.min(.90-Math.abs(p.x)-halfX,.80-Math.abs(p.y)-halfY);
   const x=camera.position.x,start=label.userData.entryX-60,end=label.userData.entryX+120;
   label.material.opacity=T.MathUtils.smoothstep(margin,0,.13)*T.MathUtils.smoothstep(x,Math.max(start,label.userData.minimumX),Math.max(start,label.userData.minimumX)+12)*(1-T.MathUtils.smoothstep(x,end-22,end));
   label.visible=depth>0&&p.z>-1&&p.z<1&&label.material.opacity>.001;
  }
 }};
}
