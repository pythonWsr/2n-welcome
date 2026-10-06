# Jungle visibility / loading slices / Hell first gate — 2026-09-30

## Preserved

2n geometry, Hero/particles, Garden geometry/palette/instances and camera are unchanged. Earlier chapters retain 6 + 8 + 6 + 4 viewport units; Hell adds four (28 total). No Mob and no new AI model generation.

## Loading and colour fixes

- Desert, coastline, Ocean, Jungle and Hell support fitting runs through one CPU queue with a 3 ms target slice, yielding every 256 vertices. The same full transformed-vertex support is retained: no bounding-box substitute and no loss of terrain contact. Download/parse still has a bounded two-job queue and finite timeout/retry.
- All five biome catalogs begin preparing at startup. Jungle visibility starts at camera x280, before Ocean's x305 opening, instead of x610. Hell visibility starts x735, before Jungle's x786 opening. Download completion on an arbitrarily slow network is not guaranteed.
- Ocean-to-Jungle palette completes by x900. Cloned Ocean/Jungle/Hell materials use world-position regional fog; distant Jungle gets green fog even while the camera remains in blue Ocean. Garden materials are not changed.
- Jungle's first spatial batches now occupy x828–928, including the green shoreline. A portrait-frustum test checks that petals are actually in the early Ocean shot, not merely flagged visible. Regional fog caps at 78% in deep Jungle/Hell to retain distant silhouette contrast.
- Existing experimental intro stays at 40% playback speed with its skip, failure, timeout and reduced-motion release paths. Reduced CPU blocking is not a claim of a measured Safari frame rate.

## Jungle accents

Mobile: Peas 66 + Tomato 52 + Bur 48 + Golden Leaf 10 + Rock 10 = 186. Desktop: 90 + 72 + 66 + 14 + 14 = 256. Twenty mobile accent instances (10.8%) use existing Garden GLBs, independent scatter seeds, small scale and terrain-fitted varied poses. They are auxiliary reuse, not newly classified Jungle-native petals.

## Hell asset provenance

| Model | Supplied file | Petal ID | Mobile / desktop instances | Web bytes | Triangles |
| --- | --- | --- | --- | --- | --- |
| Dark Mark | /florr3D模型/lux3d_model_mark.zip → 红色五角星.glb | 61 | 72 / 96 | 428372 | 7184 |
| Corruption (user red variant) | /florr3D模型/lux3d_model_corr.zip → 红色骷髅头.glb | 80 | 54 / 72 | 376568 | 7611 |

IDs follow the supplied `02-florr-id-.txt`. Community appearance check: https://official-florrio.fandom.com/wiki/Dark_Mark describes the red pentagram; https://official-florrio.fandom.com/wiki/Corruption describes a grey translucent angry skull. The uploaded red skull is therefore a user-created colour adaptation, **not an exact official-colour reproduction**. Official SVG fetch was unavailable; do not describe these 3D files as official models. Original uploads are untouched.

Runtime copies retain source textures with six-view silhouette overlap ≥98.7%; source hashes, size reduction and CPU preview sheets are in `studies/hell-asset-gate/`. Side/top views show a thick badge-like source shape; no claim that these are newly generated round organic forms. Runtime poses expose their recognizable fronts. Hell uses a muted dark red irregular palette/heightfield blend from Jungle, rather than a hard tile swap. 126 mobile / 168 desktop instances occupy three spatial groups per type, including the transition.

## Acceptance boundary

Tests cover async yielding with identical placement matrices, exact support against rendered triangles, early visibility/preload, green Jungle ground/fog, accent minority, and Jungle-to-Hell camera position/velocity continuity. Asset six-view previews are CPU texture projections, not actual Safari/WebGL screenshots. Browser QA cannot run without the required control-browser skill. This remains a first Hell visual gate: user review of mobile colour contrast, framing, cold-load smoothness and perceived density is required.
