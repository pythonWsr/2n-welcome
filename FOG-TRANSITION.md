# Fog transition checkpoint

The camera path, sculpture, particles, material, lighting, clear color, tone mapping and exposure are unchanged.

The former three high-opacity planes are replaced by five mobile / seven desktop world-fixed fog banks. Every bank fades across a 73-unit crossing window before it reaches the camera near plane. The noise mask uses a defined smoothstep direction, avoiding cross-browser undefined output.

Global exponential fog now targets a continuous optical visibility curve from 6.5% distant silhouette to 98.5% clarity over progress 0.01–0.72. Density is derived continuously from camera-to-sculpture distance, so the rapid approach cannot accidentally produce a sudden contrast jump. Reverse scrolling follows the same curve exactly.

Automated checks bound per-sample visibility and layer-opacity changes and verify the exponential transmission equation. Actual fog appearance and iPhone compositing still require device review.
