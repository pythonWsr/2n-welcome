import * as T from 'three';
import {sculptureShapes, cutSolid} from './sculpture-shapes.js';


export function createMonument() {
  const group = new T.Group(); group.name = 'static-silver-monument';
  const silver = new T.MeshStandardMaterial({ color: 0xd5d8da, metalness: .92, roughness: .29 });
  const shapes=sculptureShapes();
  const two=new T.Mesh(cutSolid(shapes.two,9),silver);two.name='two-cut-solid';
  const n=new T.Mesh(cutSolid(shapes.n,7),silver);n.name='n-cut-solid';
  group.add(two,n);
  return group;
}

export function createLighting(scene, renderer) {
  const studio = new T.Scene(); studio.background = new T.Color(0x08090b);
  for (const [x,y,z,w,h,power] of [[-45,35,25,14,100,6],[50,15,-20,8,90,9],[0,90,0,70,15,5]]) {
    const panel = new T.Mesh(new T.PlaneGeometry(w,h), new T.MeshBasicMaterial({color:new T.Color(power,power,power),side:T.DoubleSide}));
    panel.position.set(x,y,z); panel.lookAt(0,10,0); studio.add(panel);
  }
  const pmrem = new T.PMREMGenerator(renderer);
  const env = pmrem.fromScene(studio, .035, .1, 300);
  scene.environment = env.texture; scene.environmentIntensity = .9;
  studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();}); pmrem.dispose();
  const key = new T.DirectionalLight(0xf4f1e9, 3.5); key.position.set(-40,65,45); scene.add(key);
  const rim = new T.DirectionalLight(0xc5d2df, 2); rim.position.set(45,20,-25); scene.add(rim);
  scene.add(new T.HemisphereLight(0xaab4c1,0x090908,.35));
}
