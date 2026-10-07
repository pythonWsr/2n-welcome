# Task 5 — production courtyard and paced autoplay

Status: DONE_WITH_CONCERNS (unit/build verification complete; required real browser/Safari/performance acceptance unavailable).

Commit: `2db0c2dad33aa2df9ece1da8d08c1b6a4aa01621` — `feat: integrate courtyard story and paced autoplay`.

## Production integration and interfaces

`main.js` constructs the base route and gallery only after original GPU preparation succeeds, in the existing isolated people preparation try/catch. Gallery resize creates the derived route using actual viewport height; `adoptPeopleRoute` distributes that exact object to gallery, camera sampling, companionship/environment, and time mapping. Gallery's existing metric pool ownership and independent leader readiness remain intact. Main passes reduced-motion dt=0 to existing consumers.

`sampleStoryPose(progress,camera,portrait,route)` now forwards the shared route. Old chapter selection, 55.2 physical units and old pose sampling remain unchanged. `PEOPLE_UNITS=18`, `TOTAL_UNITS=73.2` retain their existing scroll geometry. Exports `autoplayDuration(route)`, `autoplayToScroll(fraction,route)`, `scrollToAutoplay(scroll,route)` implement 150 seconds for the old world plus derived route.seconds. The existing player continues to own only normalized time. Main converts at toggle and advance; resize/re-adoption recreates the player with the new total duration and restores playing state from the current semantic progress. Paused progress remains authoritative for the next toggle; retry never seeks or starts playback.

`capturePeoplePosition(route,t)` captures kind, sourceStationId, original member index and reading fraction. `restorePeoplePosition(route,token)` finds the new containing member subwindow rather than reusing an unstable part ID. Explicit resize remaps progress and scroll together, retains active playback, and gives every consumer the same newly derived route. Derived routes retain their original sourceStations and never mutate the base geometry.

## Late font adoption policy and integration bug

Pre-chapter font completion adopts measured geometry normally. Font completion while already in people re-adopts the exact current controller route into the now-ready gallery once and defers metric-derived geometry until the user leaves the people chapter or explicitly resizes. This retains all conservative one-member read windows and current physical camera pose, with no hidden second route/track or corrective camera coordinate state. Subsequent people frames do not re-adopt/revise the gallery again, so member slots can publish normally.

Actual gallery + actual main-script VM sequencing caught a real bug missed by mocked readiness: unknown metrics produced capacity=1 but rowPixels=Infinity, and a one-name layout evaluated 0*Infinity, giving NaN projection and invisible ready names. Minimal authorized `resizeCourtyard` fix preserves conservative capacity=1 while storing finite rowPixels=40 for unknown metrics. That spacing does not assume any glyph width; measured metrics still control future user/pre-chapter derivation. Actual gallery regression now observes original member publication on the retained route and identical camera pose at the first ready frame and later frames.

Initial base station IDs now namespace leader/member identities; original leader personId and sourceStationId remain intact. A leader named entry/ending/members-0 cannot collide with route-owned stations.

## Legacy deletion and fallback

Deleted the temporary no-route gallery, arc camera/state/layout helpers and companionship corridor. Missing route camera sampling keeps `lookbackPose(1)`; companionship ignores people progress without a route and retains the old ring/words/ground behavior. Gallery construction requires a shared route and is isolated by the existing main preparation failure boundary. Invalid content, construction failure and font timeout do not join the old intro readiness gate.

Directly obsolete legacy tests were replaced by route-free old-world fallback tests; route camera/projection, reserved measurement, publication, timeout, all-member coverage, environment, old-ring and glyph asset coverage remain. Test count changed 174 to 170 because obsolete behavior assertions were removed and integration regressions added.

## TDD evidence

Initial RED command: `node --test tests/people-integration.test.js`.
10 tests: 7 PASS / 3 FAIL, saved `/tmp/task5-red.log`. Missing mapping export assertion (`undefined` versus function), missing semantic capture function, and route identity replacement at late readiness failed as expected before integration.

Fallback RED: same command, 11 tests: 10 PASS / 1 FAIL, `/tmp/task5-fallback-red.log`. Missing route sampled obsolete arc coordinates `[326.762...,123.302...,75.904...]` rather than old return `[305,138,140]`.

Namespace RED: same command, 13 tests: 12 PASS / 1 FAIL, `/tmp/task5-id-red.log`; three unique station IDs versus six expected, before namespace fix.

