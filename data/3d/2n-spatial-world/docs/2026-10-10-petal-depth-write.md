# Petal surfaces after text appears

The v72 user report establishes the trigger: moving petals without text are normal, but guild history reading and the final breathing state show broken surfaces as text appears. The earlier front alignment and atlas sampler changes did not solve that defect.

`createMemoryScene.updateTextOcclusion` enabled transparency and disabled depth writing for every instance pool whenever the text fade weight became positive. This included petals outside the text bounds whose per-instance alpha remained 1. With solid display GLBs, hidden triangles could then overwrite the front in geometry order. This exactly accounts for the state-dependent corruption rather than requiring replacement models.

A controlled CPU comparison of the actual Tomato, Compass and Iris meshes and their original atlas pixels reproduced the screenshot pattern solely by disabling depth-buffer writes: patchy tomato leaves/body, washed-out compass needle and crater-like iris. Restoring writes produces their recognizable fronts. This is explanatory geometry evidence, not an iPhone Safari/WebGL acceptance test.

The fix retains each pool's native depthWrite throughout text fading. The existing 70% alpha on petals in front of overlapping text, fully opaque non-overlapping petals, depth testing, render order and opacity recovery are preserved. The dust/light shader materials remain separate. No model assets or movement paths changed.

A regression failed on v72 before changing production code. It exercises history reading and final nextT=1 over four breathing times, toggles text phases repeatedly and checks depthWrite/depthTest plus overlap and non-overlap alpha. It passes after the correction.

Validation: complete `node --test` 295/295 passed; `git diff --check` passed; production build passed with the existing large-chunk warning. v73 published successfully to https://twon-dark-spatial-world.llhleo.chatgpt.site, retaining the original project and audience. GitHub runtime commit bafdc3c4d0f87a94f56bb82fde3e83841f5c5d01; Sites source 5a8ccc4ad1fff2f19f5c51e1de55bc3eb5eaac75; saved version appgprj_6aad813744b08191a16efff74d7ebaf0~appgver_e111998e0b2c819191aea496480cceb7; deployment appgdep_6aca4ae700d48191a64e1196786b2dce returned succeeded. iPhone Safari visual acceptance remains unverified.
