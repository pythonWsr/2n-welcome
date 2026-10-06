import * as T from 'three';

const tintLeaf=new T.Color(0x324c3d),tintDry=new T.Color(0x6b6650);
const stoneGreen=new T.Color(0x626a61),stoneDry=new T.Color(0x8b7964);
const saturate=x=>Math.max(0,Math.min(1,x));
const random=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
const o=new T.Object3D(),shade=new T.Color();
function instance(mesh,index,x,y,z,size,rotation,color){
  o.position.set(x,y,z);o.rotation.set(0,rotation,0);o.scale.set(...size);o.updateMatrix();
  mesh.setMatrixAt(index,o.matrix);mesh.setColorAt(index,color);
}

// Authored leaf silhouettes with a raised spine and rolled edges. Opaque front
// and back faces preserve definition on phones without alpha overdraw.
export function bladeGeometry(steps=9){
  const vertices=[],uv=[],indices=[];
  for(let blade=0;blade<5;blade++){
    const rotation=blade*2.399,reach=.48+blade*.12,height=1+((blade*17)%3)*.1;
    for(let side=0;side<2;side++)for(let i=0;i<=steps;i++){
      const t=i/steps,w=Math.pow(Math.sin(Math.PI*t),.72)*(.23+blade*.018);
      const sway=t*t*reach,base=vertices.length/3;
      for(let j=-1;j<=1;j++){
        const lateral=sway+j*w,depth=(side===0?1:-1)*(1-Math.abs(j))*.055;
        vertices.push(Math.cos(rotation)*lateral-Math.sin(rotation)*depth,
          t*height,
          Math.sin(rotation)*lateral+Math.cos(rotation)*depth);
        uv.push((j+1)*.5,t);
      }
      if(i){
        const a=base-3,b=base;
        indices.push(a,a+1,b,a+1,b+1,b,a+1,a+2,b+1,a+2,b+2,b+1);
      }
    }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  return geo;
}

// Rounded stratified cut stone: horizontal ledges, with no faceted icosahedron.
export function stoneGeometry(){
  const verts=[],indices=[],sides=16,rings=[[0,1.08],[.20,1.05],[.51,.94],[.72,.87],[.83,.51]];
  for(let r=0;r<rings.length;r++)for(let i=0;i<sides;i++){
    const a=i/sides*Math.PI*2,turn=1+.058*Math.sin(a*4+r*.45)+.025*Math.cos(a*7);
    const [h,w]=rings[r];verts.push(Math.cos(a)*w*turn,h+Math.sin(a*3)*.017,Math.sin(a)*w*.75*turn);
    if(r<rings.length-1){const p=r*sides+i,q=r*sides+(i+1)%sides;indices.push(p,q,p+sides,q,q+sides,p+sides);}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

// Composition is intentional: masses frame the valley, leaving the flight
// corridor and the vertical limestone marker legible from the overhead camera.
const gardenBeds=[
  [138,-54,5],[148,-72,4],[162,-81,8],[174,-39,6],[184,-91,6],
  [194,-54,7],[209,-104,6],[225,-89,8],[237,-51,5],[251,-98,5],
  [140,37,4],[153,54,5],[170,24,6],[182,48,6],[197,28,5],
  [215,57,5],[234,33,6],[252,43,4]
];
function placements(start,end,mobile){
  const beds=gardenBeds.flatMap(([x,z,n],bed)=>Array.from({length:mobile?Math.ceil(n*.64):n},(_,i)=>({
    x:x+(random(i+bed*7,31)-.5)*12,z:z+(random(i+bed*13,17)-.5)*11,bed,i
  }))).filter(p=>p.x>=start&&p.x<end);
  // A few restrained desert remnants continue the same plant language.
  for(let x=Math.max(255,start+9);x<end-8;x+=16){
    if(random(x,7)>.44)beds.push({x,z:-62+Math.sin(x*.08)*24,bed:47,i:Math.round(x)});
  }
  return beds;
}
export function createGardenAssets(start,end,groundHeight,desertBlend,mobile){
  const group=new T.Group();group.name=`planted-strata-${start}`;
  const specimens=placements(start,end,mobile);
  const plants=new T.InstancedMesh(bladeGeometry(mobile?6:9),new T.MeshStandardMaterial({color:0xffffff,roughness:.82,side:T.DoubleSide}),specimens.length);
  for(const [i,p] of specimens.entries()){
    const desert=desertBlend(p.x),scale=(5.2+random(i,p.bed)*4.5)*(1-desert*.65);
    shade.copy(tintLeaf).lerp(tintDry,desert).multiplyScalar(.82+random(i,19)*.32);
    instance(plants,i,p.x,groundHeight(p.x,p.z),p.z,[scale,scale,scale],random(i,23)*6.28,shade);
  }
  const stones=[];
  for(const [bed,[x,z,n]] of gardenBeds.entries())for(let i=0;i<Math.ceil(n*.32);i++){
    const px=x+(random(i+bed*5,41)-.5)*19,pz=z+(random(i+bed*3,53)-.5)*16;
    if(px>=start&&px<end)stones.push({x:px,z:pz});
  }
  for(let x=Math.max(start+8,270);x<end-8;x+=11)stones.push({x,z:-35+Math.sin(x*.064)*30});
  const rocks=new T.InstancedMesh(stoneGeometry(),new T.MeshStandardMaterial({color:0xffffff,roughness:.97,side:T.DoubleSide}),stones.length);
  for(const [i,p] of stones.entries()){
    const s=1.2+random(i,67)*2.7,b=desertBlend(p.x);
    shade.copy(stoneGreen).lerp(stoneDry,b).multiplyScalar(.77+random(i,72)*.28);
    instance(rocks,i,p.x,groundHeight(p.x,p.z)-.12*s,p.z,[s*1.5,s,s],random(i,69)*6.28,shade);
  }
  for(const mesh of [plants,rocks]){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.frustumCulled=false;group.add(mesh);}
  return group;
}
