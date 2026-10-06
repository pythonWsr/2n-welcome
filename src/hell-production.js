import * as T from 'three';
import {restoreBakedPetals} from './placement-cache.js';
import {worldHeight} from './world-surface.js';
import {jungleSurface,junglePose,createRegionGround} from './jungle-production.js';
import {petalPlacementSteps,finishSteps,runSteps} from './petal-placement.js';
import {loadPetalCatalog} from './petal-loader.js';
import {motionPath} from './motion-path.js';
const hash=n=>{const a=Math.sin(n*89.17+41.3)*43758.5453;return a-Math.floor(a);};
export const HELL_POPULATION={darkmark:[120,168],corruption:[96,132]};
export function createHellGround(){
 const ground=createRegionGround(1280,1740,'florr-hell-ground');
 // Add a closed static body below the original top. Do not touch top vertices,
 // normals, colors or the shared Garden/Ocean/Jungle ground factory.
 const top=ground.geometry.attributes.position,nz=69,nx=81,perimeter=[];
 for(let i=0;i<nx;i++)perimeter.push(i*nz);
 for(let j=1;j<nz;j++)perimeter.push((nx-1)*nz+j);
 for(let i=nx-2;i>=0;i--)perimeter.push(i*nz+nz-1);
 for(let j=nz-2;j>0;j--)perimeter.push(j);
 const pos=[],colors=[],indices=[],originalColors=ground.geometry.attributes.color;
 const bottom=Math.min(...Array.from({length:top.count},(_,i)=>top.getY(i)))-32;
 for(const i of perimeter){pos.push(top.getX(i),top.getY(i),top.getZ(i),top.getX(i),bottom,top.getZ(i));const c=new T.Color().fromBufferAttribute(originalColors,i);colors.push(c.r*.65,c.g*.65,c.b*.65,c.r*.25,c.g*.25,c.b*.25);}
 const n=perimeter.length,center=n*2;pos.push((1280+1740)/2,bottom,(-365+330)/2);colors.push(.035,.008,.01);
 for(let i=0;i<n;i++){const a=i*2,b=((i+1)%n)*2;indices.push(a,b,a+1,b,b+1,a+1,a+1,b+1,center);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const body=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));body.name='hell-static-land-body';ground.add(body);return ground;
}
export function hellSurface(x,z){
 if(x<1280)return jungleSurface(x,z);
 const dx=460/80,dz=695/68,ix=Math.max(0,Math.min(79,Math.floor((x-1280)/dx))),iz=Math.max(0,Math.min(67,Math.floor((z+365)/dz)));
 const X=1280+ix*dx,Z=-365+iz*dz,u=(x-X)/dx,v=(z-Z)/dz;
 return u+v<=1?(1-u-v)*worldHeight(X,Z)+u*worldHeight(X+dx,Z)+v*worldHeight(X,Z+dz):(u+v-1)*worldHeight(X+dx,Z+dz)+(1-v)*worldHeight(X+dx,Z)+(1-u)*worldHeight(X,Z+dz);
}
export function* hellPetalSteps(catalog,mobile,names=Object.keys(HELL_POPULATION)){
 const group=new T.Group();group.name='florr-hell-petals';
 for(const [species,counts] of Object.entries(HELL_POPULATION)){
  if(!names.includes(species)||!catalog[species])continue;
  const total=counts[mobile?0:1],speciesIndex=species==='darkmark'?0:1;
  for(let zone=0;zone<3;zone++){
   const count=Math.floor((total+2-zone)/3);
   group.add(yield* petalPlacementSteps(catalog[species],count,species==='darkmark'?3.9:3.4,i=>{
    const key=i*67+zone*337+speciesIndex*197;
    return {x:1316+zone*91+hash(key+1)*87,z:[-86,-42,5,51,94][i%5]+(hash(key+2)-.5)*38,scale:.8+hash(key+3)*.4,pitch:i%6===0?-1.42:-.60-hash(key+4)*.47,yaw:-Math.PI/2+(hash(key+5)-.5)*.8,roll:(hash(key+6)-.5)*.25};
   },hellSurface,`hell-${species}-${zone}`));
  }
  // Populate the exit corridor as well, without redistributing the established
  // forward terrain. The return initially still looks beyond the third zone.
  group.add(yield* petalPlacementSteps(catalog[species],mobile?36:48,species==='darkmark'?3.9:3.4,i=>{
   const key=i*83+speciesIndex*271;
   return {x:1580+hash(key+1)*112,z:-76+hash(key+2)*160,scale:.8+hash(key+3)*.4,pitch:-.6-hash(key+4)*.47,yaw:-Math.PI/2+(hash(key+5)-.5)*.8,roll:(hash(key+6)-.5)*.25};
  },hellSurface,`hell-${species}-exit`));
 }
 return group;
}
export const createHellPetals=(...args)=>finishSteps(hellPetalSteps(...args));
export const createHellPetalsAsync=(catalog,mobile,names=Object.keys(HELL_POPULATION))=>Promise.resolve(restoreBakedPetals('hell',mobile,catalog,names)||runSteps(hellPetalSteps(catalog,mobile,names)));
export const loadHellPetals=onAsset=>loadPetalCatalog(Object.keys(HELL_POPULATION).map(n=>[n,`assets/hell-petals/${n}.glb`]),onAsset);
const end=junglePose(1,new T.PerspectiveCamera()),near=junglePose(.99999,new T.PerspectiveCamera());
const incoming=Object.fromEntries([['p','position'],['target','target']].map(([k,key])=>[k,end[key].map((v,i)=>(v-near[key][i])/.00001)]));
export const hellPose=motionPath([{t:0,p:end.position,target:end.target},{t:.34,p:[1302,19,-30],target:[1375,-34,21]},{t:.68,p:[1431,-1,28],target:[1507,-35,-20]},{t:1,p:[1570,5,2],target:[1650,-34,-3]}],incoming);
