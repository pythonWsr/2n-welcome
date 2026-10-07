import * as T from 'three';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
const clay=new T.MeshStandardMaterial({color:0x999999,roughness:1,metalness:0});

// Each component is an authored spatial mass. No font or ExtrudeGeometry.
function mass(points,depth,name){
  const contour=points.map(p=>new T.Vector2(p[0],p[1]));
  const faces=T.ShapeUtils.triangulateShape(contour,[]),count=points.length;
  const v=points.flat().concat(points.flatMap(p=>[p[0],p[1],p[2]-depth]));
  const idx=[];for(const [a,b,c] of faces)idx.push(a,b,c,c+count,b+count,a+count);
  const clockwise=T.ShapeUtils.isClockWise(contour);
  for(let i=0;i<count;i++){
    const j=(i+1)%count;
    const side=[i,i+count,j,j,i+count,j+count];
    idx.push(...(clockwise?side.reverse():side));
  }
  let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);
  g=toCreasedNormals(g,.35);g.computeBoundingBox();
  const m=new T.Mesh(g,clay);m.name=name;return m;
}
function slab(poly,z,depth,name){return mass(poly.map(([x,y])=>[x,y,z]),depth,name);}
function column(x,y,w,h,z,d,name){return slab([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],z,d,name);}
function portal(group,kind,refined=false){
  const front=kind==='C'?1:-4;
  if(refined){
    group.add(column(26,19,5,23,1,12,'deep-left-pier'));
    group.add(column(42,19,5,18,-2,8,'recessed-right-pier'));
    group.add(mass([[31,35,1],[47,35,-2],[47,40,-2],[31,42,1]],8,'tapered-lintel'));
    return;
  }
  group.add(column(26,19,5,23,front,kind==='A'?12:7,'left-pier'));
  group.add(column(42,19,5,19,front-3,8,'right-pier'));
  group.add(mass([[30,34,front],[47,34,front-3],[47,41,front-3],[30,41,front]],kind==='A'?12:7,'lintel'));
}
export function makeModel(kind,refined=false){
  const root=new T.Group(),two=new T.Group(),n=new T.Group();two.name='two';n.name='superscript-n';root.add(two,n);
  if(kind==='A'){
    // Carved monolith: broad cap and load-bearing foot enclose a diagonal void.
    two.add(slab([[-24,20],[-24,35],[13,35],[22,28],[22,15],[-8,-18],[23,-18],[23,-31],[-26,-31],[-26,-19],[8,18],[8,23],[-11,23],[-11,20]],3,18,'carved-monolith'));
  two.add(column(-26,-35,49,4,3,24,'foundation-plinth'));
  }else if(kind==='B'){
    // A folded solid blade: clean planes deliberately turn in depth at each fold.
    two.add(mass([[-24,24,6],[-24,34,6],[18,34,-1],[18,24,-1]],7,'cantilever-cap'));
    two.add(mass([[9,24,-1],[18,24,-1],[18,15,1],[9,11,1]],7,'return'));
  two.add(mass([[18,15,1],[9,15,1],[-24,-20,7],[-12,-20,7]],7,'diagonal-blade'));
    two.add(mass([[-24,-20,7],[-12,-20,7],[22,-20,7],[22,-29,3],[-24,-29,3]],10,'folded-foot'));
    two.add(column(-24,20,7,4,6,7,'cut-terminal'));
  }else{
    // Structure: cap, return, diagonal web and a deep footing occupy separate planes.
    two.add(column(-24,27,43,8,3,13,'roof-slab'));
    two.add(column(-24,20,7,7,3,13,'left-abutment'));
    two.add(column(11,13,8,14,3,13,'right-return'));
    const web=refined?9:7;
    two.add(mass([[19,15,1],[19-web,15,1],[-25,-21,7],[-25+web,-21,7]],refined?9:6,'diagonal-web'));
    two.add(column(-25,-31,49,10,8,22,'deep-footing'));
  }
  portal(n,kind,refined);
  if(kind==='B')n.rotation.y=-.06;
  return root;
}
export const views={front:[[9,3,145],[9,3,0]],quarter:[[102,40,105],[8,4,-3]],low:[[-36,-46,112],[4,5,-2]],close:[[-49,-19,46],[-13,-19,-3]]};
