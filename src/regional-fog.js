import * as T from 'three';
const forest=new T.Color(0x306d38),hell=new T.Color(0x963333);
export function regionalFogColor(x,base){return base.clone().lerp(forest,T.MathUtils.smoothstep(x,795,930)).lerp(hell,T.MathUtils.smoothstep(x,1195,1305));}
export const regionalFogWeight=(x,factor)=>Math.min(factor,T.MathUtils.lerp(1,.78,T.MathUtils.smoothstep(x,795,930)));
// Clone materials: Golden Leaf/Rock still share their unchanged Garden originals.
export function withRegionalFog(original){
 const material=original.clone();material.customProgramCacheKey=()=> original.customProgramCacheKey()+'-regional-biome-fog-v1';
 material.onBeforeCompile=shader=>{
  original.onBeforeCompile(shader);
  shader.uniforms.forestFog={value:forest};shader.uniforms.hellFog={value:hell};
  shader.vertexShader='varying float vBiomeX;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
 vec4 biomePosition=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 biomePosition=instanceMatrix*biomePosition;
 #endif
 vBiomeX=(modelMatrix*biomePosition).x;`);
  shader.fragmentShader='varying float vBiomeX;\nuniform vec3 forestFog;\nuniform vec3 hellFog;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#ifdef USE_FOG
 #ifdef FOG_EXP2
 float fogFactor=1.0-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);
 #else
 float fogFactor=smoothstep(fogNear,fogFar,vFogDepth);
 #endif
 vec3 biomeFog=mix(fogColor,forestFog,smoothstep(795.0,930.0,vBiomeX));
 biomeFog=mix(biomeFog,hellFog,smoothstep(1195.0,1305.0,vBiomeX));
 fogFactor=min(fogFactor,mix(1.0,.78,smoothstep(795.0,930.0,vBiomeX)));
 gl_FragColor.rgb=mix(gl_FragColor.rgb,biomeFog,fogFactor);
 #endif`);
 };
 return material;
}
export function applyRegionalFog(object){object.traverse(mesh=>{if(mesh.isMesh&&!mesh.userData.regionalFog){mesh.material=withRegionalFog(mesh.material);mesh.userData.regionalFog=true;}});return object;}
