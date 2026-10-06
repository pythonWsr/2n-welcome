import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as courtyard from '../src/people-courtyard.js';
import {lookbackPose, FLOWER_SPECS, readingQuaternion} from '../src/lookback.js';

// Catches C0-only segment joins, stationary read shots, and instantaneous roll correction.
test('camera derivatives and opacity remain continuous at every interval boundary', () => {
  const route = courtyard.createPeopleRoute(data(8)), eps = 1e-7;
  for (const aspect of [414/896,320/568,896/414]) {
    for (const edge of [...new Set(route.windows.flatMap(w => [w.start,w.readStart,w.readEnd,w.end]))]) {
      if (edge === 0 || edge === 1) continue;
      const a = courtyard.sampleCourtyard(route, edge-eps, aspect);
      const b = courtyard.sampleCourtyard(route, edge, aspect);
      const c = courtyard.sampleCourtyard(route, edge+eps, aspect);
      for (const key of ['position','target','up']) {
        const left = new T.Vector3(...b[key]).sub(new T.Vector3(...a[key])).divideScalar(eps * route.seconds);
        const right = new T.Vector3(...c[key]).sub(new T.Vector3(...b[key])).divideScalar(eps * route.seconds);
        assert.ok(left.distanceTo(right) < .02, `${key} derivative jumps at ${edge}`);
      }
      for (let i=0; i<route.stations.length; i++) {
        const opacity = pose => pose.visibleStations.find(s=>s.stationIndex===i)?.opacity ?? 0;
        assert.ok(Math.abs(opacity(a)-opacity(c)) < 2e-5);
      }
    }
  }
  const w = route.windows[1];
  const a = courtyard.sampleCourtyard(route,w.readStart), b = courtyard.sampleCourtyard(route,w.readEnd);
  assert.ok(new T.Vector3(...a.position).distanceTo(new T.Vector3(...b.position)) > 1);
  const wanted = new T.Vector3(0,1,0);
  assert.ok(new T.Vector3(...b.up).distanceTo(wanted) < 1e-7, 'read up fails to align fixed text');
});

const data = count => ({leaders: [{id: 'a', name: 'A'}, {id: 'b', name: 'B', intro: '简介'}], members: Array.from({length: count}, (_, i) => `member-${i}`)});

// Catches dropped remainder, reordered names, and synthetic empty groups.
test('groups preserve source order and remainder', () => {
  assert.equal(typeof courtyard.createPeopleRoute, 'function');
  for (const count of [0, 1, 7, 8, 95, 96]) {
    const route = courtyard.createPeopleRoute(data(count));
    assert.equal(route.memberGroups.length, Math.ceil(count / 7));
    assert.deepEqual(route.memberGroups.flatMap(group => group.memberIndices), Array.from({length: count}, (_, i) => i));
    assert.ok(route.memberGroups.every(group => group.memberIndices.length > 0 && group.memberIndices.length <= 7));
    assert.equal(route.stations.filter(s => s.kind === 'member').length, Math.ceil(count / 7));
  }
});

// Catches skipped reading windows, overlapping main subjects, hard opacity switches, and stateful seeks.
test('windows are continuous and deterministic', () => {
  assert.equal(typeof courtyard.createPeopleRoute, 'function');
  const route = courtyard.createPeopleRoute(data(95));
  assert.ok(Math.abs(route.seconds-(2 + 4.5 + 6.5 + 14 * 3.2 + 2 + 17 * .9))<1e-10);
  assert.equal(route.windows[0].start, 0);
  assert.equal(route.windows.at(-1).end, 1);
  route.windows.forEach((window, index) => {
    assert.ok(window.start <= window.readStart && window.readStart < window.readEnd && window.readEnd <= window.end);
    if (index) assert.equal(window.start, route.windows[index - 1].end);
    const sample = courtyard.sampleCourtyard(route, (window.readStart + window.readEnd) / 2, 414 / 896);
    assert.equal(sample.primaryStation, index);
    assert.equal(sample.visibleStations.find(s => s.stationIndex === index).opacity, 1);
    assert.equal(sample.visibleStations.filter(s => s.reading).length, 1);
    for (const edge of [window.readStart, window.readEnd]) {
      const near = courtyard.sampleCourtyard(route, edge + (edge === window.readStart ? 1 : -1) * 1e-8, 414 / 896);
      assert.equal(near.visibleStations.find(s => s.stationIndex === index).opacity, 1);
    }
  });
  for (const t of [-1, 0, 1, 2]) {
    const sample = courtyard.sampleCourtyard(route, t, 414 / 896);
    assert.ok([...sample.position, ...sample.target, ...sample.up].every(Number.isFinite));
  }
  assert.deepEqual(courtyard.sampleCourtyard(route, -1, .5), courtyard.sampleCourtyard(route, 0, .5));
  assert.deepEqual(courtyard.sampleCourtyard(route, 2, .5), courtyard.sampleCourtyard(route, 1, .5));
  const before = courtyard.sampleCourtyard(route, .37, .5);
  courtyard.sampleCourtyard(route, 1, .5);
  assert.deepEqual(courtyard.sampleCourtyard(route, .37, .5), before);
});

// Catches route-camera divergence, boundary jumps and camera-attached decoration.
test('world-space route joins the old ending and retains authored petals', () => {
  assert.equal(typeof courtyard.createPeopleRoute, 'function');
  const route = courtyard.createPeopleRoute(data(8));
  const entry = courtyard.sampleCourtyard(route, 0, .5);
  const old = lookbackPose(1, new T.PerspectiveCamera());
  assert.deepEqual(entry.position, old.position);
  assert.deepEqual(entry.target, old.target);
  const middle = courtyard.sampleCourtyard(route, .5, .5);
  assert.ok(middle.petals.length >= 3);
  const keys = new Set(FLOWER_SPECS.map(([kind, name]) => `${kind}:${name}`));
  assert.ok(middle.petals.every(p => keys.has(p.key) && [...p.position, ...p.quaternion, ...p.scale].every(Number.isFinite)));
  assert.deepEqual(middle.petals, courtyard.sampleCourtyard(route, .51, .5).petals);
  for (const w of route.windows.slice(1)) {
    const a = courtyard.sampleCourtyard(route, w.start - 1e-7, .5);
    const b = courtyard.sampleCourtyard(route, w.start + 1e-7, .5);
    assert.ok(new T.Vector3(...a.position).distanceTo(new T.Vector3(...b.position)) < .01);
  }
});

test('invalid editable content preserves existing validation errors', () => {
  assert.equal(typeof courtyard.createPeopleRoute, 'function');
  assert.throws(() => courtyard.createPeopleRoute({leaders: [], members: ['']}), /members\[0\]/);
});
