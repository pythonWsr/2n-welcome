import * as T from 'three';
import {writeFileSync} from 'node:fs';
import {studyModel} from './geometry.js';
// Offline geometry review: CPU z-buffer with grey diffuse studio shading.
// Not a WebGL/PBR or performance acceptance image.
const shots={front:[[7,6,130],[7,6,0]],low:[[-40,-48,100],[0,5,0]],quarter:[[100,45,100],[7,5,-3]],close:[[-27,-22,20],[-13,-20,-3]]};
const width=640,height=640,model=studyModel();model.updateMatrixWorld(true);
for(const [name,[position,target]] of Object.entries(shots)){
  const camera=new T.PerspectiveCamera(45,1,.1,600);camera.position.fromArray(position);camera.lookAt(...target);camera.updateMatrixWorld(true);
  const pixels=Buffer.alloc(width*height*3,222),depth=new Float64Array(width*height).fill(Infinity);
  const key=new T.Vector3(-.5,.8,1).normalize();
  model.traverse(mesh=>{if(!mesh.isMesh)return;const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,projected=[];
    for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).project(camera);projected.push([(v.x*.5+.5)*width,(.5-v.y*.5)*height,v.z]);}
    const total=g.index?.count??p.count;
    for(let i=0;i<total;i+=3){const ids=[0,1,2].map(j=>g.index?g.index.getX(i+j):i+j),[a,b,c]=ids.map(j=>projected[j]);
      if([a,b,c].some(v=>v[2]<-1||v[2]>1))continue;
      const area=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(area)<1e-8)continue;
      const normal=new T.Vector3();ids.forEach(j=>normal.add(new T.Vector3().fromBufferAttribute(n,j)));normal.normalize();
      const shade=Math.round(255*Math.min(.82,.29+.39*Math.max(0,normal.dot(key))+.08*(normal.y*.5+.5)));
      const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0])));
      const y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/area;
        const v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/area,w=1-u-v;
        if(Math.min(u,v,w)<0)continue;const z=u*a[2]+v*b[2]+w*c[2],k=y*width+x;
        if(z<depth[k]){depth[k]=z;pixels.fill(shade,k*3,k*3+3);}
      }
    }
  });
  writeFileSync(new URL(`./${name}.ppm`,import.meta.url),Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`),pixels]));
}
