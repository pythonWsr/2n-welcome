import * as T from 'three';
import {toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';

export function silhouettes(){
  const two=new T.Shape();
  // A clean cut at the left terminal, a continuous crown, a tensioned diagonal.
  two.moveTo(-25,20);two.lineTo(-25,26);
  two.bezierCurveTo(-24,35,-15,39,-5,39);
  two.bezierCurveTo(9,39,18,33,18,24);
  two.bezierCurveTo(18,16,10,10,2,1);
  two.lineTo(-13,-20);two.lineTo(19,-20);two.lineTo(19,-30);
  two.lineTo(-25,-30);two.lineTo(-25,-21);
  two.lineTo(-5,5);two.bezierCurveTo(1,13,7,18,7,23);
  two.bezierCurveTo(7,28,2,30,-6,30);
  two.bezierCurveTo(-14,30,-17,27,-17,23);
  two.lineTo(-17,20);two.closePath();
  const n=new T.Shape();
  // Independent portal: unequal piers and a sloping lintel, not an arch.
  n.moveTo(23,21);n.lineTo(23,45);n.lineTo(29,45);n.lineTo(29,40);
  n.lineTo(35,43);n.lineTo(46,43);n.lineTo(46,21);
  n.lineTo(40,21);n.lineTo(40,36);n.lineTo(35,38);n.lineTo(29,34);
  n.lineTo(29,21);n.closePath();
  return {two,n};
}

export function studyModel(){
  const group=new T.Group(),shapes=silhouettes();
  const material=new T.MeshStandardMaterial({color:0x999999,roughness:1,metalness:0});
  for(const [name,shape] of Object.entries(shapes)){
    // Broad front plane with a narrow machined rim; rear depth grows at the foot.
    let outline=shape.getPoints(32);outline.pop();
    if(!T.ShapeUtils.isClockWise(outline))outline.reverse();
    const count=outline.length,positions=[],indices=[];
    const center=name==='two'?new T.Vector2(-3,3):new T.Vector2(34,33);
    const depth=y=>name==='two'?7+8*(1-T.MathUtils.smoothstep(y,-30,-13)):8+3*(1-T.MathUtils.smoothstep(y,21,38));
    // Crown projects forward; diagonal recedes into the deeper supporting foot.
    // This changes the mass in space without decorating the face with panels.
    const frontAt=y=>name==='two'?2+.065*(y+30):-3;
    for(let ring=0;ring<4;ring++)for(const p of outline){
      const inward=ring===0||ring===3?.10:0;
      const direction=center.clone().sub(p).normalize();
      const front=frontAt(p.y);
      const z=ring<2?front-depth(p.y)+(ring===1?.12:0):front-(ring===2?.12:0);
      positions.push(p.x+direction.x*inward,p.y+direction.y*inward,z);
    }
    for(let r=0;r<3;r++)for(let i=0;i<count;i++){
      const j=(i+1)%count,a=r*count+i,b=r*count+j,c=a+count,d=b+count;
      indices.push(a,c,b,b,c,d);
    }
    for(const [a,b,c] of T.ShapeUtils.triangulateShape(outline,[]))indices.push(c,b,a,a+3*count,b+3*count,c+3*count);
    let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);
    g=toCreasedNormals(g,Math.PI/8);g.computeBoundingBox();
    const mesh=new T.Mesh(g,material);mesh.name=name;group.add(mesh);
  }
  return group;
}
