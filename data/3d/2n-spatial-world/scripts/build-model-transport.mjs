import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const repo=new URL('../',import.meta.url),out=new URL('public/assets/model-transport/',repo),entries={};mkdirSync(out,{recursive:true});
let original=0,compressed=0;
for(const folder of ['companion-display','map-flowers','garden-petals','desert-petals','ocean-petals','jungle-petals','hell-petals'])for(const name of readdirSync(new URL(`public/assets/${folder}/`,repo)).filter(n=>n.endsWith('.glb'))){
 const raw=readFileSync(new URL(`public/assets/${folder}/${name}`,repo)),sha256=createHash('sha256').update(raw).digest('hex'),packed=gzipSync(raw,{level:9,mtime:0});
 if(!gunzipSync(packed).equals(raw))throw new Error('Lossless model roundtrip failed');
 const filename=`${folder}-${name.slice(0,-4)}-${sha256.slice(0,16)}.glb.gz`;
 writeFileSync(new URL(filename,out),packed);entries[`assets/${folder}/${name}`]={url:`assets/model-transport/${filename}`,sha256,bytes:raw.length};original+=raw.length;compressed+=packed.length;
}
console.log(JSON.stringify({models:Object.keys(entries).length,original,compressed,savedPercent:Math.round((1-compressed/original)*1000)/10}));

let commit=process.env.CF_PAGES_COMMIT_SHA||process.env.VERCEL_GIT_COMMIT_SHA||process.env.GITHUB_SHA;
if(!commit){try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',cwd:repo}).trim();}catch{commit='unknown';}}
// Immutable Git URLs change with every deployment; never rely on branch-cache expiry.
if(/^[a-f0-9]{40}$/i.test(commit))for(const [path,entry] of Object.entries(entries))entry.rawMirror=`https://cdn.jsdelivr.net/gh/Llhleo/2n-spatial-world@${commit}/public/${path}`;
writeFileSync(new URL('src/transport-manifest.js',repo),`// Generated immutable lossless transport descriptors.\nexport default ${JSON.stringify(entries)};\n`);
writeFileSync(new URL('public/release.json',repo),JSON.stringify({commit,models:Object.keys(entries).length}));
