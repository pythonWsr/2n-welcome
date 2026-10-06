import * as T from 'three';
import baked from './baked-petals.js';
export function geometrySignature(geometry){
 const position=geometry.getAttribute('position');
 let hash=2166136261;const bytes=new DataView(new ArrayBuffer(4));
 for(let i=0;i<position.count;i++)for(let c=0;c<3;c++){
  bytes.setFloat32(0,position.getComponent(i,c),true);
  for(let b=0;b<4;b++)hash=Math.imul(hash^bytes.getUint8(b),16777619);
 }
 return `${position.count}:${hash>>>0}`;
}
export function serializePlacement(root,asset){
 function visit(node){return {name:node.name,...(node.isInstancedMesh?{matrices:Array.from(node.instanceMatrix.array),cloneMaterial:node.material!==asset.material}:{children:node.children.map(visit)})};}
 return {signature:geometrySignature(asset.geometry),root:visit(root)};
}
export function restorePlacement(entry,asset){
 if(!entry||entry.signature!==geometrySignature(asset.geometry))return null;
 function visit(node){
  let result;
  if(node.matrices){if(node.matrices.length%16||!node.matrices.every(Number.isFinite))throw new Error('Invalid baked placement');
   result=new T.InstancedMesh(asset.geometry,node.cloneMaterial?asset.material.clone():asset.material,node.matrices.length/16);
   result.instanceMatrix.array.set(node.matrices);result.instanceMatrix.needsUpdate=true;result.computeBoundingSphere();
  }else{result=new T.Group();for(const child of node.children)result.add(visit(child));}
  result.name=node.name;return result;
 }
 try{return visit(entry.root);}catch{return null;}
}
export function restoreBakedPetals(kind,mobile,catalog,names=Object.keys(catalog),context=''){
 const entries=names.map(name=>baked[`${kind}:${mobile?'mobile':'desktop'}:${name}`]);
 if(!names.length||entries.some((entry,i)=>!entry||!catalog[names[i]]||entry.context!==context||entry.signature!==geometrySignature(catalog[names[i]].geometry)))return null;
 const groups=entries.map((entry,i)=>restorePlacement(entry,catalog[names[i]]));if(groups.some(group=>!group))return null;
 if(kind==='coast')return groups[0];
 const root=new T.Group();root.name=groups[0].name;
 for(const group of groups)for(const child of [...group.children])root.add(child);
 return root;
}
