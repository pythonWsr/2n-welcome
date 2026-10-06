import * as T from 'three';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';

// Authored silhouettes, not a swept centreline: corners remain actual corners.
export function sculptureShapes() {
  const two = new T.Shape();
  two.moveTo(-24,18);
  two.lineTo(-24,28);two.lineTo(-15,38);two.lineTo(5,38);
  two.lineTo(16,28);two.lineTo(16,20);
  two.bezierCurveTo(16,14,12,10,5,3);
  two.lineTo(-15,-20);
  two.lineTo(17,-20);
  two.lineTo(17,-29);
  two.lineTo(-24,-29);
  two.lineTo(-24,-20);
  two.lineTo(-2,5);
  two.bezierCurveTo(5,12,7,16,7,22);
  two.lineTo(7,25);two.lineTo(2,29);two.lineTo(-11,29);
  two.lineTo(-15,24);two.lineTo(-15,18);
  two.closePath();

  const n = new T.Shape();
  n.moveTo(18.4,20); n.lineTo(18.4,44);
  n.lineTo(23.8,44); n.lineTo(23.8,40.5);
  n.lineTo(27.5,44); n.lineTo(33.5,44);
  n.lineTo(40.6,38);
  n.lineTo(40.6,20); n.lineTo(35.2,20); n.lineTo(35.2,36);
  n.lineTo(32.2,39);
  n.lineTo(28.2,39); n.lineTo(23.8,35.2); n.lineTo(23.8,20);
  n.closePath();
  return {two,n};
}

export function cutSolid(shape, depth) {
  // Four contour stations describe a tapered architectural mass. Front and rear
  // are differently pitched planes; depth is designed rather than font extrusion.
  let contour=shape.getPoints(36);contour.pop();
  if(!T.ShapeUtils.isClockWise(contour))contour.reverse();
  const center=contour.reduce((a,p)=>a.add(p),new T.Vector2()).multiplyScalar(1/contour.length);
  const count=contour.length,vertices=[],indices=[];
  const stations=[{s:.96,z:-depth/2},{s:1,z:-depth/2+.24},{s:1,z:depth/2-.24},{s:.988,z:depth/2}];
  for(let r=0;r<stations.length;r++)for(const p of contour){
    const {s,z}=stations[r];
    const pitch=r<2?-.018*(p.y-center.y):.065*(p.y-center.y)+.025*(p.x-center.x);
    vertices.push(center.x+(p.x-center.x)*s,center.y+(p.y-center.y)*s,z+pitch);
  }
  for(let r=0;r<3;r++)for(let i=0;i<count;i++){
    const j=(i+1)%count,a=r*count+i,b=r*count+j,c=(r+1)*count+i,d=(r+1)*count+j;
    indices.push(a,c,b,b,c,d);
  }
  const faces=T.ShapeUtils.triangulateShape(contour,[]);
  for(const [a,b,c] of faces){indices.push(c,b,a);indices.push(a+3*count,b+3*count,c+3*count);}
  let geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
  geometry=toCreasedNormals(geometry,Math.PI/7);
  geometry.setIndex(Array.from({length:geometry.attributes.position.count},(_,i)=>i));
  geometry.userData={construction:'pitched-contour-loft',stations:4};
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
