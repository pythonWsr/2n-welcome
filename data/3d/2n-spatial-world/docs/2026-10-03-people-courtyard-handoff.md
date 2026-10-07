# People courtyard handoff

2026-10-04. Code verification complete; browser, iPhone Safari and performance acceptance **NOT DONE**. Publication is authorized only as an owner-private phone-review candidate after the controller's final whole-branch review. Deployment success will not establish visual acceptance.

## Source and publication state

- Editable people content: `content/people.json`; authoring rules: `content/README.md`. Keep IDs, source ordering and provenance; do not invent biographies or member relationships.
- Original comparison base: `287e482`. Final verified local product HEAD: `5e3dd237a5924c41c46089940fe284c75c78d14f`.
- Recovered Tasks 1–3: GitHub `bd9deb9075c283eefee762edf3c2fafd7ccd7fae`, exact local recovery `c4b41729b2553628158272973696f8719c8128c5`.
- Task 4 approved local `7692eeb09ea670c029a4a928bda340cfccbe225f`, GitHub `494254e874ddab551175a11810fd5eb4fdac1282`.
- Task 5 approved local `2db0c2dad33aa2df9ece1da8d08c1b6a4aa01621` plus `5e3dd237a5924c41c46089940fe284c75c78d14f`; current GitHub candidate `72707e092fd0d0ac411c0dec8d310b94bfd518f8`, 12 candidate files read back exactly by controller.
- Target repository/branch: `Llhleo/2n-spatial-world`, `experiment/lookback-v2`. No operations on main, old `Llhleo/2n`, or Pages.
- Original Sites URL: https://twon-dark-spatial-world.llhleo.chatgpt.site . Last confirmed deployment remains **v42**, source `537be1fc60418af393cf9511549b91e5dd77fe8a`; owner-private access preserved. No new deployment performed by this worker.
- Controller fill after final review/publication: final local checkpoint SHA **PENDING**; final GitHub SHA/readback **PENDING**; Sites version **PENDING**; deployed source SHA **PENDING**; succeeded status **PENDING**; user Safari acceptance **PENDING**.

## Scope and preserved material

The implementation centralizes route geometry and timing, pooled glyph preparation/layout, fixed high definition petal surroundings, paced autoplay and semantic resize/late-font adoption. One route is shared by camera, gallery, surroundings and time mapping. Existing old-world samplers retain their original behavior; scheduler restores historical world-up after reverse courtyard seeks.

Changed product paths from the original base: `src/people-courtyard.js`, `src/people-layout.js`, `src/people-gallery.js`, `src/people-path.js`, `src/people-story.js`, `src/main.js`, `src/companionship.js`, and five directly affected courtyard/gallery/integration/path test files. Ancillary changes are `.gitignore` (worktree exclusion), content authoring README and progress documentation. Main/companionship changes are authorized integration/environment exceptions, not old biome pose source changes.

A path-restricted `git diff --name-only 287e482 HEAD` returned no changes for all `public` assets, `content/people.json`, package manifest/lock, `scripts`, `.github`, or protected old-world sources: `biomes`, `garden-path`, `lookback`, `motion-path`, `journey`, `map-flowers`, and desert/garden/hell/jungle/ocean production modules. Thus tracked GLB, textures, fonts, seven-flower allocation, people JSON, Pages workflows, dependencies and build scripts are unchanged. Build generated only ignored outputs; no new tracked asset changes appeared.

## Fresh final code verification

Run in the people-courtyard worktree on the final product HEAD, once each:

| Command / evidence | Result |
| --- | --- |
| `node --test test/*.test.js tests/*.test.js` | 171 tests, 171 pass, 0 fail/skipped/cancelled; 15674.44019 ms; exit 0 |
| `npm run build` | exit 0; Vite built in 1.86 s; 68 modules |
| `git diff --check` | exit 0; no output |
| Current JSON/route ordered-coverage assertion | 5 leaders, 95 members, 14 source groups; all original indices reachable exactly in order |

Complete local output logs: `/tmp/task6-full.log`, `/tmp/task6-build.log`; route data check: `/tmp/task6-data.log`; changed paths: `/tmp/task6-changed-paths.log`. These are transient verification logs, not browser artifacts. Full test output was read, including the intentional existing failure/retry fixture diagnostic at line 73: `garden petals unavailable Error: offline`. Build reports the existing >500 kB chunk warning (world 822.90 kB, geometry utilities 557.61 kB) and npm unknown `http-proxy` environment-config warning. Neither is described as a clean-warning-free run or a browser performance measurement.

