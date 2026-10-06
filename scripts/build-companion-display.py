"""Rebuild the 14 near-field copies from user-supplied, unmodified masters.

python scripts/build-companion-display.py MASTER_DIRECTORY
Ground catalogs are never written. No subdivision, generated textures or new species.
"""
import importlib.util, json, hashlib, sys
from pathlib import Path
import vtk
spec=importlib.util.spec_from_file_location('optimizer',Path(__file__).with_name('optimize-petals.py'))
opt=importlib.util.module_from_spec(spec);spec.loader.exec_module(opt)
opt.VIEWS.update({'back':(0,0,-1),'back-three-quarter':(-1,.45,-1)})
root=Path(sys.argv[1]);repo=Path(__file__).resolve().parents[1]
dest=repo/'public/assets/companion-display';dest.mkdir(parents=True,exist_ok=True)
entries=[('garden','rose','rose'),('garden','clover','clover'),('garden','goldenleaf','golenleaf'),('desert','cactus','cactus'),('desert','sand','sand'),('desert','iris','iris'),('ocean','pearl','pearl'),('ocean','shell','shell'),('ocean','starfish','starfish'),('jungle','peas','peas'),('jungle','tomato','tomato'),('jungle','compass','compass'),('hell','darkmark','mark'),('hell','corruption','corr')]
report=[]
for kind,name,folder in entries:
    source=next((root/folder).glob('*.glb'));raw,metadata,image=opt.read_glb(source)
    master=opt.polygon(source);original=master.GetNumberOfPolys()
    # Near-field budget keeps about 32k triangles instead of 7-9k ground copies.
    magnify=vtk.vtkTransform();magnify.Scale(25,25,25)
    enlarged=vtk.vtkTransformPolyDataFilter();enlarged.SetTransform(magnify);enlarged.SetInputData(master);enlarged.Update()
    dec=vtk.vtkQuadricDecimation();dec.SetInputConnection(enlarged.GetOutputPort())
    dec.SetTargetReduction(max(0,1-32000/original));dec.AttributeErrorMetricOn()
    dec.TCoordsAttributeOn();dec.NormalsAttributeOff();dec.SetTCoordsWeight(.05);dec.Update()
    restore=vtk.vtkTransform();restore.Scale(.04,.04,.04)
    scaled=vtk.vtkTransformPolyDataFilter();scaled.SetTransform(restore);scaled.SetInputConnection(dec.GetOutputPort())
    normals=vtk.vtkPolyDataNormals();normals.SetInputConnection(scaled.GetOutputPort())
    normals.SplittingOff();normals.ConsistencyOn();normals.ComputePointNormalsOn();normals.Update()
    candidate=normals.GetOutput();candidate.GetPointData().GetNormals().SetName('NORMAL');scores=opt.compare(master,candidate)
    if min(scores.values())<.97:raise RuntimeError(f'{name}: silhouette {scores}')
    p,f,uv,n=opt.arrays(candidate)
    binary=opt.pack_glb(p,f,uv,n,image.copy(),texture_size=1024,lossless=True)
    (dest/(name+'.glb')).write_bytes(binary)
    ground=(repo/f'public/assets/{kind}-petals/{name}.glb').read_bytes()
    descriptor=json.loads(ground[20:20+int.from_bytes(ground[12:16],'little')])
    count=sum(descriptor['accessors'][primitive['indices']]['count']//3 for primitive in descriptor['meshes'][0]['primitives'])
    report.append({'kind':kind,'name':name,'source_sha256':hashlib.sha256(raw).hexdigest(),'source_triangles':original,'ground_triangles':count,'display_triangles':len(f),'display_bytes':len(binary),'texture_size':[min(1024,image.width),min(1024,image.height)],'silhouette_iou':scores})
    print(name,original,'->',len(f),len(binary),flush=True)
(dest/'report.json').write_text(json.dumps(report,indent=2)+'\n')
