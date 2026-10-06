import * as T from 'three';
// Same shader across the coast and later regions. Lighting yields gradually to
// the game's graphic palette well before the Ocean/Jungle mesh boundary.
export function createGroundMaterial(){
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
 material.customProgramCacheKey=()=> 'continuous-graphic-ground-v1';
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying float vGroundX;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n vGroundX=(modelMatrix*vec4(transformed,1.0)).x;');
  shader.fragmentShader='varying float vGroundX;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>',`#include <colorspace_fragment>
  #ifdef USE_COLOR
  gl_FragColor.rgb=mix(gl_FragColor.rgb,linearToOutputTexel(vec4(vColor,1.0)).rgb,smoothstep(700.0,860.0,vGroundX));
  #endif`);
 };
 return material;
}
