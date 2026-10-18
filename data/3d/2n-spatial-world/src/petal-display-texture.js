import {LinearFilter,LinearMipmapLinearFilter} from 'three';

const displayTextures=new WeakMap(),prefilteredTextures=new WeakMap();
// These exported atlases have many tiny, tightly packed UV islands. Ordinary
// mipmaps average unrelated islands together when a petal shrinks on screen.
// Use the original pixels with linear filtering; leave ground samplers intact.
export function petalDisplayTexture(texture,{mipmaps=false}={}){
 if(!texture||(texture.userData.petalDisplayAtlas&&!!texture.userData.petalDisplayMipmaps===mipmaps))return texture;
 const cache=mipmaps?prefilteredTextures:displayTextures;
 if(cache.has(texture))return cache.get(texture);
 const display=texture.clone();
 // Rose's continuous, pink-only atlas can safely average its fine detail.
 // Fragmented multi-color atlases still use the reviewed original sampler.
 display.generateMipmaps=mipmaps;display.minFilter=mipmaps?LinearMipmapLinearFilter:LinearFilter;display.magFilter=LinearFilter;
 display.userData.petalDisplayAtlas=true;display.userData.petalDisplayMipmaps=mipmaps;display.needsUpdate=true;
 cache.set(texture,display);return display;
}
