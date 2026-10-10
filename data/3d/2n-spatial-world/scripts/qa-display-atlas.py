"""CPU UV-atlas review, not browser/Safari QA. Requires VTK, NumPy, Pillow.
Usage: python scripts/qa-display-atlas.py /absolute/output.jpg
Interpolates UVs per pixel and culls backfaces; compares atlas mip levels.
"""
import importlib.util,numpy as np
from pathlib import Path
from PIL import Image,ImageDraw
repo=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('o',repo/'scripts/optimize-petals.py');o=importlib.util.module_from_spec(s);s.loader.exec_module(o)
def render(name,side,flip=False,size=240,mip=0):
 path=repo/'public/assets/companion-display'/f'{name}.glb';p,f,uv,n=o.arrays(o.polygon(path));tex=np.array(o.read_glb(path)[2].resize((1024//2**mip,1024//2**mip),Image.Resampling.BILINEAR));side=np.array(side,float);side/=np.linalg.norm(side);up=np.array((0,1,0) if abs(side[1])<.9 else (0,0,-1),float);right=np.cross(up,side);right/=np.linalg.norm(right);up=np.cross(side,right);center=(p.max(0)+p.min(0))/2;span=np.ptp(p,axis=0).max();xy=np.c_[(p-center)@right,-(p-center)@up]*size*.82/span+size/2;z=p@side;buf=np.full((size,size),-np.inf);img=np.full((size,size,3),[28,34,36],np.uint8)
 for tri in f:
  a,b,c=xy[tri];den=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
  if den>=-1e-8:continue
  lo=np.maximum(0,np.floor(xy[tri].min(0)).astype(int));hi=np.minimum(size-1,np.ceil(xy[tri].max(0)).astype(int))
  if np.any(lo>hi):continue
  X,Y=np.meshgrid(np.arange(lo[0],hi[0]+1)+.5,np.arange(lo[1],hi[1]+1)+.5);w1=((X-a[0])*(c[1]-a[1])-(Y-a[1])*(c[0]-a[0]))/den;w2=((b[0]-a[0])*(Y-a[1])-(b[1]-a[1])*(X-a[0]))/den;w0=1-w1-w2;depth=w0*z[tri[0]]+w1*z[tri[1]]+w2*z[tri[2]];sl=(slice(lo[1],hi[1]+1),slice(lo[0],hi[0]+1));mask=(w0>=0)&(w1>=0)&(w2>=0)&(depth>buf[sl]);
  if not mask.any():continue
  U=w0*uv[tri[0],0]+w1*uv[tri[1],0]+w2*uv[tri[2],0];V=w0*uv[tri[0],1]+w1*uv[tri[1],1]+w2*uv[tri[2],1];V=1-V if flip else V;tx=np.clip((U*(tex.shape[1]-1)).astype(int),0,tex.shape[1]-1);ty=np.clip((V*(tex.shape[0]-1)).astype(int),0,tex.shape[0]-1);fx=np.clip(U*(tex.shape[1]-1),0,tex.shape[1]-1)-tx;fy=np.clip(V*(tex.shape[0]-1),0,tex.shape[0]-1)-ty;tx1=np.minimum(tx+1,tex.shape[1]-1);ty1=np.minimum(ty+1,tex.shape[0]-1);color=tex[ty,tx]*(1-fx[...,None])*(1-fy[...,None])+tex[ty,tx1]*fx[...,None]*(1-fy[...,None])+tex[ty1,tx]*(1-fx[...,None])*fy[...,None]+tex[ty1,tx1]*fx[...,None]*fy[...,None];buf[sl][mask]=depth[mask];img[sl][mask]=np.clip(color[mask],0,255).astype(np.uint8)
 return Image.fromarray(img)
if __name__=='__main__':
 import sys
 output=Path(sys.argv[1]);output.parent.mkdir(parents=True,exist_ok=True)
 sheet=Image.new('RGB',(1200,540));drawing=ImageDraw.Draw(sheet)
 for row,(name,view) in enumerate([('compass',(0,0,-1)),('tomato',(0,.16,1))]):
  for col,mip in enumerate([0,2,4,5,6]):
   sheet.paste(render(name,view,mip=mip),(240*col,270*row))
   drawing.text((240*col+8,270*row+245),name+' mip '+str(mip),fill='white')
 sheet.save(output)
 print(output)
