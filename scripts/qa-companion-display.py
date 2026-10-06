"""CPU geometry/texture comparison, NOT browser or Safari performance QA."""
import importlib.util,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
spec=importlib.util.spec_from_file_location('qa',Path(__file__).with_name('qa-petals.py'));qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
repo=Path(__file__).resolve().parents[1]
sheet=Image.new('RGB',(960,810),(17,23,22));draw=ImageDraw.Draw(sheet)
for row,(kind,name) in enumerate([('garden','rose'),('ocean','shell'),('hell','darkmark')]):
 for version,folder in enumerate([f'{kind}-petals','companion-display']):
  path=repo/f'public/assets/{folder}/{name}.glb';poly=qa.opt.polygon(path);p=qa.opt.arrays(poly)[0];center=(p.min(axis=0)+p.max(axis=0))/2;span=float(np.max(np.ptp(p,axis=0)))
  for view,direction in enumerate([(0,0,1),(1,.4,1)]):
   image=qa.render(poly,qa.source_texture(path),direction,center,span);x=(version*2+view)*240;y=row*270
   sheet.paste(image,(x,y));draw.text((x+8,y+242),f'{name} {"GROUND" if version==0 else "DISPLAY"}',fill=(229,230,214))
output=repo/'studies/companion-display';output.mkdir(parents=True,exist_ok=True);sheet.save(output/'geometry-texture-comparison.jpg')
