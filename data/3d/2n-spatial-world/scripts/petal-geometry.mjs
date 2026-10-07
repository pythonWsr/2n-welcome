import {readFileSync} from 'node:fs';
import * as T from 'three';
// These source GLBs have a single mesh with ordinary float POSITION accessors.
// Respect buffer offsets/stride rather than depending on contiguous arrays.
export function readPetalGeometry(path){
 const buffer=readFileSync(path),length=buffer.readUInt32LE(12),json=JSON.parse(buffer.subarray(20,20+length));
 const accessor=json.accessors[json.meshes[0].primitives[0].attributes.POSITION],view=json.bufferViews[accessor.bufferView];
 if(accessor.componentType!==5126||accessor.type!=='VEC3'||accessor.sparse)throw new Error(`Unsupported POSITION: ${path}`);
 const start=28+length+(view.byteOffset||0)+(accessor.byteOffset||0),stride=view.byteStride||12,values=new Float32Array(accessor.count*3);
 for(let i=0;i<accessor.count;i++)for(let c=0;c<3;c++)values[i*3+c]=buffer.readFloatLE(start+i*stride+c*4);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(values,3));
 return new T.Mesh(geometry,new T.MeshStandardMaterial());
}
