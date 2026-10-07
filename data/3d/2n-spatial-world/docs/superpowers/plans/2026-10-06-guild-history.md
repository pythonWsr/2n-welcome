# Guild History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace v49's closing metal sculpture with three approved, readable, reversible 3D guild-history stations.

**Architecture:** Keep one renderer and camera. Append a separate history route after the existing people endpoint, consume an independently editable JSON content file, and reuse the existing HD petal assets and world terrain. Remove only closing sculpture references; keep opening sculpture and all earlier absolute chapter coordinates.

**Tech Stack:** Existing Three.js 0.180.0, troika-three-text 0.52.4, Vite 6.1.0, Node test runner. No new dependencies.

**Spec:** docs/superpowers/specs/2026-10-05-guild-history-design.md

## Global Constraints

- Approved copy: docs/2026-10-05-guild-history-copy.md, verbatim including Unique.
- Dates: 2026-02-24, 2026-04-03, 2026-08-18. User is event source; no invented flower species, players, combat outcomes or media.
- Opening metal sculpture retained; closing sculpture no longer constructed.
- Locked Garden, original journey, people content, HD models/textures and loading strategy unchanged.
- Only PETAL; preserve v45 style long world chains and model fronts.
- Warm white text, localized soft shade, no black outline or glass cards.
- Reading glyph bounds: x12%–88%, y30%–70% of visible canvas.
- 31 seconds: 3-second entry, three 8-second station windows, two 2-second transfers. Last station stays visible at endpoint.
- Scroll budgets: entry .6 viewport, each station 1.3 viewport, transfers .35 viewport; at least 70% of station distance remains fully readable.
- Automatic playback stays off by default, manual input stops it.
- No first-screen new model/font waiting task, no new renderer or per-frame text reconstruction.
- Sites preview on existing project only; no main/Pages/old Llhleo/2n changes.
- Targeted checks plus one build; device visual acceptance still required.

## Review Focus

1. Narrow or landscape canvas: full long title/body remain inside reading bounds; preserve event ID on resize.
2. Reverse seek at dt=0: identity and chain caches redraw, no old member text or metal visibility.
3. Late/failed history font: preceding journey remains usable; retry makes a new preparation attempt at same event.
4. Endpoint/replay during autoplay: final text stays, replay stops player without duplicate renderer/listener/resource creation.
5. Invalid history or people route: content failure is isolated; cannot cause NaN camera or an empty unexplained final chapter.

## Files and Responsibilities

- Create content/history.json: schemaVersion, events with id/date/title/body/source/approved.
- Create src/guild-history-data.js: data validation and normalization.
- Create src/guild-history-route.js: entry/three-station view, opacity and independent time/distance sampling.
- Create src/guild-history-view.js: prepared world-space text and shade; owns only its text/shade resources.
- Modify src/people-story.js: replace closure interval with history mapping, retain legacy absolute coordinates.
- Modify src/main.js: background preparation, chapter dispatch, resize/retry/replay integration.
- Modify src/companionship.js: accept history camera/exclusion context, reuse chain assets and conservative collision gaps.
- Modify index.html and src/style.css: small history-retry/status control if needed, same existing safe-area controls.
- Font generation: locate and reuse existing font-subset command and license; emit history-only subset, never replace prior subset.
- Preserve src/guild-closure.js and src/guild-closure-view.js as unused history unless removal is needed for build; no runtime references.
- Create tests/guild-history-data.test.js, tests/guild-history-route.test.js, tests/guild-history-view.test.js.
- Extend existing tests/people-integration.test.js and tests/people-story.test.js for integration, not duplicate framework.
- Update PROJECT_STATUS.md, CODEX_HANDOFF.md, docs/README.md and a dated history release record on delivery.

### Task 1: Approved content and reversible route

**Interfaces:**
- normalizeHistory(raw) -> {events,errors}; immutable approved event order.
- createHistoryRoute(events, entryPose) -> {events,entryPose,seconds:31,distance,segments}.
- sampleHistory(route,t,aspect) -> {position,target,up,eventIndex,eventId,eventOpacity,peopleOpacity,reading}.
- historyTimeToDistance(t,route) / historyDistanceToTime(d,route) -> clamped normalized fraction.
- pose arrays have three finite components; t is normalized elapsed time, never accumulated frame state.

