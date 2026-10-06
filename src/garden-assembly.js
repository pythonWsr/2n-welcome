import {loadPetalCatalog} from './petal-loader.js';
import * as T from 'three';

export const PETAL_NAMES=['glass','leaf','rose','clover','rock','goldenleaf'];
// Hand-placed clearings beside the camera route. Every clearing contains all
// six species; the center stays clear for the existing Hero → Garden camera.
const clearings=[
  {x:130,z:-35,sector:0,size:1.02},
  {x:145,z:54,sector:0,size:1.04},
  {x:159,z:-67,sector:0,size:.94},
  {x:117,z:28,sector:0,size:.78},
  {x:171,z:93,sector:0,size:.80},
  {x:188,z:-45,sector:1,size:1.03},
  {x:208,z:35,sector:1,size:1.08},
  {x:223,z:-66,sector:1,size:.99},
  {x:179,z:23,sector:1,size:.87},
  {x:199,z:95,sector:1,size:.77},
  {x:226,z:-17,sector:1,size:.91},
  {x:238,z:74,sector:1,size:.80},
  {x:260,z:-25,sector:2,size:.89},
  {x:284,z:-25,sector:2,size:.90},
  {x:277,z:-55,sector:2,size:.72},
  {x:253,z:92,sector:2,size:.72},
  // Additional small groups fill the foreground/middle frame of the phone
  // journey while preserving the six-asset scale and its open travel line.
  {x:158,z:16,sector:0,size:.91,mobile:true},
  {x:177,z:2,sector:0,size:.90,mobile:true},
  {x:198,z:2,sector:1,size:.94,mobile:true},
  {x:216,z:0,sector:1,size:1.00,mobile:true},
  {x:231,z:-31,sector:1,size:.89,mobile:true},
  {x:239,z:23,sector:1,size:.88,mobile:true},
  {x:266,z:-5,sector:2,size:.83,mobile:true},
  {x:281,z:-7,sector:2,size:.78,mobile:true},
  // The lower middle of the portrait travel shot needs near and middle
  // clearings, not more tiny dots beyond the horizon.
  {x:135,z:18,sector:0,size:.81,mobile:true},
  {x:173,z:-26,sector:0,size:.84,mobile:true},
  {x:199,z:-22,sector:1,size:.82,mobile:true},
  {x:246,z:-7,sector:2,size:.77,mobile:true}
];
const scatter=(n)=>{const v=Math.sin(n*127.1+18.9)*43758.5453;return v-Math.floor(v);};
const outer={0:[{x:117,z:-125,size:.76},{x:153,z:133,size:.72}],
  1:[{x:203,z:142,size:.72},{x:216,z:-129,size:.77}],
  2:[{x:270,z:-133,size:.74},{x:278,z:127,size:.69}]};

// Glass/Golden Leaf occupy local XY; the other four spread across XZ. Their
// separate pitches expose the recognizable face to the high, forward camera.
export const PETAL_PROFILES={
  glass:     {longest:4.80,pitch:-.52,yaw:.08,plane:'xy'},
  leaf:      {longest:4.95,pitch:.52,yaw:-.10,plane:'xz'},
  rose:      {longest:5.05,pitch:.48,yaw:.07,plane:'xz'},
  clover:    {longest:4.70,pitch:.56,yaw:-.08,plane:'xz'},
  rock:      {longest:4.65,pitch:.44,yaw:.10,plane:'xz'},
  goldenleaf:{longest:4.80,pitch:-.55,yaw:-.06,plane:'xy'}
};
const dummy=new T.Object3D();
const groundNormal=new T.Vector3(),localNormal=new T.Vector3();

// Ground the lowest ACTUAL vertex against the terrain tangent, rather than an
// empty bounding-box corner or a common pivot shared by unlike GLBs.
function surfaceContact(height,x,z,geometry,quaternion,scale){
  const slopeX=(height(x+.6,z)-height(x-.6,z))/1.2;
  const slopeZ=(height(x,z+.6)-height(x,z-.6))/1.2;
  groundNormal.set(-slopeX,1,-slopeZ);
  localNormal.copy(groundNormal).applyQuaternion(quaternion.clone().invert());
  const positions=geometry.getAttribute('position').array;
  let bottom=Infinity;
  for(let v=0;v<positions.length;v+=3){
    const projection=positions[v]*localNormal.x+positions[v+1]*localNormal.y+positions[v+2]*localNormal.z;
    if(projection<bottom)bottom=projection;
  }
  return height(x,z)-bottom*scale+.045;
}

// One shared GPU geometry/material per type; three spatial batches keep distant
// clearings outside the frustum without increasing the instance count.
export function createPetalInstances(height,catalog,mobile=false,names=PETAL_NAMES){
  const garden=new T.Group();garden.name='florr-petal-assembly';
  PETAL_NAMES.forEach((name,speciesIndex)=>{
    if(!names.includes(name))return;
    const asset=catalog[name],profile=PETAL_PROFILES[name];
    if(!asset?.geometry||!asset?.material)throw new Error(`Missing optimized petal ${name}`);
    asset.geometry.computeBoundingBox();
    const dimensions=asset.geometry.boundingBox.getSize(new T.Vector3());
    const naturalSize=Math.max(dimensions.x,dimensions.y,dimensions.z);
    if(naturalSize<=0)throw new Error(`Invalid petal bounds ${name}`);
    const family=new T.Group();family.name=name;garden.add(family);
    family.userData.canonicalScale=profile.longest/naturalSize;
    family.userData.longest=profile.longest;
    for(let sector=0;sector<3;sector++){
      const places=[...clearings.filter(p=>p.sector===sector),...outer[sector]];
      const count=(mobile?[12,14,10]:[16,20,14])[sector];
      const selected=Array.from({length:count},(_,i)=>places[i%places.length]);
      const batch=new T.InstancedMesh(asset.geometry,asset.material.clone(),selected.length);
      batch.name=`${name}-sector-${sector}`;
      batch.frustumCulled=true;
      for(let i=0;i<selected.length;i++){
        const place=selected[i],key=i*43+speciesIndex*71+sector*131;
        const radius=i%5===0?14:i%3===0?8:3.7;
        const x=Math.max(92,Math.min(294,place.x+(scatter(key+1)-.5)*radius*2));
        const z=Math.max(-155,Math.min(164,place.z+(scatter(key+2)-.5)*radius*2));
        const variation=.91+scatter(key+3)*.18;
        const size=family.userData.canonicalScale*place.size*variation;
        dummy.rotation.set(profile.pitch+(scatter(key+4)-.5)*.07,profile.yaw+(scatter(key+5)-.5)*.36,(scatter(key+6)-.5)*.07);
        dummy.scale.setScalar(size);
        dummy.position.set(x,surfaceContact(height,x,z,asset.geometry,dummy.quaternion,size),z);
        dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
      }
      batch.instanceMatrix.needsUpdate=true;
      batch.computeBoundingSphere();
      family.add(batch);
    }
  });
  garden.userData.instanceCount=mobile?216:300;
  return garden;
}

export function loadOptimizedPetals(onAsset){
  return loadPetalCatalog(PETAL_NAMES.map(name=>[name,`assets/garden-petals/${name}.glb`]),onAsset);
}
