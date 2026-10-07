# Final whole-branch review

Range: 287e482..69d90f3. Independent reviewer: courtyard_final_review.

No Critical findings. One Important finding: people-layout request clears the published revision binding but waits for synccomplete even when Troika shaping is unchanged. Real Text.sync emits no event for a clean configuration, so height-only resize or identical route adoption can permanently hide members and strand slots. Faithful _needsSync probe reproduced the defect; existing always-completing test doubles missed it.

Required correction: keep settled shaping configuration separate from revision binding; reuse settled glyph results for identical shaping while guarding genuinely pending/stale work. Regressions must cover height-only resize, identical adoption and subsequent navigation/retry. One complete fix wave and one scoped re-review are pending.

Shared route, source ordering, resource ownership and reverse restoration were supported by the full diff. Rendered font metrics, Safari, continuous video and device performance were declined to judge because evidence is unavailable. Publication has not happened. Existing offline diagnostic and bundle warnings remain deferred; bounded instance counts are not performance measurements.

## Sole correction wave

Commit f40b7d7c501de75cca7c6ce4cb1df97f673577bd.

# Final review fix report

Date: 2026-10-04 UTC
Status: Complete, sole requested Important finding addressed.
Base: 69d90f377517d23e129c8c49c4a8fac661176aee
Commit: f40b7d7c501de75cca7c6ce4cb1df97f673577bd

## Investigation

Read the courtyard constraints and design specification, complete current people-layout lifecycle, existing gallery tests, and installed troika-three-text 0.52.4 Text.sync implementation. Text.sync only begins work and emits synccomplete when _needsSync is true. Assigning identical shaping values after revision invalidation does not dirty Text. The gallery previously removed its published binding and waited forever for an event that could not occur. Its existing font-worker substitute always emitted completion, masking the real no-op behavior.

## Change

Track each slot's successfully settled shaping configuration and measured ink independently of the current route revision publication. Text content, maxWidth, whiteSpace, and overflowWrap are the only shaping properties modified after label construction; all other shaping properties remain fixed by label initialization. A new binding with identical settled shaping adopts those valid measurements immediately without requesting nonexistent work. Starting changed shaping invalidates the prior settled result. Pending work remains exclusively owned until completion, successful stale work can record its own settled glyph configuration but cannot publish the stale route binding, and the existing serial, desired-key, disposal, and group-completeness guards remain intact. Storage is bounded to one settled result per existing slot.

Only src/people-layout.js and tests/people-gallery.test.js were committed. Assets, editable content, Pages, old world, progress documentation, and root-owned untracked reviews were untouched. No external operations or additional review waves were performed.

## Regression evidence

Added an optional font-worker substitute mode honoring the real Text dirty setters and no-op sync semantics. It emits nothing when _needsSync is false and clears that flag when work starts. Three regressions exercise:

- Height-only resize preserving width/shaping, full current-group publication, ready-state retry, and subsequent far navigation/reversal.
- Identical route adoption preserving shaping with the same subsequent recovery/navigation assertions.
- An identical revision requested while original work is pending: no premature group publication, successful settled reuse after stale work completes, then navigation/reversal through changed pending work.

Before the runtime change, the targeted command failed all three tests with empty visible current groups (0 instead of 7, or [] instead of source names). After the change the same command passed all three:

`node --test --test-name-pattern='settled member ink|pending stale member ink' tests/people-gallery.test.js`

Full verification: `node --test tests/*.test.js` exited 0, 159 tests passed, 0 failed/cancelled/skipped. The deliberate offline recovery test logged its expected offline error; no test failed.

Production build: `npm run build` exited 0, including placement bake, model transport generation, and Vite. Build retained the existing large-chunk warning (world ~823 kB minified and BufferGeometryUtils ~558 kB). `git diff --check` passed before commit.

## Remaining limitations

No unresolved finding in the assigned wave. Tests verify real Text properties, transforms, materials, projection, publication events, and route behavior while replacing the external font worker. This is not a real browser WebGL or iPhone Safari visual acceptance result; those requirements remain independent. The settled identity assumes gallery-owned shaping properties remain fixed except for the four fields tracked here, matching current code ownership.

Controller noted the worker suite omitted test/*.test.js and is running that unchanged directory separately; combined verification must not be described as a single full-suite run. Scoped re-review pending.

## Scoped re-review result

Independent courtyard_fix_review: clean; all findings addressed, no new breakage, zero open findings. Settled shaping reuse resolves clean-sync stalls; pending ownership, stale/serial/desired-key/disposal guards preserve atomic group publication. Reviewer independently ran three targeted regressions: 3/3 passed.

Controller ran omitted unchanged test/*.test.js: 15/15 passed, log /tmp/courtyard-final-legacy-tests.log. Together with worker tests/*.test.js 159/159, final code checks total174/174 across two commands, not one full-suite run. Production build and diff-check pass. Browser/WebGL/Safari/performance remain NOT DONE.
