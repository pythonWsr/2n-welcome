import importlib.util,json,sys
from pathlib import Path
import numpy as np
import vtk
from vtk.util.numpy_support import vtk_to_numpy,numpy_to_vtk
from PIL import Image,ImageDraw
spec=importlib.util.spec_from_file_location('optimizer',Path(__file__).with_name('optimize-petals.py'));o=importlib.util.module_from_spec(spec);spec.loader.exec_module(o)
names=sys.argv[3:] or ['pearl','shell','starfish','compass','bur','peas','tomato']
o.VIEWS.update({'back':(0,0,-1),'back-three-quarter':(-1,.45,-1)})
root=Path(sys.argv[1]);dest=Path(sys.argv[2]);dest.mkdir(parents=True,exist_ok=True);reports=[]
for name in names:
 o.REDUCTION[name]=.92
 p=root/name/(name+'.glb');out=dest/(name+'.glb');r=o.optimize(p,out,name);reports.append(r)
 poly=o.polygon(out);positions,faces,uv,normals=o.arrays(poly);_,_,im=o.read_glb(out);tex=np.array(im.convert('RGB'));center=(positions.max(axis=0)+positions.min(axis=0))/2;span=float(np.max(np.ptp(positions,axis=0)))
 sheet=Image.new('RGB',(960,690),(32,39,46));draw=ImageDraw.Draw(sheet);draw.text((15,8),name+' / '+str(r['web_triangles'])+' triangles / CPU texture preview',fill='white')
 for i,(label,d) in enumerate(o.VIEWS.items()):
  forward=np.array(d,dtype=float);forward/=np.linalg.norm(forward);up=np.array((0,0,-1) if label=='top' else (0,1,0),dtype=float);right=np.cross(up,forward);right/=np.linalg.norm(right);up=np.cross(forward,right)
  xy=np.stack(((positions-center)@right,(positions-center)@up),axis=1)*(.82*320/span);xy[:,0]+=160;xy[:,1]=160-xy[:,1];depth=(positions-center)@forward
  pixels=np.full((320,320,3),(32,39,46),dtype=np.uint8);zbuf=np.full((320,320),-np.inf)
  for ids in faces:
   a,b,c=xy[ids];area=np.cross(b-a,c-a)
   if abs(area)<1e-9:continue
   lo=np.maximum(0,np.floor(np.min([a,b,c],axis=0)).astype(int));hi=np.minimum(319,np.ceil(np.max([a,b,c],axis=0)).astype(int))
   if np.any(lo>hi):continue
   yy,xx=np.mgrid[lo[1]:hi[1]+1,lo[0]:hi[0]+1];px=xx+.5;py=yy+.5
   u=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/area;v=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/area;w=1-u-v
   z=u*depth[ids[0]]+v*depth[ids[1]]+w*depth[ids[2]];mask=(u>=0)&(v>=0)&(w>=0)&(z>zbuf[yy,xx])
   if not mask.any():continue
   tu=u*uv[ids[0],0]+v*uv[ids[1],0]+w*uv[ids[2],0];tv=u*uv[ids[0],1]+v*uv[ids[1],1]+w*uv[ids[2],1];tx=np.clip((tu*tex.shape[1]).astype(int),0,tex.shape[1]-1);ty=np.clip((tv*tex.shape[0]).astype(int),0,tex.shape[0]-1)
   pixels[yy[mask],xx[mask]]=tex[ty[mask],tx[mask]];zbuf[yy[mask],xx[mask]]=z[mask]
  x=(i%3)*320;y=35+(i//3)*325;sheet.paste(Image.fromarray(pixels),(x,y));draw.text((x+10,y+5),label,fill='white')
 sheet.save(dest/(name+'-six-views.jpg'),quality=90);print(json.dumps(r),flush=True)
(dest/'web-asset-report.json').write_text(json.dumps(reports,indent=2))
