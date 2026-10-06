import importlib.util,json,shutil,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('o',Path(__file__).with_name('optimize-petals.py'));o=importlib.util.module_from_spec(spec);spec.loader.exec_module(o)
o.VIEWS.update({'back':(0,0,-1),'back-three-quarter':(-1,.45,-1)})
root=Path(sys.argv[1]);dest=Path(sys.argv[2]);report=[]
for region in ['garden-petals','desert-petals']:
 for p in sorted((root/region).glob('*.glb')):
  name=p.stem;o.REDUCTION[name]=.75;out=dest/region/p.name;r=o.optimize(p,out,name)
  if min(r['silhouette_iou'].values())<.985:
   shutil.copy2(p,out);r['retained_previous']=True;r['web_bytes']=r['source_bytes'];r['web_triangles']=r['source_triangles'];descriptor=json.loads(p.read_bytes()[20:20+int.from_bytes(p.read_bytes()[12:16],'little')]);r['web_vertices']=sum(descriptor['accessors'][v['attributes']['POSITION']]['count'] for v in descriptor['meshes'][0]['primitives']);r['candidate_silhouette_iou']=r['silhouette_iou'];r['silhouette_iou']={view:1.0 for view in r['silhouette_iou']}
  report.append(r);print(json.dumps(r),flush=True)
(dest/'runtime-optimization-report.json').write_text(json.dumps(report,indent=2))
