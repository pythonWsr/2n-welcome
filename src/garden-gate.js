import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const root='/assets/garden-study/';

// Reuse the approved art gate composition in the scrolling world's coordinates.
// The height function keeps each asset planted on the existing continuous ground.
export async function loadGardenGate(height,mobile){
  const gltf=new GLTFLoader(),textures=new T.TextureLoader();
  const [faceSource,rockSource,fernSource,diffuse,normal]=await Promise.all([
    gltf.loadAsync(`${root}rock_face_01/rock_face_01_1k.gltf`),
    gltf.loadAsync(`${root}rock_moss_set_01/rock_moss_set_01_1k.gltf`),
    gltf.loadAsync(`${root}fern_02/fern_02_1k.gltf`),
    textures.loadAsync(`${root}ground/forest_diff_1k.jpg`),
    textures.loadAsync(`${root}ground/forest_nor_gl_1k.jpg`)
  ]);
  diffuse.colorSpace=T.SRGBColorSpace;
  for(const texture of [diffuse,normal]){
    texture.wrapS=texture.wrapT=T.RepeatWrapping;
    texture.repeat.set(13,13);
    texture.anisotropy=4;
  }

  const group=new T.Group();group.name='garden-asset-gate';
  const anchor=(mesh,x,z,s,angle=0,bed=.35)=>{
    mesh.position.set(x,height(x,z)+bed*s,z);
    mesh.rotation.y=angle;mesh.scale.setScalar(s);
    group.add(mesh);
  };

  const face=faceSource.scene.children.find(child=>child.isMesh);
  if(!face)throw Error('Rock Face 01 has no mesh');
  const central=face.clone();central.position.set(213,height(213,-70)-.6,-70);
  central.scale.set(10,11,10);central.rotation.y=-.28;group.add(central);
  const back=face.clone();back.position.set(293,height(293,-128)-1,-128);
  back.scale.set(9,7.5,8);back.rotation.y=.55;group.add(back);

  const rocks=rockSource.scene.children.filter(child=>child.isMesh).slice(0,mobile?3:5);
  if(!rocks.length)throw Error('Rock Moss Set 01 has no meshes');
  const rockPositions=[
    [151,19,7,-.4],[166,46,5,.8],[194,-12,5,-1],[240,1,6,.4],
    [246,-83,5,1.5],[275,-46,4,-.7],[134,-57,8,1.7]
  ];
  for(const [index,[x,z,s,angle]] of rockPositions.entries())
    anchor(rocks[index%rocks.length].clone(),x,z,s,angle);

  const ferns=fernSource.scene.children.filter(child=>child.isMesh);
  if(!ferns.length)throw Error('Fern 02 has no meshes');
  const fernPositions=[
    [159,32,13,.4],[174,14,10,-.7],[189,-22,11,1],[219,-4,9,-1],
    [238,-47,11,.2],[195,-82,9,.4],[252,-104,8,-.4],
    [153,-52,9,.8],[265,-11,9,2],[141,-22,8,-1]
  ];
  for(const [index,[x,z,s,angle]] of fernPositions.entries()){
    const fern=ferns[index%ferns.length].clone();
    // The glTF's translated nodes are an atlas layout, not world positions.
    fern.position.set(0,0,0);
    anchor(fern,x,z,s,angle,.025);
    fern.traverse(part=>{if(part.isMesh)part.material.side=T.DoubleSide;});
  }
  return {group,diffuse,normal};
}
