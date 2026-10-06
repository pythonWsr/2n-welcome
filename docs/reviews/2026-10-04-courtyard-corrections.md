# Corrective implementation and review record

# Task 1 report — three ordered courtyard corrections

Status: implementation and automated verification complete. Browser/iPhone visual and GPU-performance acceptance remains unverified. No external publication, GitHub, Sites, Pages, dependency, content or asset operations performed by this task.

Commits (source/tests only):
- 5186de5 fix: lift complete courtyard shots above terrain
- eb56381 fix: share exclusive footprints to people text handoff
- 7adfb40 fix: map manual courtyard travel by cached path distance

## Terrain

Root cause: original readingQuaternion maps later authored stations downward; responsive subwindow offsets compound that descent. Original shipped members run from worldY34.76 to -185.40. Ground is finite indexed triangle geometry, not the smooth generator nor a globally extrapolated desertSurface.

Changed src/people-courtyard.js: preserve raw sourceStations; apply one vertical elevation scalar per complete shot to camera, target, text anchor and authored petal anchors. First shot's height is the shared clearance floor. Original horizontal positions, quaternions, timings, drift, Hermite derivatives and all asset geometry remain. Responsive offsets are applied to raw source then elevated once (no double lift). Existing interpolation blends the shared elevation smoothly; fixed environment construction consumes those same views. Entry endpoint is exact old lookback pose. The first leader is already above terrain and unchanged; later stations level at that safe height.

Tests/courtyard-clearance.test.js RED: three95-member cases failed on complete rotating HD extents; zero-member controls passed. GREEN initially17 targeted tests including prior route continuity and HD environment suites. Final terrain coverage adds direct comparison against actual production BufferGeometry triangle planes from all7 finite meshes; reference accuracy2e-5, global vertex maximum below-19. Dense1,201 samples for each zero/95-member ×414x896,240x568,896x414 route check camera, conservative full glyph rectangle corners, full HD rotating bounding spheres including motion margin, and12 subsegments along camera-to-text/target sightlines. Entry continuity and exact reverse old-world tests pass. All regions/assets/loading remain untouched; depth testing stays enabled.

## Text handoff

Root cause: footprints fade at independent normalized0..0.03 while route/spatialOpacity independently exposes first leader; actual projected fallback already exposes awdc just after entry.

Changed src/people-courtyard.js, src/companionship.js, src/people-layout.js: one deterministic chapterHandoff derived from entry readEnd and first transfer arrival. Footprints finish fading at entry readEnd; new people text starts after first quarter of the moving transfer. Both route opacity and actual spatial fallback are bounded by the shared people gate. All leaders and member paths obey it; no wall-clock gate, no camera stop, reverse is the same absolute function.

Tests/people-gallery.test.js RED: real gallery projection/material/visibility plus companionship overlapped at peopleT0.0001342592592592593. (Initial check at0 was corrected to respect hidden parent group before recorded RED.) GREEN20 targeted tests;180 samples each direction through first arrival establish mutual exclusion and nonempty petals-only gap. The external font worker is replaced by known ink; actual Text transforms/projection/publication/material paths remain real.

## Manual distance / automatic time

Root cause:5-second1.3-unit drift and0.9-second80ish-unit transfers share the same time-based manual coordinate. Damping time cannot equalize sensitivity.

Changed src/people-distance.js: WeakMap-cached cumulative camera arc coordinate on the final lifted responsive route.256 cosine-distributed samples per read/transfer interval concentrate integration near curved joins. A positive0.04 world-units/sec metric regularizes stationary entry/end intervals; mapping is strictly monotonic, never flat, and has an exact numerical inverse of the same table. No forced snaps or additional smoothing. Reading drift remains original. Arc length is a numerical approximation, not an analytic integral.

Changed src/people-courtyard.js: camera-only sampleCourtyardView and WeakMap track-knot cache avoid full-route/petal allocation while constructing distance tables. Construction is once per route identity; per-frame map/inverse are binary searches. Original sampleCourtyard uses the same camera path. No hidden second camera path.

Changed src/people-story.js: scrollToStory/storyToScroll accept shared route; old55.2 physical units remain unchanged. Autoplay functions translate time through the same map/inverse, preserving original150 seconds plus unchanged route seconds/window durations.

Changed src/main.js: all native scroll, play/pause, manual interruption, resize and adoption conversions carry route. Existing5/sec damping now runs on physical manual distance before inverse sampling, not story time. Async metrics inside people still defer geometry adoption and retain exact existing shared route/pose; resize retains semantic member/read fraction and remaps physical scroll/player time.

Tests/people-distance.test.js RED: transfer allocation0.000386705 vs read0.002148363 in98-window narrow route (wrong ratio); both17/98-window cases failed. Tests now cover >15x transfer/read allocation, near-uniform local response,2,001 forward/inverse and autoplay roundtrips, unchanged old physical mapping, strictly monotonic stationary entry and empty content. A finite-step speed probe initially crossed a tiny authored transfer turnaround and measured chord cancellation; corrected it to measure local derivative with1e-8 physical increments, which matches sensitivity requirement while preserving original path. Two legacy integration expected values were intentionally updated from linear mapping to the new route-aware inverse.

Tests/people-integration.test.js controller RED: actual VM main camera x327.9938 vs expected368.8884 for manual distance seek. GREEN19 targeted tests include real entry script seeks, exact autoplay time advance, pause/manual-interruption pose retention, active playback semantic resize, late metrics exact pose retention, retry/failure and old-world reverse behavior.

## Final fresh verification after final source/test changes

