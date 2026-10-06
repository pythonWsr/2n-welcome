# Five-region opening preparation

All 22 petal catalog entries across Garden, Desert, Ocean, Jungle and Hell must finish preparation before touch/scroll opens. Ground geometry must also be ready. Actual materials are compiled and mesh buffers warmed through small offscreen draws before opening the gate. There is no timeout or skip bypass. Failed resources stay in the opening with retry; slower connections therefore spend longer in the opening slow playback.

Jungle and Hell ground colors use palette samples from the supplied game screenshots: Jungle #3aa049 with #379843/#3da84d variation, Hell #963333/#a52b2b. Ground materials preserve those colors without tone mapping. Regional fog still affects distant appearance. Hell petals now start beyond the fully red side of the transition.

Ocean, Jungle and Hell camera paths add gentle lateral arcs and height changes while preserving continuous boundary velocities. Ground heights and transformed-vertex contact fitting are unchanged. The 2n monument and Garden camera path are unchanged.

Five region names are world-space sprites with depth testing, fixed world anchors and entry/exit fades; they move in perspective with the camera rather than staying attached to the screen.

Automated checks cover strict readiness, all-region offscreen warmup, palette relationships, red-ground placement, label projection, camera continuity, visibility and transformed GLB contact. Real iPhone Safari frame rate and final WebGL appearance still require device verification.
