import * as T from 'three';

const moss=new T.Color(0x354339),chalk=new T.Color(0x62645a),shadow=new T.Color(0x333c36);

// Three sculpted shelves define a sheltered valley and an open line of travel.
// Their vertices follow the same height field as the ground, with no detached slabs.
export function createStoneGarden(groundHeight){
  const group=new T.Group();group.name='garden-sculpted-landscape';
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0,side:T.DoubleSide});
  for(const [x0,x1,z0,zSlope,width,height,seed] of [
    [115,264,-76,.12,24,19,0],
    [132,255,36,-.08,18,13,1],
    [190,287,-115,.07,28,11,2]
  ]){
    const positions=[],colors=[],indices=[],steps=80,cross=20,c=new T.Color();
    for(let i=0;i<=steps;i++){
      const t=i/steps,x=x0+(x1-x0)*t;
      const envelope=Math.pow(Math.sin(Math.PI*t),.7),center=z0+zSlope*(x-x0)+Math.sin(t*Math.PI*2+seed)*3;
      for(let j=0;j<=cross;j++){
        const f=j/cross*2-1,z=center+f*width;
        const shoulder=Math.pow(Math.max(0,1-f*f),1.7),fold=.85+.15*Math.cos(x*.105+f*3+seed);
        const crest=envelope*height*shoulder*fold;
        positions.push(x,groundHeight(x,z)+crest,z);
        const striation=.047*Math.sin(x*.34+f*11)+.025*Math.sin(x*.095-f*17);
        c.copy(chalk).lerp(moss,Math.max(0,1-Math.abs(f))* .36).lerp(shadow,Math.max(0,-f)*.25);
        c.offsetHSL(0,0,striation);colors.push(c.r,c.g,c.b);
        if(i<steps&&j<cross){const a=i*(cross+1)+j;indices.push(a,a+1,a+cross+1,a+1,a+cross+2,a+cross+1);}
      }
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    group.add(new T.Mesh(geometry,material));
  }
  // The single vertical landmark anchors the long shot and the near pass.
  // Its changing section reads as layered weathered stone rather than a primitive.
  const x=211,z=-78,rings=[
    [0,11,0],[2,12,.5],[6,11.3,-.3],[9,10.8,1.1],
    [14,10.1,-.4],[18,9.3,1.4],[23,9.6,1],[27,7.9,.3],
    [32,8.3,-.8],[36,7.4,-1.2],[40,6.6,-1.6],[44,4.8,-2]
  ];
  const points=[],colors=[],index=[],sides=18,col=new T.Color();
  for(let i=0;i<rings.length;i++)for(let j=0;j<sides;j++){
    const a=j/sides*Math.PI*2,[y,r,twist]=rings[i];
    const shape=1+.065*Math.sin(a*5+i*.8)+.035*Math.cos(a*9-i*.5);
    const px=x+Math.cos(a)*r*shape+twist,pz=z+Math.sin(a)*r*.72*shape;
    points.push(px,groundHeight(x,z)+y,pz);
    col.copy(chalk).lerp(shadow,.18+.13*Math.sin(a*3+i*.48));
    col.offsetHSL(0,0,.035*Math.sin(y*1.25+a*2));colors.push(col.r,col.g,col.b);
    if(i<rings.length-1){const a0=i*sides+j,b0=i*sides+(j+1)%sides;index.push(a0,b0,a0+sides,b0,b0+sides,a0+sides);}
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(index);geometry.computeVertexNormals();
  group.add(new T.Mesh(geometry,material));
  return group;
}
