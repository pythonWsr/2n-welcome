# Safari viewport stability checkpoint

Canvas uses a top-anchored stable large-viewport height, copy a stable small-viewport top anchor, and native story scrolling a cached six-small-viewport range. No per-frame innerHeight or scrollHeight denominator. Browser chrome reveals/crops the stage instead of reframing it.

A hidden lvh/svh probe separates transient chrome heights from real layout dimensions. Debounced resize, orientation, ResizeObserver, pageshow and foreground checks only apply changed stable dimensions. Real resize preserves normalized scroll position. No scroll prevention or visualViewport offset compensation. Old touch browsers without stable units freeze height-only changes until width/orientation changes; same-width resizing on those old engines is a known limitation.

Mocked event regression covers a toolbar height sequence, fixed progress, true height-only resize and orientation change. Build and existing tests pass. This is not iPhone Safari verification: real toolbar animation, scroll boundaries, rotation and background return still need device acceptance.

Reference: https://www.w3.org/TR/css-values-4/#viewport-relative-lengths
