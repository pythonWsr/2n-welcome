# Camera and chain departure implementation plan

Goal: continue the members' petal chains into the guild story while the map remains fixed. Approved by user on 2026-10-06.

Constraints: terrain transforms/material opacity remain unchanged; camera never returns to opening; fixed world story frame; cloned HD member meshes retain their rendered size; chain heads travel left to right; story text appears after arrival; preserve shell rotation and independent breathing.

1. Replace the camera-relative story transform with a fixed world frame outside the last member region. Add regression checks for frame invariance and outward departure.
2. Identify cloned member assets by key; convert their geometry-normalized world poses into the fixed story frame. Stagger chain followers along curved paths, with new followers entering from offscreen at full size.
3. Remove fog fading and exclude the opening monument from history rendering. Use the transformed reading target for text.
4. Run focused tests and build, review the diff, checkpoint development branch and publish the private Site.
