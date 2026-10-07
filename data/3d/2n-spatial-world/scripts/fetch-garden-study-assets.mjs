import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';

// Poly Haven publishes CC0 source models. Assets are checked into this experiment;
// the live page never calls the Poly Haven API or pulls third-party runtime URLs.
const destination=resolve('public/assets/garden-study');
const userAgent='2n-GardenArtStudy/0.1 (asset provenance: github.com/Llhleo/2n-spatial-world)';
const request=url=>execFileSync('curl',['-fsSL','--retry','2','--max-time','90','-H',`User-Agent: ${userAgent}`,url],{maxBuffer:12*1024*1024});
function acquire(record,path){
  if(!record?.url?.startsWith('https://dl.polyhaven.org/file/ph-assets/'))throw Error(`Unexpected asset URL: ${record?.url}`);
  const output=join(destination,path);
  if(!output.startsWith(destination+'/'))throw Error('Asset path escapes destination');
  mkdirSync(dirname(output),{recursive:true});
  if(!existsSync(output)||createHash('md5').update(readFileSync(output)).digest('hex')!==record.md5){
    const bytes=request(record.url);
    if(createHash('md5').update(bytes).digest('hex')!==record.md5)throw Error(`Hash mismatch: ${path}`);
    writeFileSync(output,bytes);
  }
  console.log(`${path}: ${record.size} bytes`);
}
for(const id of ['rock_face_01','rock_moss_set_01','fern_02']){
  const file=JSON.parse(request(`https://api.polyhaven.com/files/${id}`));
  const main=file.gltf?.['1k']?.gltf;
  if(!main)throw Error(`Missing 1k glTF: ${id}`);
  acquire(main,`${id}/${id}_1k.gltf`);
  for(const [relative,dependency] of Object.entries(main.include??{}))acquire(dependency,`${id}/${relative}`);
}
const ground=JSON.parse(request('https://api.polyhaven.com/files/forrest_ground_01'));
acquire(ground.Diffuse['1k'].jpg,'ground/forest_diff_1k.jpg');
acquire(ground.nor_gl['1k'].jpg,'ground/forest_nor_gl_1k.jpg');
