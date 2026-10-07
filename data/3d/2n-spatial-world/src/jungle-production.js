import * as T from 'three';
import {restoreBakedPetals} from './placement-cache.js';
import {createGroundMaterial} from './ground-material.js';
import {worldHeight} from './world-surface.js';
import {coastalColor,oceanPose} from './ocean-production.js';
import {loadPetalCatalog} from './petal-loader.js';
import {motionPath} from './motion-path.js';
import {petalPlacementSteps,finishSteps,runSteps} from './petal-placement.js';
const X0=900,X1=1280,Z0=-365,Z1=330,NX=80,NZ=68;
const hash=n=>{const v=Math.sin(n*117.31+7.2)*43758.5453;return v-Math.floor(v);};
export function jungleSurface(x,z){
 if(x<900){const dx=380/80,dz=695/68,ix=Math.max(0,Math.min(79,Math.floor((x-520)/dx))),iz=Math.max(0,Math.min(67,Math.floor((z+365)/dz)));return triangle(520+ix*dx,-365+iz*dz,dx,dz,x,z);}
 const dx=(X1-X0)/NX,dz=(Z1-Z0)/NZ,ix=Math.max(0,Math.min(NX-1,Math.floor((x-X0)/dx))),iz=Math.max(0,Math.min(NZ-1,Math.floor((z-Z0)/dz)));return triangle(X0+ix*dx,Z0+iz*dz,dx,dz,x,z);
}
function triangle(X,Z,dx,dz,x,z){const u=(x-X)/dx,v=(z-Z)/dz;return u+v<=1?(1-u-v)*worldHeight(X,Z)+u*worldHeight(X+dx,Z)+v*worldHeight(X,Z+dz):(u+v-1)*worldHeight(X+dx,Z+dz)+(1-v)*worldHeight(X+dx,Z)+(1-u)*worldHeight(X,Z+dz);}
export const createJungleGround=()=>createRegionGround(900,1280,'florr-jungle-ground');
export function createRegionGround(X0,X1,name){
 const geometry=new T.BufferGeometry(),positions=[],colors=[],normals=[],indices=[];
 for(let i=0;i<=NX;i++)for(let j=0;j<=NZ;j++){
  const x=X0+i*(X1-X0)/NX,z=Z0+j*(Z1-Z0)/NZ;positions.push(x,worldHeight(x,z),z);
  const rim=T.MathUtils.smoothstep(z,-350,-290)*(1-T.MathUtils.smoothstep(z,250,320));const c=coastalColor(x,z).multiplyScalar(.015+.985*rim);colors.push(c.r,c.g,c.b);
  const n=new T.Vector3(-(worldHeight(x+.3,z)-worldHeight(x-.3,z))/.6,1,-(worldHeight(x,z+.3)-worldHeight(x,z-.3))/.6).normalize();normals.push(n.x,n.y,n.z);
  if(i<NX&&j<NZ){const k=i*(NZ+1)+j;indices.push(k,k+1,k+NZ+1,k+1,k+NZ+2,k+NZ+1);}
 }
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setIndex(indices);
 const mesh=new T.Mesh(geometry,createGroundMaterial());mesh.name=name;return mesh;
}
export const JUNGLE_POPULATION={peas:[78,108],tomato:[64,88],bur:[56,78],goldenleaf:[12,16],rock:[12,16],compass:[42,60]};
export function* junglePetalSteps(catalog,mobile,names=Object.keys(JUNGLE_POPULATION)){
 const group=new T.Group();group.name='florr-jungle-petals';
 for(const [species,counts] of Object.entries(JUNGLE_POPULATION)){
  if(!names.includes(species)||!catalog[species])continue;const index=Object.keys(JUNGLE_POPULATION).indexOf(species),total=counts[mobile?0:1];
  for(let zone=0;zone<3;zone++){const n=Math.floor((total+2-zone)/3);group.add(yield* petalPlacementSteps(catalog[species],n,species==='tomato'?3.1:species==='bur'?3.3:species==='goldenleaf'?2.7:species==='rock'?3.1:species==='compass'?3.6:4.0,i=>{
   // Overlapping scatter ranges cover the camera's entire middle journey.
   // Retain the early entry population so Jungle is readable from Ocean.
   const key=i*67+zone*317+index*191;return {x:zone===0?828+hash(key+1)*100:zone===1?922+hash(key+1)*170:1045+hash(key+1)*178,z:[-88,-43,9,53,93][i%5]+(hash(key+2)-.5)*40,scale:.8+hash(key+3)*.4,pitch:i%5===0?-1.4:-.55-hash(key+4)*.5,yaw:-Math.PI/2+(hash(key+5)-.5)*1.0,roll:(hash(key+6)-.5)*.28};
  },jungleSurface,`jungle-${species}-${zone}`));}
 }
 return group;
}
export const createJunglePetals=(...args)=>finishSteps(junglePetalSteps(...args));
export const createJunglePetalsAsync=(catalog,mobile,names=Object.keys(JUNGLE_POPULATION))=>Promise.resolve(restoreBakedPetals('jungle',mobile,catalog,names)||runSteps(junglePetalSteps(catalog,mobile,names)));
export const loadJunglePetals=onAsset=>loadPetalCatalog(Object.keys(JUNGLE_POPULATION).map(n=>[n,n==='compass'?'assets/jungle-petals/compass.glb':`assets/${['goldenleaf','rock'].includes(n)?'garden':'jungle'}-petals/${n}.glb`]),onAsset);
const end=oceanPose(1,new T.PerspectiveCamera()),near=oceanPose(.99999,new T.PerspectiveCamera());
const incoming=Object.fromEntries([['p','position'],['target','target']].map(([k,key])=>[k,end[key].map((v,i)=>(v-near[key][i])/.00001*4/6)]));
export const junglePose=motionPath([{t:0,p:end.position,target:end.target},{t:.34,p:[916,16,32],target:[981,-35,-18]},{t:.67,p:[1040,-2,-28],target:[1114,-34,20]},{t:1,p:[1165,5,-2],target:[1227,-34,6]}],incoming);