Current source grouping is thirteen groups of seven plus a final four. Leaders read for `[5,7,5,5,5]` seconds; each member group/subwindow receives 5 seconds, with transfers separately counted. Base people route is 120 seconds; original story retains 150 seconds. Unknown-font conservative 320×568 derivation keeps all 95 ordered one-name subwindows and lasts 597.9 seconds. Measured-font route capacity can differ; actual browser glyph metrics remain unverified.

Tests cover source order and edge cases, route/entry continuity, reverse seeks, complete fixture glyph projections, text pool bounds, late preparation and retry isolation, GLB full bounding-box visibility and maximum decorative avoidance, autoplay default/manual pause, durations and inverse mapping, semantic resize, reduced motion and historical shared-camera restoration. These are deterministic code/fixture proofs, not rendered WebGL acceptance. Tasks 4 and 5 received independent spec/quality approval with no Critical/Important findings; the controller still owns final whole-branch review.

## Remaining real acceptance and phone QA

Required control-browser capability is unavailable; managed Sites forbids substitute browser/preview startup. No server, browser, recording or substitute screenshot was started. Continuous browser video, rendered actual-font measurement, Safari checks, and same-device before/after cold start, warm start, frame-time and memory measurements are **NOT DONE**. No baseline or new performance values are invented. No obvious regression can be ruled out from the unit/build checks alone.

After the controller confirms successful candidate deployment and source SHA, use iPhone Safari to:

1. Record original ending → entry → all five leaders → all member groups/subwindows → final view continuously. Inspect transitions frame by frame for flicker, overlapping central subjects, blank scenes and visible replacement pops.
2. At actual canvas sizes 414×896, 320×568 and 896×414, measure complete rendered glyph boxes within x 12%–88%, y 30%–70%. Check name 44–56 px, role ≥22 px, intro ≥18 px, current member ≥20 px at the baseline; inspect long names and right-bottom autoplay clearance.
3. Confirm each reading and transfer view has at least three complete separated petals across two depths; maximum float/rotation must avoid text. Check readable contrast and scenery parallax.
4. Record rapid forward/backward scroll and portrait/landscape changes; verify semantic reading position and original ring/ground/camera restoration. Turn autoplay on, manually interrupt it, check endpoint stop and full ordered coverage. Repeat with reduced motion.
5. Exercise late fonts, font failure and retry without changing scroll or blocking the old world. Compare cold/warm startup, courtyard frame times and memory against the retained v42 baseline on the same device/conditions; record tools, intervals and real results.

Retain v42/source `537be1fc60418af393cf9511549b91e5dd77fe8a` and the GitHub checkpoint as rollback references. Phone confirmation and any performance findings must be recorded separately from deployment status.

## Final review correction (supersedes earlier pending review)

Final product checkpoint: f40b7d7c501de75cca7c6ce4cb1df97f673577bd. Whole-branch review's clean-Troika-sync member publication defect was fixed and independently re-reviewed clean. Three faithful no-op regressions passed; final verification159 tests in tests/ plus15 in test/ =174/174 across two commands. Build/diff-check pass; protected assets/content/Pages remain unchanged. GitHub and Sites publication results will be appended after native confirmation. Device acceptance remains pending.

## Confirmed publication — 2026-10-04

- GitHub reviewed code checkpoint: 7c845ea6e9f9ee0c72c66acedabb092a8adcf0f4 on Llhleo/2n-spatial-world / experiment/lookback-v2; final six differences read back exactly. Earlier unchanged checkpoint files compared exactly before commit.
- Sites version43, source34f7cbc26244463f855fe79316c2e9a9f14dd586. Native deploymentappgdep_6ac1c3ffd73c819183c804fa7d2495f1 returned succeeded. Saved-version source SHA was independently read back.
- URL: https://twon-dark-spatial-world.llhleo.chatgpt.site
- Original project identity and owner-only audience confirmed unchanged. No GitHub Pages/main/old-repository operation.
- All code work complete and reviewed. Remaining: actual Safari/phone continuous visual review, actual font metrics and device startup/frame/memory measurements. These were not performed, and deployment success does not establish them.
- Next work: review deployed phone experience against the handoff checks; fix concrete observed flicker, composition, readability or performance issues with preservation of HD quality and existing world. Introductions remain conveniently editable in content/people.json.
- Rollback reference: Sitesv42/source537be1fc60418af393cf9511549b91e5dd77fe8a.
