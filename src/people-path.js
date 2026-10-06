import * as T from 'three';
import {lookbackPose} from './lookback.js';
import {sampleCourtyard} from './people-courtyard.js';
export const PEOPLE_UNITS=36;

/** Missing people content retains the existing return shot. */
export function peoplePose(t,camera,aspect=camera.aspect,route){
 if(!route){camera.up.set(0,1,0);return lookbackPose(1,camera);}
 const pose=sampleCourtyard(route,t,aspect);
 camera.position.fromArray(pose.position);camera.up.fromArray(pose.up);camera.lookAt(new T.Vector3(...pose.target));return pose;
}
/**
 * Projects the complete local glyph rectangle through the fixed world matrix.
 * fontPixels is representative ink height: maximum individual glyph height,
 * each conservatively measured by its smaller projected vertical edge. Short
 * punctuation cannot drive sizing. Supply `glyphs` per tier for multiline
 * text; without it the single rectangle is treated as one representative glyph.
 * This is actual ink, not nominal em/fontSize; ascenders differ between fonts.
 * Bounds accept Troika's [minX,minY,maxX,maxY] or named coordinates with glyphs.
 */
export function projectTextBounds(camera, worldMatrix, glyphBounds, viewport, measureInk = true) {
  const {width, height} = viewport;
  const [minX, minY, maxX, maxY] = Array.isArray(glyphBounds) || ArrayBuffer.isView(glyphBounds)
    ? glyphBounds : [glyphBounds.minX, glyphBounds.minY, glyphBounds.maxX, glyphBounds.maxY];
  if (![width, height].every(v => Number.isFinite(v) && v > 0) ||
      ![minX, minY, maxX, maxY].every(Number.isFinite) || maxX < minX || maxY < minY) {
    throw new RangeError('viewport and glyph bounds must be finite and ordered');
  }
  camera.updateMatrixWorld();
  let valid = true;
  const points = [];
  for (const x of [minX, maxX]) for (const y of [minY, maxY]) {
    const world = new T.Vector3(x, y, 0).applyMatrix4(worldMatrix);
    const depth = -world.clone().applyMatrix4(camera.matrixWorldInverse).z;
    valid &&= depth > camera.near && depth < camera.far;
    const p = world.project(camera);
    points.push(new T.Vector2((p.x + 1) * width / 2, (1 - p.y) * height / 2));
  }
  const left = Math.min(...points.map(p => p.x)), right = Math.max(...points.map(p => p.x));
  const top = Math.min(...points.map(p => p.y)), bottom = Math.max(...points.map(p => p.y));
  const rect = {x: left, y: top, width: right - left, height: bottom - top};
  const finite = [...points.flatMap(p => p.toArray())].every(Number.isFinite);
  const glyphs = measureInk ? glyphBounds.glyphs : null;
  const fontPixels = finite && valid ? (glyphs?.length
    ? Math.max(...glyphs.map(glyph => projectTextBounds(camera, worldMatrix, glyph, viewport).fontPixels))
    : Math.min(points[0].distanceTo(points[1]), points[2].distanceTo(points[3]))) : 0;
  return {rect, fontPixels,
    fits: finite && valid && left >= width * .12 && right <= width * .88 && top >= height * .30 && bottom <= height * .70};
}
