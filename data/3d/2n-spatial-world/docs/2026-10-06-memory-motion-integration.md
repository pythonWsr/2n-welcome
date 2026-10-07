# Story motion and full-site integration

- Second-stage shell rotation increases from 0.10 to 0.28 radians/second. The existing continuous join/expansion weighting still smoothly starts and stops rotation.
- Use neutral white key/fill/ambient lights, with directional contrast retained. Colored accents affect only dust/beams. Disable fog on cloned story materials and reduce reading-shade strength from .58 to .22. Original HD geometry, maps and material colors remain unchanged.
- Third stage replaces radial pulse with independent vertical bobs. Petals have different amplitudes, periods and phases; subtract the mean offset to hold the shell center still. Rotation/lateral motion stops, collision separation remains. Motion fades in during expansion and respects reduced-motion scaling.
- Normal full-site entry already shares the same scene after members. New integration test confirms all three stages and visible story text without historyPreview. Root URL is the delivery URL; preview remains optional.

Validation: 40 related checks passed, then the updated 24-entry-test suite passed including the new full-site integration case (41 distinct related checks). Vite production build passes. Physical-phone visual acceptance pending. No new downloads, asset quality reductions, main/Pages changes or edits to earlier chapters.
