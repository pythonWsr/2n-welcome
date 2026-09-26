const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../dist/motion.js');
const L = require('../dist/liquid.js');

const devices = [
  [390, 844],
  [1440, 900]
];

function gatherPlan(width, height) {
  return L.buildGather(M, 23, width, height, 240);
}

test('gather is reversible, bounded and area-conserving', () => {
  for (const [width, height] of devices) {
    const plan = gatherPlan(width, height);
    let previous = -Infinity;
    for (let step = 0; step <= 120; step++) {
      const phase = step / 120;
      const state = L.gatherAt(M, plan, phase);
      assert.ok(state.radius + 1e-8 >= previous, `mother radius regressed at ${width}x${height}, ${phase}`);
      previous = state.radius;
      const area = state.radius ** 2 + state.drops.reduce((sum, drop) => sum + drop.areaR ** 2, 0);
      assert.ok(Math.abs(area - plan.totalArea) / plan.totalArea < 5e-4, `area drift at ${width}x${height}, ${phase}`);
      let outline = L.circle(state.x, state.y, state.radius);
      for (const drop of state.drops) {
        if (drop.r > .1) outline += L.circle(drop.x, drop.y, drop.r) + L.neck(state.x, state.y, state.radius, drop.x, drop.y, drop.r);
      }
      assert.ok(!/NaN|Infinity/.test(outline), 'SVG path contains an invalid number');
    }
    const end = L.gatherAt(M, plan, 1);
    assert.ok(Math.abs(end.radius - plan.finalRadius) < .05, 'mother drop reaches its planned final radius');

    for (const phase of [.07, .23, .51, .77, .93]) {
      const forward = structuredClone(L.gatherAt(M, plan, phase));
      L.gatherAt(M, plan, 1 - phase);
      const reverse = structuredClone(L.gatherAt(M, plan, phase));
      assert.deepEqual(reverse, forward, `gather must be phase-deterministic at ${phase}`);
    }
  }
});

test('member droplets never fuse with each other', () => {
  for (const [width, height] of devices) {
    const plan = gatherPlan(width, height);
    for (let step = 0; step <= 120; step++) {
      const state = L.gatherAt(M, plan, step / 120);
      for (let i = 0; i < state.drops.length; i++) for (let j = i + 1; j < state.drops.length; j++) {
        const a = state.drops[i], b = state.drops[j];
        if (a.r < .5 || b.r < .5) continue;
        const gap = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
        assert.ok(gap > -.05, `small drops overlap at ${width}x${height}: ${i}/${j}, gap=${gap}`);
      }
    }
  }
});

test('mother surface deforms locally during absorption', () => {
  const plan = gatherPlan(390, 844);
  let found = false;
  for (let step = 15; step < 110; step++) {
    const state = L.gatherAt(M, plan, step / 120);
    const path = L.circle(state.x, state.y, state.radius);
    if (path.includes(' C ')) { found = true; break; }
  }
  assert.ok(found, 'mother path should use local cubic surface deformation during impact');
});

test('split bulges, necks off, stays reversible and hands off cleanly', () => {
  for (const [width, height] of devices) {
    const gather = gatherPlan(width, height);
    const split = L.buildSplit(M, 23, width, height, L.gatherAt(M, gather, 1).radius);
    let previous = Infinity;
    for (let step = 0; step <= 120; step++) {
      const phase = step / 120;
      const state = L.splitAt(split, phase);
      assert.ok(state.radius <= previous + 1e-8, `split mother radius grew at ${phase}`);
      previous = state.radius;
      let outline = L.circle(0, 0, state.radius);
      for (const drop of state.drops) {
        const r = drop.r * Math.sqrt(1 - drop.handoff);
        if (r > .1) outline += L.circle(drop.x, drop.y, r) + L.neck(0, 0, state.radius, drop.x, drop.y, r);
      }
      assert.ok(!/NaN|Infinity/.test(outline));
    }
    const end = L.splitAt(split, 1);
    assert.ok(end.radius < .05, 'mother drop is gone after the split');
    assert.ok(end.drops.every(drop => drop.handoff > .999), 'all detached drops hand off to the orbit layer');
    assert.ok(end.drops.every(drop => Math.abs(drop.scale - 1) < 1e-8), 'handoff scale matches the orbit particle scale');

    for (const phase of [.11, .37, .64, .88]) {
      const forward = structuredClone(L.splitAt(split, phase));
      L.splitAt(split, 1 - phase);
      const reverse = structuredClone(L.splitAt(split, phase));
      assert.deepEqual(reverse, forward, `split must be phase-deterministic at ${phase}`);
    }
  }
});
