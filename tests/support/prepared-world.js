import assert from 'node:assert/strict';
import {createBiomes} from '../../src/biomes.js';

export async function preparedWorld(scene,mobile){
  const world=createBiomes(scene,mobile);
  world.prepare();
  for(let i=0;i<50&&world.groundStatus!=='ready';i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(world.groundStatus,'ready');
  return world;
}
