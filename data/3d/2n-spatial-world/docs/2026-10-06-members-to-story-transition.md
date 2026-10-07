# Continuous members-to-story departure

The story helper previously hid all terrain and assigned the first story camera immediately, producing a hard cut. It also sampled the first text fade from time zero.

- Reserve the existing first four story seconds for departure; keep the 36-second story and distance/time mapping unchanged. First text now begins after four seconds, with the existing .8-second fade.
- Start from the actual final member camera. Lift 130 world units and retreat 55 units along its back axis before traveling to story coordinates. Camera and chain frame are sampled from absolute progress, allowing reverse scroll and direct seeks.
- Capture the visible HD companion instance poses in the final member camera frame; matched story instances inherit their initial position/orientation/scale. They follow the departing camera and ease into the established story chain positions. Additional chain instances gently grow in. No added assets or fetches.
- Keep terrain visible for the lift, progressively blend its fog/background, and retire it before crossing coordinate spaces. Member names fade during the first second. Old companion group is replaced by the matching moving story instances to avoid duplicates. Colored dust/beams follow the same frame, including directional-light targets.
- Main root passes entry pose and retirement groups; isolated historyPreview keeps the independent layout. Existing faster second-stage rotation, neutral lighting and final individual vertical bobs are preserved.

Validation: 43 related checks passed; additional actual HD-instance handoff check and focused scene/entry reruns passed (44 distinct relevant checks). Final production build passes. Checks cover start/end camera, lift clearance, continuity, reverse sampling, camera-follow projection, original visible instance pose/scale, world retirement/restoration, first-text delay, normal-root three-stage story, previous scene behavior. Physical-phone visual acceptance remains pending. Main/Pages unchanged.