Actual gallery sequencing RED: same command, 14 tests: 13 PASS / 1 FAIL, `/tmp/task5-real-gallery.log`; `ready member pool never publishes on deferred route`. Diagnostic inspection found published member bindings with NaN projected bounds. Finite conservative row spacing fixed the cause without changing camera geometry.

Final focused GREEN:
`node --test tests/people-integration.test.js tests/people-gallery.test.js tests/people-path.test.js`
29 tests / 29 PASS / 0 FAIL, 890.554018 ms, `/tmp/task5-focused.log`.
Includes real main-script VM, pure time inverse error <1e-10 over 1001 samples, old speed at75/150 sec, exact route read seconds, end stop, semantic subwindow remap, default off/manual pause, retry while playing with no scroll calls, reduced forward/reverse navigation, content/construction/timeout isolation, exact sampled route camera position, and actual deferred gallery member publication.

One full suite:
`node --test test/*.test.js tests/*.test.js`
170 tests / 170 PASS / 0 FAIL, 16342.072221 ms, `/tmp/task5-full.log`.
Existing intentional offline failure/retry diagnostic at line73 (`garden petals unavailable Error: offline`) appears; output is not described as pristine.

`npm run build`: PASS; `/tmp/task5-build.log`, built in2.07 sec. Existing >500kB chunk warning and npm update notice appear. No tracked generated/source asset changes. `git diff --check`: clean.

## Files and self-review

Nine committed files: `src/main.js`, `src/people-story.js`, `src/people-gallery.js`, `src/people-path.js`, `src/companionship.js`, `src/people-courtyard.js`, and directly affected integration/gallery/path tests. Root-owned progress document remains unstaged. This ignored handoff report is not force-added.

Self-review checked initialization ordering, original GPU gate independence, shared exact route distribution, retry control exemption, manual input pause, player time/scroll boundaries, semantic source/member remap, once-only late re-adoption, conservative complete membership, finite eventual glyph layout, invalid-route old fallback, original ring behavior, and asset preservation. No content/assets/Pages/workflow changes; source changes are limited to the files listed above. No Sites or GitHub operations by implementer.

## Concerns / remaining acceptance

Required control-browser capability is unavailable; no real browser recording, iPhone Safari visual acceptance or GPU performance acceptance is claimed. Deferring geometry retains the longer conservative one-member timeline until leaving people or explicit resize; this is intentional to preserve camera pose and all member reading opportunities. Existing sampler/environment allocation costs still need browser profiling. Main remains a long existing controller; this task adds bounded route lifecycle logic within its existing structure without a separate player/route state machine.


## Controller correction — shared camera world-up and exact public mapping names

Follow-up commit `5e3dd23` — `fix: restore historical camera up after courtyard seeks` (review range remains Task4 base7692eeb through this HEAD).

Controller identified that historical samplers assume the original camera.up and do not reset it. Added actual shared-camera regression: people midpoint/ending → each old biome, hero and both return samples; compare position/target, quaternion and up against pristine historical camera. Missing-route fallback is also exercised after a rotated people sample.

RED: `node --test tests/people-integration.test.js`, 16 tests /15 PASS /1 FAIL, `/tmp/task5-up-red.log`. Retained people camera.up `[0.19037795741603925,0.968985508830918,-0.15755417165465316]` differed from historical `[0,1,0]`. Fixed at scheduler old-world boundary and missing-route people fallback; original pose modules remain unchanged.

Aligned exact planned public names to `autoplayToScroll(timeFraction,route)`, `scrollToAutoplay(scrollFraction,route)`, `autoplayDuration(route)` in production and tests, without duplicate aliases.

Focused GREEN: `node --test tests/people-integration.test.js tests/people-gallery.test.js tests/people-path.test.js`; 30/30 PASS, 831.696375 ms, `/tmp/task5-up-green.log`.

Full suite repeated because this newly identified runtime cross-chapter risk justified it: `node --test test/*.test.js tests/*.test.js`; 171/171 PASS, 15763.856397 ms, `/tmp/task5-up-full.log`. Intentional existing offline fixture diagnostic remains.

Build repeated on final runtime: `npm run build`; PASS,1.97 sec, `/tmp/task5-up-build.log`; existing chunk-size warning remains. Final diff-check clean. Root progress and root untracked docs/reviews remain unstaged. Self-review confirms old camera.up/quaternion reverse restoration, no old sampler changes, and exact public interface alignment. Final test count171 includes the new cross-chapter regression.
