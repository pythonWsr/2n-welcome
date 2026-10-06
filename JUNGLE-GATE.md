# Coast motion / Jungle gate — 2026-09-30

## Scope

Preserve 2n sculpture, Hero, Garden placements, six Garden petal identities and camera path. Fix outgoing Desert / incoming Ocean continuity. Add existing Jungle GLBs; no Mob, no Hell, no generic vegetation.

## Changes

- Ocean start inherits Garden endpoint velocity, scaled to six viewport units; portrait +5 height decays smoothly instead of snapping. Jungle inherits Ocean end velocity, scaled to four units.
- Ocean first batches cover x470–618. Eighteen mobile / twenty-six desktop Sand instances bridge x448–518. Each is fitted to the actual Desert or Ocean terrain triangles after rotation.
- Experimental initial interaction gate: auto-play at 40% speed while Garden prepares, restore input on readiness, failure, reduced motion, skip, or 15 seconds. Never re-lock after release. `?loadingIntro=0` disables the experiment for A/B comparison.
- Jungle mobile population: Peas 66, Tomato 52, Bur 48 (166 total). Desktop 90 / 72 / 66 (228). Instanced clusters with distinct species seeds and terrain contact; no new model generation.
- Models are existing user-made Lux3D web copies. IDs from supplied ID supplement: Peas 44, Tomato 60, Bur 64. Originals unchanged. Palette reference is the previously generated background collage's teal-green quadrant; not presented as a newly verified official screenshot. Jungle art direction remains a first visual gate, not final acceptance.
- Hero/Garden/Desert retain 6+8 viewport units, Ocean retains six, Jungle adds four. Garden formula remains unchanged; Ocean–Jungle height/palette blend extends x820–1000.

## Validation boundary

Node regression tests cover camera position/velocity at joins, timeout/retry/unlock, original GLB contact, density, and asset loading. Build is verified before publishing. Cloud-browser QA is unavailable without the required control-browser skill. Automated checks do not verify iPhone Safari's touch behavior, GPU frame time, or Jungle visual quality. User acceptance on iPhone 13 Pro Max remains required.

## Source control

Accepted v28 goes to main via PR #1. This gate remains on the active sync branch for testing. See BRANCHES.md; unique research histories are preserved.
