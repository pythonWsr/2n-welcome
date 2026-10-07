# Region continuity and readable titles — v32

The ground-pop issue was a visibility threshold, not missing downloads. All prepared world ground now becomes eligible together when the world opens, without later Ocean/Jungle/Hell threshold switches. The camera far plane includes the full distant world. The strict opening preparation and GPU warmup remain.

Five world-space titles use reference camera poses for fixed anchors, cropped large text textures, perspective projection and full-sprite safe margins. Titles fade before their bounds reach a screen edge. They are not a camera-attached HUD. Locked opening playback slows from 0.4 to 0.18.

Ocean and Jungle previously met with Standard versus Basic materials, producing a hard brightness/color change at x=900. Both now use the same Standard-derived ground shader. A smooth world-coordinate blend to the unlit graphic palette occurs from x=700 to x=860, before the mesh boundary. The same shader and regional fog continue through Jungle/Hell. Ground geometry and contact sampling are unchanged.

Mobile populations: Ocean 300 (100 per species), Jungle 264 (78 Peas, 64 Tomato, 56 Bur, 12 Golden Leaf, 12 Rock, 42 Compass), Hell 216 (120 Dark Mark, 96 Corruption). Desktop populations: Ocean 420, Jungle 366, Hell 300. Geometry/materials remain reused in spatially split instanced batches. Ocean face rotations now vary fully around the local feature normal; Shell/Pearl retain camera-readable feature normals.

Compass: supplied Lux3D model, Petal ID 71 in the supplied ID document, now used in Jungle as requested. The existing reviewed web copy at studies/ocean-asset-gate/compass.glb is copied unchanged to public/assets/jungle-petals/compass.glb (441296 bytes, 7227 triangles). No new generated model and no Mob.

Verification includes portrait/landscape title bounds and dwell, no distant ground threshold switches, shading continuity, actual GLB support contact, feature-normal readability and all-region preparation. Real Safari WebGL rendering and frame rate still need iPhone verification; no passing visual/device QA is claimed.
