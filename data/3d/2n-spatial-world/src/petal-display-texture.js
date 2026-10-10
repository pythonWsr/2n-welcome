import {LinearFilter} from 'three';

const displayTextures=new WeakMap();
// These exported atlases have many tiny, tightly packed UV islands. Ordinary
// mipmaps average unrelated islands together when a petal shrinks on screen.
// Use the original pixels with linear filtering; leave ground samplers intact.
export function petalDisplayTexture(texture){
 if(!texture||texture.userData.petalDisplayAtlas)return texture;
 if(displayTextures.has(texture))return displayTextures.get(texture);
 const display=texture.clone();
 display.generateMipmaps=false;display.minFilter=LinearFilter;display.magFilter=LinearFilter;
 display.userData.petalDisplayAtlas=true;display.needsUpdate=true;
 displayTextures.set(texture,display);return display;
}
