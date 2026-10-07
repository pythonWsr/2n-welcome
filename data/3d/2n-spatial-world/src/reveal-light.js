import * as T from 'three';

// One shared world-space field for the light shaft, dust and metal illumination.
export const beamOrigin=new T.Vector3(-52,90,82);
export const beamTarget=new T.Vector3(-4,12,0);
export const beamDirection=beamTarget.clone().sub(beamOrigin).normalize();
export const beamLength=beamOrigin.distanceTo(beamTarget);
export const beamAngle=.105;
export function beamWeight(point){
  const delta=point.clone().sub(beamOrigin),axial=delta.dot(beamDirection);
  if(axial<=0||axial>beamLength+12)return 0;
  const radius=Math.max(.5,axial*Math.tan(beamAngle));
  const lateral=delta.addScaledVector(beamDirection,-axial).length()/radius;
  return (1-T.MathUtils.smoothstep(lateral,.55,1))*T.MathUtils.smoothstep(axial,5,25)*(1-T.MathUtils.smoothstep(axial,beamLength,beamLength+12));
}
export function createRevealLight(scene){
  const light=new T.SpotLight(0xe4e9ee,15000,beamLength+30,beamAngle,.75,2);
  light.position.copy(beamOrigin);light.target.position.copy(beamTarget);
  light.castShadow=false;scene.add(light,light.target);
  // Sparse longitudinal ribbons form one soft shaft, with no full-screen pass.
  const group=new T.Group();group.position.copy(beamOrigin);
  group.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),beamDirection);
  const length=beamLength,radius=length*Math.tan(beamAngle);
  for(let i=0;i<3;i++){
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute([-.2,0,0,.2,0,0,-radius,0,length,radius,0,length],3));
    g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));g.setIndex([0,1,2,1,3,2]);
    const m=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:`varying vec2 vUv;varying float vDepth;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vDepth=-p.z;gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec2 vUv;varying float vDepth;void main(){float edge=pow(max(0.,1.-abs(vUv.x*2.-1.)),3.);float endFade=smoothstep(.02,.22,vUv.y)*(1.-smoothstep(.70,1.,vUv.y));gl_FragColor=vec4(.40,.43,.46,edge*endFade*smoothstep(1.,18.,vDepth)*.035);}`});
    const mesh=new T.Mesh(g,m);mesh.rotation.z=i*Math.PI/3;group.add(mesh);
  }
  scene.add(group);
}
