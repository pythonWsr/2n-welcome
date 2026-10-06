import * as T from 'three';

// Direction B: one continuous graphic field, with real depth in the petals.
const leafGreen=new T.MeshStandardMaterial({color:0x527f38,roughness:1,flatShading:true,side:T.DoubleSide});
const paleGreen=new T.MeshStandardMaterial({color:0x87b34c,roughness:1,flatShading:true,side:T.DoubleSide});
const cream=new T.MeshStandardMaterial({color:0xf3e7c8,roughness:1,side:T.DoubleSide});
const rose=new T.MeshStandardMaterial({color:0xe5aaa5,roughness:1,side:T.DoubleSide});
const yellow=new T.MeshStandardMaterial({color:0xeab956,roughness:1});
const red=new T.MeshStandardMaterial({color:0xd7503f,roughness:1});
const ink=new T.MeshStandardMaterial({color:0x172420,roughness:1});
const shared={leaf:new T.SphereGeometry(1,8,6),dot:new T.SphereGeometry(1,6,4)};
const random=(n)=>{const v=Math.sin(n*127.1+4.13)*43758.5453;return v-Math.floor(v);};

export function gardenGroundColor(x,z){
  const entry=T.MathUtils.smoothstep(x,52,118);
  const contour=Math.sin(x*.055+Math.sin(z*.041)*1.1+z*.016);
  const broad=T.MathUtils.smoothstep(contour,-.35,.55);
  const patches=Math.sin(x*.13+z*.082)*Math.cos(z*.092-x*.061);
  const green=new T.Color(0x427d38).lerp(new T.Color(0x649c43),broad*.68);
  green.lerp(new T.Color(0x366d33),Math.max(0,-patches)*.24);
  return new T.Color(0x111b19).lerp(green,entry);
}

function groundMarks(height,mobile){
  const positions=[],colors=[],indices=[];
  const columns=mobile?18:23,rows=mobile?25:31;
  const light=new T.Color(0x80ab51),dark=new T.Color(0x386f35),mid=new T.Color(0x558c40);
  // Broad, irregular, rounded color blocks translate Florr's graphic ground
  // into a height-following 3D surface. No repeating photo or flat slab.
  const tones=[new T.Color(0x679949),new T.Color(0x376e35),new T.Color(0x75a04c)];
  for(let a=0;a<12;a++)for(let b=0;b<15;b++){
    if(random(a*47+b*83)<.20)continue;
    const x=95+(a+.23+(random(a*113+b*21)-.5)*.58)*198/12;
    const z=-154+(b+.2+(random(a*39+b*79)-.5)*.55)*302/15;
    const rx=3.0+random(a*29+b*17)*3.5,rz=2.8+random(a*13+b*71)*4.1;
    const color=tones[(a*5+b*7)%3],start=positions.length/3;
    positions.push(x,height(x,z)+.095,z);colors.push(color.r,color.g,color.b);
    for(let j=0;j<9;j++){
      const angle=j*Math.PI*2/8,irregular=.83+random(a*73+b*11+j*19)*.28;
      const px=x+Math.cos(angle)*rx*irregular,pz=z+Math.sin(angle)*rz*irregular;
      positions.push(px,height(px,pz)+.095,pz);colors.push(color.r,color.g,color.b);
      if(j<8)indices.push(start,start+j+1,start+j+2);
    }
  }
  for(let a=0;a<columns;a++)for(let b=0;b<rows;b++){
    const x=94+(a+(random(a*83+b*5)-.5)*.72)*198/(columns-1);
    const z=-140+(b+(random(a*29+b*13)-.5)*.66)*290/(rows-1);
    const angle=(random(a*19+b*71)-.5)*Math.PI;
    const width=.28+random(a*97+b*31)*.38,length=.65+random(a*47+b*53)*.85;
    const sin=Math.sin(angle),cos=Math.cos(angle),start=positions.length/3;
    const color=[light,dark,mid][(a*7+b*11)%3];
    for(const [dx,dz] of [[-width,-length*.7],[width,-length*.6],[width*.75,length],[-width*.7,length*.8]]){
      const px=x+dx*cos-dz*sin,pz=z+dx*sin+dz*cos;
      positions.push(px,height(px,pz)+.065,pz);
      colors.push(color.r,color.g,color.b);
    }
    indices.push(start,start+1,start+2,start,start+2,start+3);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const marks=new T.Mesh(geometry,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,depthWrite:false}));
  marks.name='garden-ground-marks';
  return marks;
}

