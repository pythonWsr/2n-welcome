import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
const repo=new URL('../',import.meta.url),out=new URL('public/assets/model-transport/',repo),entries={};mkdirSync(out,{recursive:true});
let original=0,compressed=0;
for(const folder of ['companion-display','map-flowers'])for(const name of readdirSync(new URL(`public/assets/${folder}/`,repo)).filter(n=>n.endsWith('.glb'))){
 const raw=readFileSync(new URL(`public/assets/${folder}/${name}`,repo)),sha256=createHash('sha256').update(raw).digest('hex'),packed=gzipSync(raw,{level:9,mtime:0});
 if(!gunzipSync(packed).equals(raw))throw new Error('Lossless model roundtrip failed');
 const filename=`${folder}-${name.slice(0,-4)}-${sha256.slice(0,16)}.glb.gz`;
 writeFileSync(new URL(filename,out),packed);entries[`assets/${folder}/${name}`]={url:`assets/model-transport/${filename}`,sha256,bytes:raw.length};original+=raw.length;compressed+=packed.length;
}
writeFileSync(new URL('src/transport-manifest.js',repo),`// Generated immutable lossless transport descriptors.\nexport default ${JSON.stringify(entries)};\n`);
console.log(JSON.stringify({models:Object.keys(entries).length,original,compressed,savedPercent:Math.round((1-compressed/original)*1000)/10}));
