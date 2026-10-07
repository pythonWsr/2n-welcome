import {writeFileSync} from 'node:fs';
import {readPetalGeometry} from './petal-geometry.mjs';
import {serializePlacement} from '../src/placement-cache.js';
import {createDesertProduction} from '../src/desert-production.js';
import {createOceanPetals,createCoastSand} from '../src/ocean-production.js';
import {createJunglePetals} from '../src/jungle-production.js';
import {createHellPetals} from '../src/hell-production.js';
import {renderedGroundHeight} from '../src/biomes.js';
const species={desert:['cactus','sand','stick','pincer','iris','goldenleaf'],ocean:['pearl','shell','starfish'],jungle:['peas','tomato','bur','goldenleaf','rock','compass'],hell:['darkmark','corruption'],coast:['sand']};
const result={};
for(const [kind,names] of Object.entries(species))for(const name of names){
 const folder=['goldenleaf','rock'].includes(name)?'garden':kind==='coast'?'desert':kind;
 const asset=readPetalGeometry(new URL(`../public/assets/${folder}-petals/${name}.glb`,import.meta.url));
 for(const mobile of [true,false]){
  const catalog={[name]:asset},root=kind==='desert'?createDesertProduction(renderedGroundHeight,mobile,catalog,[name]):kind==='ocean'?createOceanPetals(catalog,mobile,[name]):kind==='jungle'?createJunglePetals(catalog,mobile,[name]):kind==='hell'?createHellPetals(catalog,mobile,[name]):createCoastSand(asset,mobile);
  result[`${kind}:${mobile?'mobile':'desktop'}:${name}`]={...serializePlacement(root,asset),context:kind==='desert'?renderedGroundHeight.placementKey:''};
 }
}
writeFileSync(new URL('../src/baked-petals.js',import.meta.url),`// Generated from original GLBs and exact placement algorithms. Do not hand edit.\nexport default ${JSON.stringify(result)};\n`);
console.log(`Baked ${Object.keys(result).length} lossless petal placement groups.`);
