import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {studyModel} from './geometry.js';
export const views={front:[[7,6,130],[7,6,0]],low:[[-40,-48,100],[0,5,0]],quarter:[[100,45,100],[7,5,-3]],close:[[-27,-22,20],[-13,-20,-3]]};
try{
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0xdededb);document.body.append(renderer.domElement);
  const scene=new T.Scene();scene.add(studyModel());
  scene.add(new T.HemisphereLight(0xffffff,0x666666,2));const key=new T.DirectionalLight(0xffffff,3);key.position.set(-50,80,90);scene.add(key);
  const camera=new T.PerspectiveCamera(45,1,.1,600),controls=new OrbitControls(camera,renderer.domElement);
  function view(name){camera.position.fromArray(views[name][0]);controls.target.fromArray(views[name][1]);controls.update();renderer.render(scene,camera);}
  function resize(){const h=innerHeight*.75;renderer.setSize(innerWidth,h);camera.aspect=innerWidth/h;camera.updateProjectionMatrix();renderer.render(scene,camera);}
  controls.addEventListener('change',()=>renderer.render(scene,camera));addEventListener('resize',resize);
  document.querySelectorAll('button').forEach(b=>b.onclick=()=>view(b.dataset.view));resize();view('front');
}catch(e){document.querySelector('#error').textContent='当前浏览器无法显示 WebGL；请查看随附四视角离线灰模校样。';}