function petalGeometry(width,height){
  const shape=new T.Shape();
  shape.moveTo(0,0);
  shape.bezierCurveTo(-width*.48,height*.22,-width*.78,height*.73,-width*.4,height*.91);
  shape.bezierCurveTo(-width*.18,height*1.11,width*.21,height*1.11,width*.46,height*.88);
  shape.bezierCurveTo(width*.82,height*.56,width*.43,height*.16,0,0);
  return new T.ExtrudeGeometry(shape,{depth:1.8,bevelEnabled:true,bevelThickness:.45,bevelSize:.45,bevelSegments:2,steps:1,curveSegments:8});
}

function petal(group,height,x,z,width,h,turn,material){
  const mesh=new T.Mesh(petalGeometry(width,h),material);
  mesh.position.set(x,height(x,z)-.1,z);
  mesh.rotation.y=turn;
  mesh.rotation.z=(random(x+z)-.5)*.13;
  mesh.castShadow=false;
  group.add(mesh);
}

function leaf(group,height,x,z,size,turn,material=leafGreen){
  const mesh=new T.Mesh(shared.leaf,material);
  mesh.scale.set(size*.34,size,Math.max(1,size*.15));
  mesh.rotation.set(.13,turn,-.16);
  mesh.position.set(x,height(x,z)+size*.72,z);
  group.add(mesh);
}

function flower(group,height,x,z,r,material){
  const y=height(x,z)+r*.35;
  for(let j=0;j<5;j++){
    const angle=j*Math.PI*2/5;
    const mesh=new T.Mesh(shared.leaf,material);
    mesh.scale.set(r*.62,r*.22,r*.38);
    mesh.rotation.y=-angle;
    mesh.position.set(x+Math.cos(angle)*r*.55,y,z+Math.sin(angle)*r*.55);
    group.add(mesh);
  }
  const core=new T.Mesh(shared.dot,yellow);
  core.scale.set(r*.35,r*.28,r*.35);core.position.set(x,y+r*.14,z);group.add(core);
}

function creatures(group,height,mobile){
  // Original geometric cues, not a copy of the source sprites or GLBs.
  for(const [x,z,kind] of [[139,52,'bee'],[250,-42,'ladybug']].slice(0,mobile?1:2)){
    const body=new T.Mesh(shared.leaf,kind==='bee'?yellow:red);
    body.scale.set(1.7,1.45,1.6);body.position.set(x,height(x,z)+(kind==='bee'?9:1.4),z);
    group.add(body);
    const marking=new T.Mesh(shared.dot,ink);
    marking.scale.set(.65,.58,.5);marking.position.copy(body.position).add(new T.Vector3(.45,.15,1.14));group.add(marking);
    if(kind==='bee')for(const side of [-1,1]){
      const wing=new T.Mesh(shared.leaf,cream);
      wing.scale.set(.9,.18,.52);wing.position.copy(body.position).add(new T.Vector3(-.25,1.3,side*.75));group.add(wing);
    }
  }
}

export function createGardenProduction(height,mobile){
  const group=new T.Group();group.name='garden-asset-gate';
  group.add(groundMarks(height,mobile));
  const portal=new T.Group();portal.name='garden-petal-portal';group.add(portal);
  // The 27–56 unit cream/rose procedural petals caused the large white/pink
  // ovals; runtime GLBs now form the petal corridor instead.
  const sites=[[113,-16,6,cream],[146,-64,8,cream],[164,5,6,rose],
    [190,-58,8,cream],[226,118,6,cream],[251,-6,8,cream],[279,45,7,rose]];
  for(const [x,z,r,mat] of sites)flower(group,height,x,z,mobile?r*.8:r,mat);
  const plants=mobile?34:62;
  for(let i=0;i<plants;i++){
    const x=91+random(i*3+1)*207,z=-115+random(i*3+2)*265;
    const nearCorridor=x>155&&x<239&&z>17&&z<102;
    if(nearCorridor)continue;
    leaf(group,height,x,z,2.3+random(i*3+3)*4,random(i*3+4)*Math.PI,paleGreen);
  }
  creatures(group,height,mobile);
  return group;
}
