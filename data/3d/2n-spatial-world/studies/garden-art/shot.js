import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {gardenPose} from '../../src/garden-path.js';
import {stableViewport} from '../../src/viewport.js';

// Isolated art gate. It neither replaces the established Hero nor wires a
// Garden/Desert chapter into the public journey before the visual shot passes.
const canvas=document.querySelector('#study'),status=document.querySelector('#status');
const mobile=matchMedia('(pointer:coarse)').matches;
const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.3:1.6));
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.04;
const scene=new T.Scene();scene.background=new T.Color(0x0c1110);
scene.fog=new T.FogExp2(0x111a18,.0058);
const camera=new T.PerspectiveCamera(mobile?48:44,1,.2,520);
scene.add(new T.HemisphereLight(0x8daba0,0x181b15,1.15));
const key=new T.DirectionalLight(0xd7e4ca,2.2);key.position.set(110,85,125);scene.add(key);
const fill=new T.DirectionalLight(0x6a8475,.65);fill.position.set(300,38,-90);scene.add(fill);

const root='/assets/garden-study/';
const gltf=new GLTFLoader(),textures=new T.TextureLoader();
const height=(x,z)=>-40+2.4*Math.sin(x*.027+z*.019)+1.3*Math.cos(z*.045-x*.016);
function terrain(diffuse,normal){
  const mesh=new T.PlaneGeometry(900,900,64,64),pos=mesh.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i)+195,z=-pos.getY(i)-35;
    pos.setZ(i,height(x,z));
  }
  mesh.computeVertexNormals();
  diffuse.colorSpace=T.SRGBColorSpace;
  for(const texture of [diffuse,normal]){
    texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(13,13);
    texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);
  }
  const ground=new T.Mesh(mesh,new T.MeshStandardMaterial({map:diffuse,normalMap:normal,roughness:1,color:0xa5b2a3}));
  ground.rotation.x=-Math.PI/2;ground.position.set(195,0,-35);ground.name='continuous-ground-outside-fog-range';scene.add(ground);
}
function anchor(mesh,x,z,s,angle=0,bed=.35){
  mesh.position.set(x,height(x,z)+bed*s,z);
  mesh.rotation.y=angle;mesh.scale.setScalar(s);
  scene.add(mesh);return mesh;
}
function addRockFaces(source){
  const face=source.scene.children.find(child=>child.isMesh);
  if(!face)throw Error('Rock Face 01 has no mesh');
  const central=face.clone();central.position.set(213,height(213,-70)-.6,-70);
  central.scale.set(10,11,10);central.rotation.y=-.28;
  scene.add(central);
  const back=face.clone();back.position.set(293,height(293,-128)-1,-128);
  back.scale.set(9,7.5,8);back.rotation.y=.55;scene.add(back);
}
function addBoulders(source){
  const variants=source.scene.children.filter(child=>child.isMesh).slice(0,mobile?3:5);
  const positions=[
    [151,19,7,-.4],[166,46,5,.8],[194,-12,5,-1],[240,1,6,.4],
    [246,-83,5,1.5],[275,-46,4,-.7],[134,-57,8,1.7]
  ];
  for(const [index,[x,z,s,a]] of positions.entries())anchor(variants[index%variants.length].clone(),x,z,s,a);
}
function addFerns(source){
  const variants=source.scene.children.filter(child=>child.isMesh);
  const positions=[
    [159,32,13,.4],[174,14,10,-.7],[189,-22,11,1],[219,-4,9,-1],
    [238,-47,11,.2],[195,-82,9,.4],[252,-104,8,-.4],
    [153,-52,9,.8],[265,-11,9,2],[141,-22,8,-1]
  ];
  for(const [index,[x,z,s,a]] of positions.entries()){
    const mesh=variants[index%variants.length].clone();
    // The source file is an atlas of four plant variants with translated nodes.
    // Reset atlas layout; clone the geometry/material, not the source placement.
    mesh.position.set(0,0,0);
    anchor(mesh,x,z,s,a,.025);
    mesh.traverse(part=>{if(part.isMesh)part.material.side=T.DoubleSide;});
  }
}
let ready=false;
const render=()=>{if(!ready)return;gardenPose(.52,camera,innerWidth<innerHeight);camera.aspect=innerWidth/(parseFloat(getComputedStyle(canvas).height)||innerHeight);camera.updateProjectionMatrix();renderer.render(scene,camera);};
stableViewport(view=>{renderer.setSize(view.width,view.height);render()},1);
async function loadShot(){try{
  const [face,rocks,ferns,diffuse,normal]=await Promise.all([
    gltf.loadAsync(`${root}rock_face_01/rock_face_01_1k.gltf`),
    gltf.loadAsync(`${root}rock_moss_set_01/rock_moss_set_01_1k.gltf`),
    gltf.loadAsync(`${root}fern_02/fern_02_1k.gltf`),
    textures.loadAsync(`${root}ground/forest_diff_1k.jpg`),
    textures.loadAsync(`${root}ground/forest_nor_gl_1k.jpg`)
  ]);
  terrain(diffuse,normal);addRockFaces(face);addBoulders(rocks);addFerns(ferns);
  ready=true;render();
  canvas.dataset.ready='true';
}catch(error){status.textContent='Garden 样板素材加载失败。';console.error(error);}}
loadShot();