- [ ] Write data tests for exact three approved texts/dates and invalid empty title, duplicate ID, impossible date, unapproved event. Invalid data returns errors.
- [ ] Write route tests for entry position/target/up equality, 31-second duration, one readable event, last opacity 1, inverse mapping within 1e-6, deterministic reverse seeks, finite portrait/landscape poses.
- [ ] Run node --test tests/guild-history-data.test.js tests/guild-history-route.test.js; verify missing module/export failure.
- [ ] Add JSON, validator and route modules. First three seconds fades preceding people before event text enters. Station 1/2: 1 second enter, 6 read, 1 exit; station 3 keeps final text. Transfers: no overlapping readable text.
- [ ] Use the existing final people shot as entry and orient small side shifts along its camera-right vector with same downward direction. Clamp shift to existing Hell terrain safe coverage; if full frame coverage cannot be proved, keep position and use subtle camera distance drift rather than unsafe travel. Do not infer historical map association from visual stage.
- [ ] Use explicit monotonic segment time/distance knots and smooth local interpolation with invertible binary search; avoid new dense route tables or synchronous first-use thousands of samples.
- [ ] Run the two tests, expect pass; checkpoint task files locally. No publication yet.

### Task 2: World text, font and long-chain staging

**Interfaces:**
- createHistoryView(events,route) -> {group,prepare(),update(state,camera,viewport),resize(viewport),dispose()}.
- prepare() resolves after all three station glyphs; failure rejects and allows a fresh call.
- update uses prepared text only, applies sampleHistory opacities and updates bounded world placement.
- View exposes readingBounds for chain avoidance; owns cloned/text materials, not source geometry or shared textures.
- Companion context extends existing optional camera/exclusionBox with history route/time; original calls remain compatible.

- [ ] Write view tests for one visible text station, actual glyph bounds on 414x896 / 896x414 / 280x600, endpoint visibility, idempotent dispose and no per-update child growth.
- [ ] Add actual HD-petal spacing assertions to the existing courtyard environment test: expanded breath bounds cannot overlap the reading zone or one another; dt=0 reverse restores old chain.
- [ ] Run new view tests and extended environment test, confirm failures describe missing history behavior.
- [ ] Implement view with existing text/layout/shade conventions; sync once and fit measured glyph boxes, not character-count assumptions. Keep exact approved copy, wrap naturally.
- [ ] Generate separate history glyph subset using existing font tooling and original typeface. Load it after world startup, outside first-screen loading gate.
- [ ] Reuse companionship HD templates, existing front quaternions and v45 world-depth scale. No fixed short HUD row; chains move continuously to sides during entry and breathe slightly around deterministic anchors.
- [ ] Run targeted tests once after corrections; checkpoint task files. No extra assets or media.

### Task 3: Controller integration and Sites delivery

**Interfaces:**
- LEGACY_TOTAL_UNITS unchanged. History adds its own interval, replacing old closure units/seconds.
- chapterAt reports historyT and chapter history; sampleStoryPose routes it to sampleHistory on shared camera.
- Capture/restore uses history eventId and segment fraction, independent of member indices.
- Existing replay listener remains single, player.pause followed by progress reset.
- Failure status scoped to history; retry calls prepareHistory and preserves reading position.

- [ ] Extend existing story/VM tests to pin old absolute coordinates, history duration and inverse maps, same camera on entry, no closing sculpture construction, active autoplay replay, resize event retention, font failure and actual retry.
- [ ] Run node --test tests/people-story.test.js tests/people-integration.test.js with new assertions; verify intended failures.
- [ ] Replace closure imports/creation/update in main and people-story with new route/view. Keep openingMonument and all prior preparation paths.
- [ ] Start history preparation once after first-screen success. Failures leave existing world usable; render readable scoped status/retry without missing glyphs.
- [ ] Apply peopleOpacity only on history entry; gallery resets its own materials on reverse. Leave final history text and replay at endpoint.
- [ ] Run the new history tests and affected integration/environment tests. Change old endpoint assertions only where appended chapter requires it; keep earlier world assertions.
- [ ] Perform final code review: no shared asset disposal, no new first-screen waits, no duplicate listeners, correct cold/reverse/resize/failure paths. Avoid unrelated refactors.
- [ ] Open the existing Sites source with native get_site/credential and source helper before any hosted-source edits. Recover latest v49 if local checkout is stale; do not publish old local copies.
- [ ] Run one production build through Sites helper; preserve 21 original models and lossless transport output. Build success is not visual acceptance.
- [ ] Push exact runtime text changes using GitHub Writer to experiment/lookback-v2; save checkpoint SHA.
- [ ] Package exact helper-verified pushed Sites source, save version, deploy to same owner-private project. Bounded status polling only when non-terminal.
- [ ] Record GitHub SHA, source SHA, version/deployment IDs, tests/build results and Safari visual limits in release docs and handoff. Do not merge main or update Pages.

## Execution Handoff

Recommended: native execution by the primary agent, with targeted tests and one final review, minimizing repeated contexts and builds.
This plan still requires user review before implementation under writing-plans.
On approval use executing-plans; respect user's reduced testing/quota preference.
