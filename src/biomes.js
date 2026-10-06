import {worldHeight} from './world-surface.js';
import {createOceanGround,createOceanPetalsAsync,loadOceanPetals,coastalColor,createCoastSandAsync} from './ocean-production.js';
import {createJungleGround,createJunglePetalsAsync,loadJunglePetals} from './jungle-production.js';
import * as T from 'three';
import {createDesertProduction,createDesertProductionAsync,desertGroundColor,loadDesertPetals} from './desert-production.js';
import {createGardenProduction,gardenGroundColor} from './garden-production.js';
import {createPetalInstances,loadOptimizedPetals} from './garden-assembly.js';
import {applyRegionalFog} from './regional-fog.js';
import {createHellGround,createHellPetalsAsync,loadHellPetals} from './hell-production.js';

const saturate=x=>Math.max(0,Math.min(1,x));
const smooth=(x,a,b)=>{const t=saturate((x-a)/(b-a));return t*t*(3-2*t);};
const green=new T.Color(0x23322b), sand=new T.Color(0x655748);
export const desertBlend=x=>smooth(x,223,385);

// Continuous heightfield and palette across the garden/desert boundary.
export const groundHeight=worldHeight;
// Sample the two Desert triangles actually rendered, rather than the smooth
// generator used for the grid vertices. Prevents small horizon gaps.
export function renderedGroundHeight(x,z){
  if(x<296||x>520||z< -365||z>330)return groundHeight(x,z);
  const x0=x<404?296:404,x1=x<404?404:520;
  const dx=(x1-x0)/56,dz=695/68;
  const ix=Math.min(55,Math.floor((x-x0)/dx)),iz=Math.min(67,Math.floor((z+365)/dz));
  const X=x0+ix*dx,Z=-365+iz*dz,u=(x-X)/dx,v=(z-Z)/dz;
  if(u+v<=1)return (1-u-v)*groundHeight(X,Z)+u*groundHeight(X+dx,Z)+v*groundHeight(X,Z+dz);
  return (u+v-1)*groundHeight(X+dx,Z+dz)+(1-v)*groundHeight(X+dx,Z)+(1-u)*groundHeight(X,Z+dz);
}
// Stable across bundler minification; build regenerates the exact matrices.
renderedGroundHeight.placementKey='rendered-desert';
function terrainPart(x0,x1){
  const nx=56,nz=68,geo=new T.BufferGeometry();
  const positions=[],normals=[],colors=[],uvs=[],indices=[],c=new T.Color();
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
    const x=x0+(x1-x0)*i/nx,z=-365+j*695/nz,y=groundHeight(x,z);
    positions.push(x,y,z);
    uvs.push(x/900,z/900);
    // A world-space derivative shares the same normals across every region seam.
    const dx=(groundHeight(x+.3,z)-groundHeight(x-.3,z))/.6;
    const dz=(groundHeight(x,z+.3)-groundHeight(x,z-.3))/.6;
    const normal=new T.Vector3(-dx,1,-dz).normalize();
    normals.push(normal.x,normal.y,normal.z);
    c.copy(green).lerp(sand,desertBlend(x));
    const fleck=.024*Math.sin(x*.12+z*.05)+.012*Math.sin(x*.24-z*.08);
    c.offsetHSL(0,0,fleck);
    c.lerp(desertGroundColor(x,z),smooth(x,282,354));
    const rim=smooth(x,42,77)*(1-smooth(x,850,930))*smooth(z,-350,-290)*(1-smooth(z,250,320));
    if(x>=404)c.copy(coastalColor(x,z));
    c.multiplyScalar(.015+rim*.985);
    if(x<296)c.lerp(gardenGroundColor(x,z).multiplyScalar(.015+rim*.985),1-smooth(x,258,296));
    colors.push(c.r,c.g,c.b);
    if(i<nx&&j<nz){const p=i*(nz+1)+j;indices.push(p,p+1,p+nz+1,p+1,p+nz+2,p+nz+1);}
  }
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);
  const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));
  mesh.name='continuous-3d-ground';mesh.frustumCulled=true;return mesh;
}

export const prepareBiomePetals=world=>Promise.all([world.preloadPetals(),world.preloadDesertPetals(),world.preloadOceanPetals?.(),world.preloadJunglePetals?.(),world.preloadHellPetals?.()]);
// Resource state never clamps navigation. Slow/failed resources are surfaced
// by the loading UI and may be retried without trapping scroll progress.
export function limitUnreadyTravel(target){return target;}

