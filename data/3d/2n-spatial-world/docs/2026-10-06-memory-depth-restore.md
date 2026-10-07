# Restore full spatial story shell

User rejected the open spherical belt/native overlay composition because it lost the earlier spatial feel. Restore the petal layout, camera and lighting exactly from f97bf75f727e19965a0d3a2cf7e80cc56adb26a3. Keep the earlier continuous chain/sphere/expansion and idle movement.

Story text is again rendered in the scene. Enable depth testing on text and its reading shade: near petals may cross in front of glyphs, while rear petals remain behind. This avoids forcing every petal into a flat peripheral opening. Only story/preview rendering raises the pixel-ratio cap to 2.5 for better glyph clarity; previous world and people budgets remain unchanged.

38 relevant checks pass, including native module's unused unit check; Vite production build succeeds. Full radius/depth, collision clearance, idle movement, reversibility, resources and text depth behavior are checked. Real-phone visual acceptance is pending. No new assets; no changes to main or Pages. Unused native overlay module/styles remain dormant and do not render or load external resources.
