import * as T from 'three';
import {pose} from './journey.js';
import {beamWeight} from './reveal-light.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(x,a,b)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function fogVisibility(progress) {
  const clarity=Math.pow(smooth(progress,.01,.72),1.18);
  return T.MathUtils.lerp(.065,.985,clarity);
}
export function fogDensity(distance,progress) {
  return Math.sqrt(-Math.log(fogVisibility(progress)))/Math.max(8,distance);
}
export function fogLayerOpacity(signedDistance,baseOpacity,progress) {
  const crossing=1-smooth(signedDistance,-55,18);
  const thinning=1-.42*smooth(progress,.06,.78);
  return baseOpacity*crossing*thinning;
}
export function dustData(mobile) {
  let seed=71821;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const count=mobile?6200:11000, positions=new Float32Array(count*3), sizes=new Float32Array(count);
  const camera=new T.PerspectiveCamera(), point=new T.Vector3();
  for(let i=0;i<count;i++) {
    if(i<count*.48) {
      positions.set([(random()-.5)*210,(random()-.5)*180,random()*490-70],i*3);
      sizes[i]=.35+random()*.6;
    } else {
      // Bake dust around the flight corridor once. Never move/recycle it with camera.
      pose(random()*.82,camera,false);
      const close=i>count*.94;
      const radius=close?2+random()*5:8+Math.sqrt(random())*36;
      const angle=random()*Math.PI*2;
      point.set(Math.cos(angle)*radius,Math.sin(angle)*radius,-4-random()*30);
      point.applyQuaternion(camera.quaternion).add(camera.position);
      positions.set(point.toArray(),i*3);
      sizes[i]=close?1.1+random()*.5:.5+random()*.65;
    }
  }
  return {count,positions,sizes};
}
export function atmosphere(scene, mobile) {
  const {positions,sizes}=dustData(mobile);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('aSize',new T.BufferAttribute(sizes,1));
  const illumination=new Float32Array(sizes.length),sample=new T.Vector3();
  for(let i=0;i<sizes.length;i++)illumination[i]=beamWeight(sample.fromArray(positions,i*3));
  g.setAttribute('aBeam',new T.BufferAttribute(illumination,1));
  const dust=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uPixel:{value:Math.min(devicePixelRatio,1.5)}},vertexShader:`attribute float aSize; attribute float aBeam; uniform float uPixel; varying float fade; varying float brightness; void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(aSize*165.*uPixel/max(1.,-p.z),1.35*uPixel,7.*uPixel);fade=smoothstep(.3,2.2,-p.z)*(1.-smoothstep(150.,320.,-p.z));brightness=mix(.30,.52,smoothstep(.7,1.5,aSize))+aBeam*.46;}`,fragmentShader:`varying float fade;varying float brightness;void main(){vec2 p=(gl_PointCoord-.5)*vec2(1.,1.15);float r=length(p);float a=(1.-smoothstep(.12,.5,r))*mix(.52,.85,brightness)*fade;gl_FragColor=vec4(vec3(brightness),a);}`});
  scene.add(new T.Points(g,dust));
  scene.fog=new T.FogExp2(0x11151a,.004);
  // Several world-fixed banks create one long passage. Each fades before the
  // near plane instead of disappearing when the camera crosses its polygon.
  const fogVertex=`varying vec2 uvW;void main(){uvW=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  const fogFragment=`varying vec2 uvW;uniform float uOpacity;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}void main(){vec2 p=uvW*2.-1.;float edge=1.-smoothstep(.25,1.,length(p));float n=noise(uvW*5.)*.55+noise(uvW*14.)*.30+noise(uvW*37.)*.15;gl_FragColor=vec4(.19,.21,.23,edge*n*uOpacity);}`;
  const specs=mobile?[[0,0,235,.10],[-18,8,175,.13],[16,-5,120,.14],[-10,18,72,.11],[8,12,42,.08]]:[[0,0,255,.08],[-20,10,215,.10],[14,-8,175,.12],[-18,5,135,.14],[18,0,98,.13],[-12,20,66,.10],[8,12,40,.07]];
  const layers=specs.map(([x,y,z,base])=>{
    const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uOpacity:{value:base}},vertexShader:fogVertex,fragmentShader:fogFragment});
    const mesh=new T.Mesh(new T.PlaneGeometry(240,170),material);
    mesh.position.set(x,y,z);mesh.userData.baseOpacity=base;scene.add(mesh);return mesh;
  });
  const focus=new T.Vector3(4,8,0);
  return {update(camera,progress){
    const distance=camera.position.distanceTo(focus);
    scene.fog.density=fogDensity(distance,progress);
    for(const layer of layers){
      const signedDistance=layer.position.z-camera.position.z;
      layer.material.uniforms.uOpacity.value=fogLayerOpacity(signedDistance,layer.userData.baseOpacity,progress);
    }
  }};
}
