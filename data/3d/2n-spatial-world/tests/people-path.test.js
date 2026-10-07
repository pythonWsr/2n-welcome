import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {lookbackPose} from '../src/lookback.js';
import {createPeopleRoute} from '../src/people-courtyard.js';

const api = await import('../src/people-path.js').catch(() => ({}));
const camera = (aspect = 414 / 896) => new T.PerspectiveCamera(48, aspect, .2, 2400);
const requireApi = () => assert.equal(typeof api.peoplePose, 'function', 'people chapter is not implemented');
const distance = (a, b) => new T.Vector3(...a).distanceTo(new T.Vector3(...b));

// Catches ignoring the shared route, orientation seams and stateful seek smoothing.
test('shared courtyard camera joins lookback and frames every reading anchor on resized viewports', () => {
  const route = createPeopleRoute({leaders: [{id: 'a', name: 'A'}], members: ['B', 'C']});
  for (const [width, height] of [[414,896], [390,844], [320,568], [896,414]]) {
    const cam = camera(width / height), old = camera(width / height);
    const expected = lookbackPose(1, old);
    const start = api.peoplePose(0, cam, cam.aspect, route);
    assert.deepEqual(start.position, expected.position);
    assert.ok(cam.quaternion.angleTo(old.quaternion) < 1e-6);
    for (const window of route.windows.slice(1, -1)) {
      const t = (window.readStart + window.readEnd) / 2;
      const pose = api.peoplePose(t, cam, cam.aspect, route);
      cam.updateMatrixWorld();
      const p = new T.Vector3(...route.stations[window.stationIndex].position).project(cam);
      assert.ok(Math.abs(p.x) < 1e-6 && Math.abs(p.y) < 1e-6);
      assert.ok([...pose.position, ...pose.target, ...pose.up, ...cam.quaternion.toArray()].every(Number.isFinite));
      const saved = cam.quaternion.toArray();
      api.peoplePose(1, cam, cam.aspect, route);
      assert.deepEqual(api.peoplePose(t, cam, cam.aspect, route), pose);
      assert.deepEqual(cam.quaternion.toArray(), saved);
    }
  }
});

// Catches center-only projection, nominal font-size substitution and clipping acceptance.
test('full glyph projection reports CSS bounds and minimum visible glyph height', () => {
  assert.equal(typeof api.projectTextBounds, 'function');
  const cam = new T.PerspectiveCamera(90, 1, .1, 100);
  cam.updateMatrixWorld();
  const matrix = new T.Matrix4().makeTranslation(0, 0, -10);
  const bounds = {minX: -2, maxX: 2, minY: -1, maxY: 1};
  const projected = api.projectTextBounds(cam, matrix, bounds, {width: 100, height: 100});
  assert.ok(Math.abs(projected.rect.x - 40) < 1e-8);
  assert.ok(Math.abs(projected.rect.width - 20) < 1e-8);
  assert.ok(Math.abs(projected.fontPixels - 10) < 1e-8);
  assert.equal(projected.fits, true);
  const large = api.projectTextBounds(cam, matrix, {...bounds, maxX: 10}, {width:100,height:100});
  assert.equal(large.fits, false);
  assert.equal(api.projectTextBounds(cam, new T.Matrix4().makeTranslation(0,0,1), bounds, {width:100,height:100}).fits, false);
  const punctuation = api.projectTextBounds(cam, matrix, {...bounds, glyphs: [[-2,-1,0,1], [1,-1,2,-.8]]}, {width:100,height:100});
  assert.ok(Math.abs(punctuation.fontPixels-10) < 1e-8, 'short punctuation changed representative ink height');
  const multiline = api.projectTextBounds(cam, matrix, {minX:-2,maxX:2,minY:-3,maxY:3,glyphs:[[-2,-3,0,-1],[0,1,2,3]]}, {width:100,height:100});
  assert.ok(Math.abs(multiline.fontPixels-10) < 1e-8, 'block height substituted for individual glyph height');
});

test('missing route holds the old return pose on random and reverse seeks',()=>{
 const old=lookbackPose(1,camera());for(const t of [0,.5,1,.1])assert.deepEqual(api.peoplePose(t,camera()),old);
});