- node --test test/*.test.js tests/*.test.js — exit0,186 passed,0 failed/skipped/cancelled;14.36s. /tmp/courtyard-full-tests.log
- npm run build — exit0; Vite build complete. /tmp/courtyard-build.log
- git diff --check — exit0, empty output.

Build reports existing-size-class warning for chunks over500kB; no build errors. npm also printed update notice. No dependency inputs changed.

Changed paths: src/people-courtyard.js, src/companionship.js, src/people-layout.js, src/people-distance.js, src/people-story.js, src/main.js, tests/courtyard-clearance.test.js, tests/people-gallery.test.js, tests/people-distance.test.js, tests/people-integration.test.js.

Limits/risks: automated geometry and VM tests do not establish real iPhone visual quality or GPU speed. Physical people range remains18 story units; longer responsive routes still cover more total world distance in that range, now distributed by travel instead of wait durations. Responsive resize preserves semantic reading position rather than identical world coordinates when splitting/regrouping changes geometry; late readiness retains exact camera until explicit resize or old-world return. Terrain checks target rendered ground triangles and complete conservative subject bounds, not every decorative biome mesh; all subjects have generous altitude margin. Root owns release/progress/spec/plan documents and any publication decisions.

## Independent task review

Reviewer courtyard_three_task_review: Spec compliant within automated acceptance; Task quality Approved. No Critical/Important/new Minor. Checked same-route elevation, raw source stations prevent double lift, shared fade including spatial fallback, cached inverse distance mapping and controller seek/interrupt/resize/late-readiness. Existing logs corroborated186pass andsuccessfulbuild without duplicate full suite.

Limits: real Safari appearance/GPU unverified; terrain check does not cover every decorative mesh; numerical arc integration; responsive resize preserves semantic position rather than world coordinates.

## Whole-change final review

Independent courtyard_three_final_review: no Critical/Important; owner-private candidate ready. One Minor: first-use distance-table construction on102-station pre-metrics route measured91.5–104.4ms inNode vs0.20–0.56ms for1000cachedinversions, possible one-time boundary/resize hitch. This is not device/GPU evidence. Root assigned sole complete correction wave for idle/loading preparation with safe fallback.

Declined to judge: Safari/touch/GPU, all decorative occluders, real-font rendering, analytic arc exactness (numerical intentional), identicalworldpose afterresponsive regrouping (semantic preservation), sameabsolute sensitivity acrossroute lengths (18units retained), externalpublication/Pages evidence. No silently discarded deviceacceptance.

## Sole final correction wave

# Sole final correction wave

Base: 1258a16. Commit: b1d9365 (source and tests only). Complete assigned finding: lazy people distance-table first-use construction cost.

Implemented one shared incremental builder for both synchronous first use and idle preparation. Same 256 cosine samples per edge interval, order, position sampler, metric floor, normalization and interpolation. WeakMap cache and pending jobs deduplicate overlapping requests. Each idle callback processes at most 64 samples and checks a 2ms budget between samples; a zero-budget callback reschedules without sampling. No idle timeout forces work onto a busy frame. Browsers without idle callbacks use bounded timer slices. Finished cache makes preparation a no-op. Synchronous fallback continues partial work and cancels its scheduled callback. Replacement cancellation removes stale work; stale cancel handles cannot cancel newer jobs.

Main schedules immediately after adopting the actual route; previous adopted route preparation is canceled. Deferred late metrics are still deferred while inside people, and route adoption remains synchronous with original progress/player/resize semantics. No new readiness gate, seek, dependency, content/animation changes or alternative mapping. Existing integration harness additionally records preparation/cancellation and covers adopted identity, deferred metrics, resize and continued playback.

Validation:
- RED: `node --test tests/people-distance.test.js` — exit 1; existing 3 passed, new 2 failed because preparePeopleDistance absent.
- GREEN: `node --test tests/people-distance.test.js tests/people-integration.test.js` — exit 0, 23/23 passed. Initial integration assertion incorrectly compared preparation with per-render route history, corrected to adopted gallery identity and preparation cancellation history.
- Final full run (once): `node --test test/*.test.js tests/*.test.js > /tmp/courtyard-final-tests.log 2>&1` — exit 0, 190/190 passed, 0 skipped, approximately 14.28 seconds. Includes additional busy-budget/stale-cancellation test.
- Final build (once): `npm run build > /tmp/courtyard-final-build.log 2>&1` — exit 0. Existing Vite >500kB chunk warning; build completed.
- `git diff --check` — exit 0.
- Diagnostic Node shipped-content responsive route (414x896, 102 stations), injected immediate idle queue with 10ms deadline: 813 slices, total callback work 106.14ms, maximum observed callback 3.42ms, cached 1000 forward mappings 0.65ms. Same machine diagnostic only; not browser/iPhone timing. Callback budget is checked between samples, so a sample, initialization, normalization or GC can exceed 2ms.

Limits: preparation redistributes computation into available loading/idle periods; it does not eliminate total work. If a route is used before idle preparation completes, synchronous fallback remains possible, especially immediate resize/playing adoption requiring time mapping. No asynchronous geometry jump was introduced to hide that cost. Timer fallback provides bounded work but cannot prove browser idle time. No browser/GPU/iPhone confirmation or external publication was performed. No subagents spawned. Root-owned docs were not staged. This report is uncommitted for root ownership and scoped re-review.

## Scoped final re-review

Independentcourtyard_prepare_reviewclean atb1d9365: soleMinoraddressed, no newbreakage/openfindings. Same builder/sampling/normalization/cache/fallback verified; dedupe/deadlineyield/queuedcancellation/stalecancelguards and actuallyadoptedroute lifecycle preserve delayedmetrics/resize/playing. Savedlogs190/190pass/buildcorroborated without duplicate suite. Immediateentry/resize maystillfallback;2ms is checkedbetween samples, not harddeadline/deviceguarantee.
