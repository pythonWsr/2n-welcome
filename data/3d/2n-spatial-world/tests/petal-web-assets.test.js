import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const names=['glass','leaf','rose','clover','rock','goldenleaf'];

for(const name of names){
  test(`${name} Web asset retains textured volume under a mobile geometry budget`,()=>{
    const bytes=readFileSync(new URL(`../public/assets/garden-petals/${name}.glb`,import.meta.url));
    assert.ok(bytes.length<2_600_000,`${name} weighs ${bytes.length} bytes`);
    const jsonLength=bytes.readUInt32LE(12);
    const gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
    const primitive=gltf.meshes[0].primitives[0];
    assert.equal(gltf.meshes.length,1);
    assert.equal(gltf.nodes.length,1);
    assert.ok(gltf.accessors[primitive.indices].count/3<40_000);
    assert.ok(gltf.accessors[primitive.attributes.POSITION].count<45_000);
    assert.ok(primitive.attributes.NORMAL!==undefined);
    assert.ok(primitive.attributes.TEXCOORD_0!==undefined);
    assert.ok(gltf.materials[0].pbrMetallicRoughness.baseColorTexture);
  });
}