export function createBiomes(scene,mobile,loaders={garden:loadOptimizedPetals,desert:loadDesertPetals,ocean:loadOceanPetals,jungle:loadJunglePetals,hell:loadHellPetals}){
  const spans=[[45,188],[188,296],[296,404],[404,520]],regions=new Array(spans.length);
  const garden=createGardenProduction(groundHeight,mobile);
  const build=i=>{
    if(regions[i])return;
    const [a,b]=spans[i],group=new T.Group();
    group.add(terrainPart(a,b));
    if(i===0)group.add(garden);
    if(i===2)group.add(createDesertProduction(groundHeight,mobile));
    group.visible=false;
    scene.add(group);regions[i]=group;
  };
  const ocean=new T.Group();ocean.name='florr-ocean';ocean.visible=false;scene.add(ocean);
  const jungle=new T.Group();jungle.name='florr-jungle';jungle.visible=false;scene.add(jungle);
  const hell=new T.Group();hell.name='florr-hell';hell.visible=false;scene.add(hell);
  let hellLoad,hellPetalStatus='pending';
  let preparing=false,groundStatus='pending';
  let petalStatus='pending',desertPetalStatus='pending',oceanPetalStatus='pending';
  let gardenLoad,desertLoad,oceanLoad,jungleLoad,junglePetalStatus='pending',petalAssembly;
  const installed={garden:new Set(),desert:new Set(),ocean:new Set(),jungle:new Set(),hell:new Set()},failures={garden:[],desert:[],ocean:[],jungle:[],hell:[]};
  let onPrepared=()=>{};
  function installPetals(catalog){
    const names=Object.keys(catalog).filter(n=>!installed.garden.has(n));if(!names.length)return;
    if(!petalAssembly){petalAssembly=new T.Group();petalAssembly.name='florr-petal-assembly';petalAssembly.userData.instanceCount=0;garden.add(petalAssembly);}
    const addition=createPetalInstances(groundHeight,catalog,mobile,names);
    for(const child of [...addition.children])petalAssembly.add(child);
    petalAssembly.userData.instanceCount+=(mobile?36:50)*names.length;
    for(const name of names){installed.garden.add(name);onPrepared(catalog[name],'garden',name);}
    if(installed.garden.size===6)petalStatus='ready';
  }
  async function installDesertPetals(catalog){
    const names=Object.keys(catalog).filter(n=>!installed.desert.has(n));if(!names.length)return;
    build(2);const desert=scene.getObjectByName('florr-desert');
    const addition=await createDesertProductionAsync(renderedGroundHeight,mobile,catalog,names);
    for(const child of [...addition.children])desert.add(child);
    if(names.includes('sand')&&!ocean.getObjectByName('coast-sand-petals'))ocean.add(await createCoastSandAsync(catalog.sand,mobile));
    for(const name of names){installed.desert.add(name);onPrepared(catalog[name],'desert',name);}
    if(installed.desert.size===6)desertPetalStatus='ready';
  }
  async function installOceanPetals(catalog){
    const names=Object.keys(catalog).filter(n=>!installed.ocean.has(n));if(!names.length)return;
    if(!ocean.getObjectByName('florr-ocean-ground'))ocean.add(applyRegionalFog(createOceanGround()));
    const addition=applyRegionalFog(await createOceanPetalsAsync(catalog,mobile,names));for(const child of [...addition.children])ocean.add(child);
    for(const name of names){installed.ocean.add(name);onPrepared(catalog[name],'ocean',name);}
  }
  function start(kind,loader,install){
    failures[kind]=[];
    return loader((name,mesh)=>install({[name]:mesh})).then(async catalog=>{await install(catalog);failures[kind]=catalog.failures||[];return failures[kind].length?'error':'ready';}).catch(error=>{failures[kind]=[{message:error.message}];console.error(`${kind} petals unavailable`,error);return 'error';});
  }
  async function installJunglePetals(catalog){
    const names=Object.keys(catalog).filter(n=>!installed.jungle.has(n));if(!names.length)return;
    if(!jungle.getObjectByName('florr-jungle-ground'))jungle.add(applyRegionalFog(createJungleGround()));
    const addition=applyRegionalFog(await createJunglePetalsAsync(catalog,mobile,names));for(const child of [...addition.children])jungle.add(child);
    for(const name of names){installed.jungle.add(name);onPrepared(catalog[name],'jungle',name);}
  }
  function preloadJunglePetals(){
    if(!loaders.jungle)return Promise.resolve();
    if(junglePetalStatus==='loading'||junglePetalStatus==='ready')return jungleLoad;
    junglePetalStatus='loading';jungleLoad=start('jungle',loaders.jungle,installJunglePetals).then(status=>{junglePetalStatus=status;});return jungleLoad;
  }
  async function installHellPetals(catalog){
    const names=Object.keys(catalog).filter(n=>!installed.hell.has(n));if(!names.length)return;
    if(!hell.getObjectByName('florr-hell-ground'))hell.add(applyRegionalFog(createHellGround()));
    const addition=applyRegionalFog(await createHellPetalsAsync(catalog,mobile,names));for(const child of [...addition.children])hell.add(child);
    for(const name of names){installed.hell.add(name);onPrepared(catalog[name],'hell',name);}
  }
  function preloadHellPetals(){
    if(!loaders.hell)return Promise.resolve();
    if(hellPetalStatus==='loading'||hellPetalStatus==='ready')return hellLoad;
    hellPetalStatus='loading';hellLoad=start('hell',loaders.hell,installHellPetals).then(status=>{hellPetalStatus=status;});return hellLoad;
  }
  function preloadPetals(){if(petalStatus==='loading'||petalStatus==='ready')return gardenLoad;petalStatus='loading';gardenLoad=start('garden',loaders.garden,installPetals).then(status=>{petalStatus=status;});return gardenLoad;}
  function preloadDesertPetals(){if(desertPetalStatus==='loading'||desertPetalStatus==='ready')return desertLoad;desertPetalStatus='loading';desertLoad=start('desert',loaders.desert,installDesertPetals).then(status=>{desertPetalStatus=status;});return desertLoad;}
  function preloadOceanPetals(){if(oceanPetalStatus==='loading'||oceanPetalStatus==='ready')return oceanLoad;oceanPetalStatus='loading';oceanLoad=start('ocean',loaders.ocean||loadOceanPetals,installOceanPetals).then(status=>{oceanPetalStatus=status;});return oceanLoad;}
  function prepare(){
    if(preparing||groundStatus==='ready')return;preparing=true;groundStatus='loading';
    const tasks=[...spans.map((_,i)=>()=>build(i)),
      ()=>{if(!ocean.getObjectByName('florr-ocean-ground'))ocean.add(applyRegionalFog(createOceanGround()));},
      ()=>{if(!jungle.getObjectByName('florr-jungle-ground'))jungle.add(applyRegionalFog(createJungleGround()));},
      ()=>{if(!hell.getObjectByName('florr-hell-ground'))hell.add(applyRegionalFog(createHellGround()));}];
    let cursor=0;
    const schedule=()=>{if(typeof requestIdleCallback==='function')requestIdleCallback(step,{timeout:250});else setTimeout(step,16);};
    const step=()=>{try{tasks[cursor++]();if(cursor<tasks.length)schedule();else {groundStatus='ready';preparing=false;}}
      catch(error){groundStatus='error';preparing=false;console.error('Ground preparation failed',error);}};
    schedule();
  }
  const sun=new T.DirectionalLight(0xd7cbb8,1.4);sun.position.set(260,80,28);scene.add(sun);
  const gardenAir=new T.Color(0x11151a),desertAir=new T.Color(0x342b25);
  return {set onAssetPrepared(fn){onPrepared=fn;},get hellPetalStatus(){return hellPetalStatus;},get loading(){return {counts:{garden:installed.garden.size,desert:installed.desert.size,ocean:installed.ocean.size,jungle:installed.jungle.size,hell:installed.hell.size},failures};},prepare,preloadHellPetals,preloadJunglePetals,preloadOceanPetals,preloadPetals,installPetals,preloadDesertPetals,installDesertPetals,update(camera,t){
    sun.intensity=1.4*T.MathUtils.smoothstep(t,.02,.25);
    const shift=desertBlend(camera.position.x+42)*t;
    sun.color.set(0xd7cbb8).lerp(new T.Color(0xe2ba8b),shift*.42);
    if(t>0){
      // Do not touch the proven Hero atmosphere until the camera has entered the world.
      scene.fog?.color.copy(gardenAir).lerp(new T.Color(0x263d2c),smooth(t,.01,.3)*.55).lerp(desertAir,shift*.16);
      if(scene.fog)scene.fog.density=T.MathUtils.lerp(scene.fog.density,.0036,T.MathUtils.smoothstep(t,0,.38));
    }
    // Geometry is ready at the opening. Never switch a visible mountain range
    // on at an arbitrary camera threshold; normal fog and the frustum reveal it.
    ocean.visible=t>0;
    jungle.visible=t>0;
    hell.visible=t>0;
    if(camera.position.x>470){const oceanShift=smooth(camera.position.x,470,640);scene.fog?.color.lerp(new T.Color(0x1d485d),oceanShift);sun.color.lerp(new T.Color(0xbde5ef),oceanShift*.7);}
    if(camera.position.x>775){const jungleShift=smooth(camera.position.x,775,990);scene.fog?.color.lerp(new T.Color(0x163b2c),jungleShift);sun.color.lerp(new T.Color(0xd4edbd),jungleShift*.65);}
    if(camera.position.x>1150){const hellShift=smooth(camera.position.x,1150,1390);scene.fog?.color.lerp(new T.Color(0x63282e),hellShift);sun.color.lerp(new T.Color(0xffd0bc),hellShift*.55);}
    // The complete small Gate is ready before the camera can see a region seam.
    // Runtime visibility follows the whole world, never an individual tile edge.
    for(let i=0;i<regions.length;i++){
      if(regions[i])regions[i].visible=t>0;
    }
  },get junglePetalStatus(){return junglePetalStatus;},get oceanPetalStatus(){return oceanPetalStatus;},get gardenStatus(){return 'ready';},get groundStatus(){return groundStatus;},get petalStatus(){return petalStatus;},get desertPetalStatus(){return desertPetalStatus;},stats:{groundTriangles:spans.length*56*68*2}};
}
