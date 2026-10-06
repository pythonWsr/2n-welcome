# Task 4 — shared high definition courtyard petals

Status: DONE_WITH_CONCERNS (implementation verified; browser/Safari/performance acceptance unavailable).

## Implementation and interfaces

- `createCompanionship.update(returnT, dt, peopleT, route)` consumes the exact derived route. Without a route, the original corridor remains temporarily intact for Task 5. With a route, no legacy corridor timing/angles are consulted.
- `courtyardEnvironment(route)` owns a WeakMap cache of fixed world anchors. It authors six-petal clusters at shared reading midpoints and transfer quarter samples, from `sampleCourtyard`; these stay stationary as the camera travels. The temporary PerspectiveCamera constructs/project-checks world coordinates only and is never rendered. There is no independent path, clock, or camera-following rail.
- Existing `sampleCourtyard(...).petals` supplies entry anchors; the cached helper supplies supplemental route clusters. Root confirmed this API split is acceptable. The cache key is the exact route object, so Task 5 must distribute the newly derived resize route to camera, gallery, environment, and timeline together.
- Original 14 instances retain the live legacy orbit, rotation, scale, and geometry-center pivot at the seam. They unfold/fade over the entry interval before first people reading. Reverse restores the original ground matrices exactly. Legacy installation still owns only 14 instances until route entry.
- Courtyard entry lazily allocates two extra instance slots per species (28 extra, 42 total maximum). The two nearest target-distance candidates per species are ranked from fixed world anchors. A smooth distance-to-third-candidate cutoff shrinks a departing identity to zero before its slot is reused.
- Each extra shares its original's owned display geometry/material. Late `installDisplay` atomically updates both references. Desired display extent is divided by actual geometry longest dimension; source meshes are never mutated/disposed. Disposal releases each owned geometry/material once and both instance buffers; borrowed source geometry/material remain alive.
- Ornament rotation is bounded ±0.12 radians and vertical float ±0.3 world units. Only positive `dt` advances decoration. Absolute chapter anchors and zero-dt random/reverse seeks are deterministic. Conservative rotation spheres plus float margin drive smooth scale suppression before text overlap; no text anchor moves.

## TDD evidence

Before implementation, wrote real local GLB position-buffer fixtures (all 14 display assets), consumer rig tests, complete transformed bounding-box visibility assertions, seam/restoration, bounded sharing, and maximum motion/reduced reversibility tests.

RED command:
`node --test tests/people-courtyard-environment.test.js tests/lookback-v2.test.js`

Observed 17 tests, 14 PASS / 3 FAIL:
- `all shots contain complete separated HD petals across two depths`: `414 shot 0.01954341058457281: only 0 viable petals`.
- `bounded pool shares upgraded HD geometry and material without disposing source`: `14 !== 42`.
- `maximum decorative motion avoids text and reduced sampling is reversible`: `companion-garden:clover maximum envelope crosses text at 0.005015565548253199`.
These failures represent absent route environment/pool and obsolete corridor text collision. Legacy seam regression already passed, as expected.

During focused integration, legacy lookback tests caught eager allocation (`42 !== 14` and `28 !== 14`); changed pool allocation to route entry, preserving old installation behavior without editing those tests.

GREEN final focused command:
`node --test tests/people-courtyard-environment.test.js tests/lookback-v2.test.js`
Observed 19 tests / 19 PASS / 0 FAIL (13996.794423 ms), no warnings.

Coverage includes 414×896, 320×568, 896×414, 768×1024; measured group layouts and conservative one-member responsive splits; read start/mid/end plus transfer .02/.25/.5/.75/.98. Every sample requires three pairwise-separated, complete GLB bounding boxes in the frustum, at least two depths (>5 world units separation), and at least 12 CSS px major projected dimension. Maximum-rotation/float sphere exclusion runs across all four viewport sizes and every read boundary/midpoint.

Continuity regression uses 1199 interior progress samples ±1e-7 and bisection of actual rank changes. Extents are normalized to real display size (not arbitrary GLB scale); dense changes must stay below .1 world unit, and an identity at an actual replacement boundary must shrink below 1e-5. A targeted fade-removal mutation failed: `courtyard-43-4 at 0.10666666666666667: 12.747894017517718 -> undefined`. Restoring the fade passes. Positive-dt decoration changes matrices; repeated zero-dt calls do not.

Full suite command:
`node --test`
Observed 174 tests / 174 PASS / 0 FAIL (14839.633914 ms). Full output: `/tmp/task4-full.log`. Existing intentional offline fixture diagnostic appears at line 73: `garden petals unavailable Error: offline`; it belongs to the failure/retry fixture and is not a suite failure. Output is therefore not described as pristine. This ran on the final production implementation. The subsequent test-only refinement added read start/end samples to the existing coverage test; final focused 19/19 confirms that refinement.

`git diff --check`: clean.

## Files and self-review

Changed only `src/companionship.js`, `src/people-courtyard.js`, new `tests/people-courtyard-environment.test.js`, and this requested report. Root-owned progress documentation is not part of this commit. Commit `7692eeb09ea670c029a4a928bda340cfccbe225f` contains the three source/test files; this report is in the repository-ignored `.superpowers` handoff directory and is not force-added.

Self-review checked no extra downloads or loader gates, no remote assets, no geometry/material source ownership leaks, late HD sharing, lazy 42-instance bound, old ground/return behavior, route-derived cache invalidation, and deterministic seeks. Existing text/camera implementations were not redone. Full suite covers unchanged Tasks 1–3.

## Concerns / remaining acceptance

- Real browser recording and iPhone Safari visual/performance acceptance are not performed: required control-browser capability is unavailable. Unit projection fixtures are not a visual or GPU performance acceptance claim.
- Original 14 unfold and fade before the first people reading; ongoing courtyard coverage comes from the shared 28-slot supplemental pool. This maintains the requested 42 maximum and prevents inherited ring/text collisions.
- Per-frame candidate ranking/projection allocates temporary vectors and arrays, matching existing sampler style. GPU instance count is bounded, but browser profiling is still needed before asserting performance acceptance.
- Task 5 remains responsible for distributing route updates and removing the temporary no-route corridor.
