import {worldHeight,desertSurface} from './world-surface.js';
import {restoreBakedPetals} from './placement-cache.js';
import {gardenPose} from './garden-path.js';
import {motionPath} from './motion-path.js';
import {petalPlacementSteps,finishSteps,runSteps} from './petal-placement.js';
import {desertGroundColor} from './desert-production.js';
import {loadPetalCatalog} from './petal-loader.js';
import * as T from 'three';
import {createGroundMaterial} from './ground-material.js';
const clamp=T.MathUtils.clamp;
const smooth=(v,a,b)=>T.MathUtils.smoothstep(v,a,b);
const hash=n=>{const x=Math.sin(n*127.17+14.3)*43758.5453;return x-Math.floor(x);};
export const oceanHeight=worldHeight;
export function coastalColor(x,z){
 const wave=Math.sin(z*.028)*7+Math.sin(z*.069+x*.011)*3;
 const blend=smooth(x+wave,438,625);
 const variation=Math.sin(x*.057+Math.sin(z*.035)*2.8)*Math.cos(z*.063)*.5+.5;
 const blue=new T.Color(0x478eb4).lerp(new T.Color(0x64a9c5),variation*.65);
 const color=desertGroundColor(x,z).lerp(blue,blend);
 // Ground palette sampled from supplied game screenshots, without copying the image.
 const forest=new T.Color(0x379843).lerp(new T.Color(0x3da84d),variation*.75);
 const ember=new T.Color(0x963333).lerp(new T.Color(0xa52b2b),variation*.8);
 return color.lerp(forest,smooth(x+wave,795,900)).lerp(ember,smooth(x+wave,1195,1305));
}
export const oceanColor=coastalColor;
const X0=520,X1=900,Z0=-365,Z1=330,NX=80,NZ=68;
export function oceanSurface(x,z){
 if(x<520)return desertSurface(x,z);
 const dx=(X1-X0)/NX,dz=(Z1-Z0)/NZ,ix=clamp(Math.floor((x-X0)/dx),0,NX-1),iz=clamp(Math.floor((z-Z0)/dz),0,NZ-1);
 const X=X0+ix*dx,Z=Z0+iz*dz,u=(x-X)/dx,v=(z-Z)/dz;
 return u+v<=1?(1-u-v)*oceanHeight(X,Z)+u*oceanHeight(X+dx,Z)+v*oceanHeight(X,Z+dz):
 (u+v-1)*oceanHeight(X+dx,Z+dz)+(1-v)*oceanHeight(X+dx,Z)+(1-u)*oceanHeight(X,Z+dz);
}
export function createOceanGround(){
 const geo=new T.BufferGeometry(),p=[],c=[],normals=[],idx=[];
 for(let i=0;i<=NX;i++)for(let j=0;j<=NZ;j++){
  const x=X0+i*(X1-X0)/NX,z=Z0+j*(Z1-Z0)/NZ;
  p.push(x,oceanHeight(x,z),z);const color=oceanColor(x,z);color.multiplyScalar(.015+.985*smooth(z,-350,-290)*(1-smooth(z,250,320)));c.push(color.r,color.g,color.b);const n=new T.Vector3(-(worldHeight(x+.3,z)-worldHeight(x-.3,z))/.6,1,-(worldHeight(x,z+.3)-worldHeight(x,z-.3))/.6).normalize();normals.push(n.x,n.y,n.z);
  if(i<NX&&j<NZ){const k=i*(NZ+1)+j;idx.push(k,k+1,k+NZ+1,k+1,k+NZ+2,k+NZ+1);}
 }
 geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('color',new T.Float32BufferAttribute(c,3));geo.setIndex(idx);geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
 const mesh=new T.Mesh(geo,createGroundMaterial());mesh.name='florr-ocean-ground';return mesh;
}
export const OCEAN_POPULATION={pearl:[100,140],shell:[100,140],starfish:[100,140]};
export function* oceanPetalSteps(catalog,mobile,names=Object.keys(OCEAN_POPULATION)){
 const group=new T.Group();group.name='florr-ocean-petals';const dummy=new T.Object3D(),v=new T.Vector3();
 for(const [name,counts] of Object.entries(OCEAN_POPULATION)){
  if(!names.includes(name))continue;
  const asset=catalog[name];if(!asset)throw new Error(`Missing Ocean petal ${name}`);
  asset.geometry.computeBoundingBox();const natural=Math.max(...asset.geometry.boundingBox.getSize(v).toArray());const n=counts[mobile?0:1];
  for(let zone=0;zone<3;zone++){
   const count=Math.floor((n+2-zone)/3),batch=new T.InstancedMesh(asset.geometry,asset.material,count);batch.name=`ocean-${name}-${zone}`;
   for(let i=0;i<count;i++){
    const seed=(i+1)*57+zone*347+Object.keys(OCEAN_POPULATION).indexOf(name)*173;
    const x=zone===0?470+hash(seed+1)*148:clamp(551+zone*115+(hash(seed+1)-.5)*68+(i%3)*10,524,843),z=clamp([-74,-25,29,79][i%4]+(hash(seed+2)-.5)*44,-110,120);
    const width=(name==='pearl'?3.1:name==='shell'?4.4:4.1)*(.82+hash(seed+3)*.30),size=width/natural;
    // Front normal stays readable for Shell/Pearl; full local-face rotation
    // varies their silhouettes without turning every shell onto its edge.
    dummy.rotation.set(i%6===0?-1.42:-.62+(hash(seed+4)-.5)*.44,-Math.PI/2+(hash(seed+5)-.5)*(name==='starfish'?2.8:.65),hash(seed+6)*Math.PI*2,'YXZ');dummy.scale.setScalar(size);
    // Fit the entire transformed support footprint to the actual terrain triangles.
    const a=asset.geometry.getAttribute('position');let y=-Infinity;
    for(let j=0;j<a.count;j++){v.fromBufferAttribute(a,j).applyQuaternion(dummy.quaternion).multiplyScalar(size);y=Math.max(y,oceanSurface(x+v.x,z+v.z)-v.y);if(j%256===255)yield;}
    dummy.position.set(x,y-.04,z);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
   }
   batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();group.add(batch);
  }
 }
 return group;
}
export const createOceanPetals=(...args)=>finishSteps(oceanPetalSteps(...args));
export const createOceanPetalsAsync=(catalog,mobile,names=Object.keys(OCEAN_POPULATION))=>Promise.resolve(restoreBakedPetals('ocean',mobile,catalog,names)||runSteps(oceanPetalSteps(catalog,mobile,names)));
export function loadOceanPetals(onAsset){
 return loadPetalCatalog(Object.keys(OCEAN_POPULATION).map(name=>[name,`assets/ocean-petals/${name}.glb`]),onAsset);
}
// These continue the existing Desert exit; the earlier Garden camera is unchanged.
const oceanShots=[[[305,3,-9],[380,-34,-25]],[[430,0,-7],[525,-36,-20]],[[570,-7,10],[647,-41,-10]],[[685,-6,18],[755,-42,-9]],[[786,-5,6],[845,-42,-5]]];
const exit=gardenPose(1,new T.PerspectiveCamera()),near=gardenPose(.99999,new T.PerspectiveCamera());
const incoming=Object.fromEntries([['p','position'],['target','target']].map(([k,key])=>[k,exit[key].map((v,i)=>(v-near[key][i])/.00001*6/8)]));
const baseOceanPose=motionPath(oceanShots.map(([p,target],i)=>({t:i/4,p,target})),incoming);
export function oceanPose(t,camera,portrait=false){
 const state=baseOceanPose(t,camera,portrait),u=clamp(t,0,1),envelope=smooth(u,.10,.24)*(1-smooth(u,.78,.96));
 state.position[1]+=26*Math.sin(Math.PI*u)**2*envelope;
 state.position[2]+=40*Math.sin(Math.PI*2*u)*envelope;
 state.target[2]-=16*Math.sin(Math.PI*2*u)*envelope;
 camera.position.fromArray(state.position);camera.lookAt(new T.Vector3(...state.target));return state;
}
export function* coastSandSteps(asset,mobile){
 return yield* petalPlacementSteps(asset,mobile?18:26,3.4,i=>{const s=i*71+401;return {x:448+hash(s)*70,z:[-79,-32,26,76][i%4]+(hash(s+1)-.5)*32,scale:.85+hash(s+2)*.3,pitch:-.65-hash(s+3)*.7,yaw:-Math.PI/2+(hash(s+4)-.5),roll:(hash(s+5)-.5)*.2};},oceanSurface,'coast-sand-petals',.07);
}
export const createCoastSand=(...args)=>finishSteps(coastSandSteps(...args));
export const createCoastSandAsync=(asset,mobile)=>Promise.resolve(restoreBakedPetals('coast',mobile,{sand:asset})||runSteps(coastSandSteps(asset,mobile)));
