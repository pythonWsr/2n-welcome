import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {makeModel,views} from './models.js';
try{
  const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0xdededb);document.body.append(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1,.1,600),controls=new OrbitControls(camera,renderer.domElement);
  scene.add(new T.HemisphereLight(0xffffff,0x555555,2));const light=new T.DirectionalLight(0xffffff,3);light.position.set(-50,80,90);scene.add(light);
  const candidates=['A','B','C','C+'].map(k=>{const m=makeModel(k[0],k==='C+');scene.add(m);return m;});
  const render=()=>renderer.render(scene,camera);
  function model(k){candidates.forEach((m,i)=>m.visible=['A','B','C','C+'][i]===k);render();}
  function view(k){camera.position.fromArray(views[k][0]);controls.target.fromArray(views[k][1]);controls.update();render();}
  function resize(){const h=Math.max(300,innerHeight-220);renderer.setSize(innerWidth,h);camera.aspect=innerWidth/h;camera.updateProjectionMatrix();render();}
  document.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>model(b.dataset.model));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
  controls.addEventListener('change',render);addEventListener('resize',resize);resize();model('A');view('front');
}catch{document.querySelector('#status').textContent='WebGL 不可用，请打开四视角离线校样。';}
