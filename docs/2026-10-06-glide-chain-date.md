# Slow departure, continuous chains, date-first story

Latest user feedback: the terrain seems to move away too fast, chains break halfway, and dates should dominate story copy.

The terrain remains stationary with no transform, opacity or fog-fade animation. Entry is now seven seconds and 1.25 scroll units (previously four seconds and .75). Camera first glides horizontally along the terrain; raising and turning happen later. The fixed story frame is lower and farther outward.

The gap was caused by grouping captured petals at the end of the new chain while giving additional followers separate starts and delays. Capture now assigns slots from actual screen spacing, preserves asset identities and interpolates missing points between existing member petals. Both branches follow a continuous angular path using the same progress. No scale-zero spawning.

Date is the primary landmark (~46 CSS pixels at 414 width); title is23 and body16. All remain left aligned. Body uses a softer readable color. Approved copy and dates remain unchanged. First date fades after arrival at seven seconds; stage two and three timing stays unchanged.

Checks: 44 related tests passed, including low initial camera rise, chain projected gap, exact cloned member pose, leader direction, text hierarchy/wrapping, resize, reverse sampling and stages two/three. Production build passed. Independent review found no blocking issues. Mobile visual check remains pending; supported browser-control skill is unavailable in this environment.
