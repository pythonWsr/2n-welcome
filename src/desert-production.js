import {loadPetalCatalog} from './petal-loader.js';
import * as T from 'three';
import {finishSteps,runSteps} from './petal-placement.js';
import {restoreBakedPetals} from './placement-cache.js';

// Broken color blocks follow world coordinates, so terrain spans stay seamless.
const hash=(x,z)=>{
  const n=Math.sin(x*127.1+z*311.7)*43758.5453;
  return n-Math.floor(n);
};
const smooth=t=>t*t*(3-2*t);
function field(x,z,scale){
  const u=x/scale,v=z/scale,i=Math.floor(u),j=Math.floor(v);
  const a=smooth(u-i),b=smooth(v-j);
  return T.MathUtils.lerp(
    T.MathUtils.lerp(hash(i,j),hash(i+1,j),a),
    T.MathUtils.lerp(hash(i,j+1),hash(i+1,j+1),a),b
  );
}

export function desertGroundColor(x,z){
  const bend=(field(x+94,z-37,59)-.5)*26;
  const broad=field(x+bend,z-bend*.6,53);
  const patch=field(x-bend*.4,z+bend,23);
  const grain=field(x+13,z-27,9);
  const t=Math.max(0,Math.min(1,(broad*.73+patch*.27-.37)*3.9));
  const color=new T.Color(0xe0d1af).lerp(new T.Color(0xecdcb8),smooth(t)*.75);
  color.offsetHSL(0,0,(grain-.5)*.07+(patch-.5)*.035);
  return color;
}

const POPULATION={
  cactus:[68,94],sand:[68,94],stick:[27,40],
  pincer:[26,38],iris:[23,28],goldenleaf:[4,6]
};
const X_CLEARINGS=[[326,343,354],[370,383,396],[413,427,437]];
const Z_CLEARINGS=[-116,-76,-35,8,52,97,130];
const scatter=(n)=>{const v=Math.sin(n*91.17+5.4)*43758.5453;return v-Math.floor(v);};
function* surfaceContact(height,x,z,geometry,quaternion,size){
 const positions=geometry.getAttribute('position');let support=-Infinity;
 // Local scratch vector: generator jobs can interleave safely.
 const contactPoint=new T.Vector3();
 for(let i=0;i<positions.count;i++){contactPoint.fromBufferAttribute(positions,i).applyQuaternion(quaternion).multiplyScalar(size);support=Math.max(support,height(x+contactPoint.x,z+contactPoint.z)-contactPoint.y);if(i%256===255)yield;}
 return support-.07;
}

export function* desertPetalSteps(height,mobile,catalog,names=Object.keys(POPULATION)){
  // The heightfield stays continuous. These are user-provided petal models,
  // batched by species; never replace them with procedural stand-ins.
  const group=new T.Group();group.name='florr-desert';
  if(!catalog)return group;
  for(const [species,[phoneCount,desktopCount]] of Object.entries(POPULATION)){
    if(!names.includes(species))continue;
    const name=species,count=mobile?phoneCount:desktopCount;
    const asset=catalog[name];
    if(!asset){if(name==='goldenleaf'||name==='iris'||name==='stick'||name==='pincer')continue;
      throw new Error(`Missing Desert petal ${name}`);}
    if(!asset.geometry||!asset.material)throw new Error(`Invalid Desert petal ${name}`);
    asset.geometry.computeBoundingBox();
    const natural=Math.max(...asset.geometry.boundingBox.getSize(new T.Vector3()).toArray());
    if(natural<=0)throw new Error(`Empty Desert petal ${name}`);
    const family=new T.Group();family.name=`desert-${name}-petal`;
    const sectors=name==='goldenleaf'?1:3;
    const dummy=new T.Object3D();
    for(let sector=0;sector<sectors;sector++){
      const instances=Math.floor((count+2-sector)/3);
      for(let band=0;band<(name==='goldenleaf'?1:3);band++){
      const selected=name==='goldenleaf'?Array.from({length:count},(_,i)=>i):
        Array.from({length:instances},(_,i)=>i).filter(i=>Math.min(2,Math.floor((Math.floor(i/3)%7)/2))===band);
      if(!selected.length)continue;
      const batch=new T.InstancedMesh(asset.geometry,asset.material.clone(),selected.length);
      batch.name=`${family.name}-sector-${sector}-${band}`;
      for(let slot=0;slot<selected.length;slot++){
        const i=selected[slot];
        const key=(i+1)*43+Object.keys(POPULATION).indexOf(name)*139+sector*219;
        const x=name==='goldenleaf'?[320,326,332,339,325,340][i]+scatter(key)*2:
          T.MathUtils.clamp(X_CLEARINGS[sector][i%3]+(scatter(key+1)-.5)*15,310,446);
        const z=name==='goldenleaf'?[-45,-40,-34,-26,-53,-25][i]:
          T.MathUtils.clamp(Z_CLEARINGS[Math.floor(i/3)%7]+(scatter(key+2)-.5)*31,-147,145);
        const width=name==='iris'?1.9:name==='goldenleaf'?2.85:
          (name==='cactus'||name==='sand'?3.8:3.0);
        const size=width*(.88+scatter(key+3)*.22)/natural;
        if(name==='iris'){
          // The pale-pink face of the supplied GLB points along local -Z.
          dummy.rotation.set(.67+(scatter(key+4)-.5)*.12,Math.PI/2+(scatter(key+5)-.5)*.30,(scatter(key+6)-.5)*.13,'YXZ');
        }else{
          const pitch=i%5===0?-.40:i%5===1?-1.53:-1.10+(scatter(key+4)-.5)*.38;
          dummy.rotation.set(pitch,-Math.PI/2+(scatter(key+5)-.5)*1.7,(scatter(key+6)-.5)*.23,'YXZ');
        }
        dummy.position.set(x,yield* surfaceContact(height,x,z,asset.geometry,dummy.quaternion,size),z);
        dummy.scale.setScalar(size);
        dummy.updateMatrix();batch.setMatrixAt(slot,dummy.matrix);
      }
      batch.instanceMatrix.needsUpdate=true;
      batch.computeBoundingSphere();family.add(batch);
      }
    }
    group.add(family);
  }
  return group;
}
export const createDesertProduction=(...args)=>finishSteps(desertPetalSteps(...args));
export const createDesertProductionAsync=(height,mobile,catalog,names=Object.keys(POPULATION))=>Promise.resolve(restoreBakedPetals('desert',mobile,catalog,names,height.placementKey||height.toString())||runSteps(desertPetalSteps(height,mobile,catalog,names)));

export function loadDesertPetals(onAsset){
 return loadPetalCatalog(['cactus','sand','stick','pincer','iris','goldenleaf'].map(name=>[name,`assets/${name==='goldenleaf'?'garden-petals':'desert-petals'}/${name}.glb`]),onAsset);
}
