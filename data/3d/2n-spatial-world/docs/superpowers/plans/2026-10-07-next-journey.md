# 下一程，仍然同行 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已发布的三段工会历史之后，追加 16 秒连续三维收束，不改变已有章节的实际节奏或花瓣身份。

**Architecture:** 延用 `createMemoryScene` 的实例池、材质、尘埃和光束。新增纯函数计算结尾阶段、每个现有花瓣的位移以及相机姿态；在既有 36 秒历史之后追加独立时间段，不改历史采样。结尾文字另建视图，避免改变现有日期层级。

**Tech Stack:** Three.js、troika-three-text、Vite、Node test runner。

**Spec:** `docs/2026-10-06-next-chapter-proposal.md`，以及本轮用户对该方案的继续指令。

## Global Constraints

- 基线为 `Llhleo/2n-spatial-world` main `85179de8179f299165d494948d6473e941174713`；开发文档父提交为 `01549a4b91ecfe5482bddd993e8d264a44a3b1cc`。
- 旧仓库 `Llhleo/2n` 不得改动；当前 Pages 在新章节验收之前保持现状。
- 不重复金属 2n 模型，不重新划过五境，不增加花瓣来掩盖衔接问题。
- 使用捕获的同一批花瓣 ID、几何与材质，不新增模型下载或新的实例池。花瓣独立运动，不能把球壳集体旋转作为结尾。
- 地图的 position、quaternion、scale、材质与透明度均不参与结尾动画；只驱动相机与现有花瓣。
- 手动进度仍能反向还原；原有历史入口猛滑保护和首段落点不变。
- 原有 36 秒历史和之前章节的自动播放时长保持不变，仅末尾追加 16 秒。
- 结尾统一靠左：标题“下一程，仍然同行”；正文“五境里留下的足迹，还会继续延伸。”；署名使用普通文字 2n。
- 结尾入口为“重新观看”“回到五境”，不虚构入会地址。

## Review Focus

- iPhone Safari 惯性滚动：增加结尾后，历史第一段仍必须先落稳，不能因总长度变化失效。
- 历史/结尾边界反复往返：同一时刻的花瓣位置、材质、相机连续，不重新捕获人物链。
- 横竖屏切换：文案、按钮留在安全区，现有花瓣 ID 和数量不变。
- reduced-motion 或自动播放中途接管：不发生镜头跳跃，不锁死滚动。
- 字体加载、WebGL 资源生命周期：新文案字形完整，失败可重试，释放不影响历史视图共享资产。

## 当前代码核对结果

- `people-story.js` 的 `TOTAL_UNITS` 目前是旧章节加 `HISTORY_UNITS`；`chapterAt` 尚无下一程分支。
- `guild-memory-layout.js` 的 `sampleMemoryStory` 固定采样 36 秒，三段构图不能直接延长到第四段，否则会改变原有历史的时间。
- `guild-memory-scene.js` 已有实例池与每帧真实位置；结尾应在现有呼吸、避碰计算之后叠加位移，不能新建一批花瓣。
- `guild-memory-preview.js` 每帧恢复相机/可见性；下一程必须仍经同一个渲染入口，否则环境灯光、深度与字形遮挡会再次跳变。
- `main.js` 已有历史入口限速、重置猛滑余量，以及 `replay` 按钮；追加章节时需要延续这些控制，而不是绕开。
- 不复用 `guild-closure-view.js`：它仍从 opening monument 克隆金属模型，与本次设计相反。

### Task 1: 独立时间段与可逆采样

**Files:** Create `src/guild-next-route.js`; Modify `src/people-story.js`; Test `tests/guild-next-route.test.js`, `tests/manual-history-entry.test.js`。

**Interfaces:** Produces `NEXT_SECONDS=16`, `NEXT_UNITS=3.2`, `sampleNext(t)` 返回 `{nextT,opening,historyOpacity,nextOpacity,buttonsVisible}`。`chapterAt` 返回 `nextT` 并新增 `next` 章节。历史 `historyT` 在下一程中保持 1。

- [ ] 写行为测试：`sampleNext(0)` 的 historyOpacity=1、opening=0、nextOpacity=0；3 秒时历史文字淡出；10 秒时通路打开；11 秒后结尾字形完整；14 秒后按钮可用；采样非法/超界值有限且钳制。
- [ ] 测试旧绝对进度位置的 chapter、historyT、peopleT 与新增前一致；新结尾支持 story/scroll/autoplay 往返，原历史入口落点常量不变。
- [ ] Run `node --test tests/guild-next-route.test.js tests/manual-history-entry.test.js`。Expected: 新结尾行为失败，旧入口测试通过。
- [ ] 实现独立尾段；所有旧时间分支先保持原算法，只为越过旧末尾的部分增加映射。0–3 秒余韵，3–10 秒开路，10–16 秒落点。
- [ ] Run 同一测试命令。Expected: 全部通过。Commit `feat: append reversible next-chapter timeline`。

### Task 2: 同一批花瓣打开纵深通路

**Files:** Create `src/guild-next-motion.js`; Modify `src/guild-memory-scene.js`, `src/guild-memory-preview.js`; Test `tests/guild-next-motion.test.js`, `tests/guild-memory-scene.test.js`。

**Interfaces:** Consumes Task 1 `sampleNext(t)`。Produces `nextPoint(anchor,expandedPoint,nextT)` 返回 xyz 数组，`nextCamera(expandedPose,nextT)` 返回 `{position,target}`；expandedPoint 是本帧原有球壳呼吸与避碰完成后的坐标，expandedPose 是原第三段的实际镜头。

- [ ] 写测试：t=0 与输入位置和镜头完全相同；t≤3/16 不开路；3/16–10/16 单片平滑舒展；不同 anchor.u/branch 具有不同的纵深落点；同一 t 重采样一致；边界有限差分速度连续；IDs/实例数量/共享材质不变。
- [ ] Run `node --test tests/guild-next-motion.test.js tests/guild-memory-scene.test.js`。Expected: 下一程运动测试失败，旧场景测试通过。
- [ ] 实现位移：从本帧 expandedPoint 出发，通过端点零速度的五次 smoothstep 向两侧舒展；branch 指定左右侧，u 决定纵深与高度，不通过数组槽位识别花瓣。每片仍有独立呼吸，近景经过屏幕边缘，远景延伸向光束。
- [ ] 在相同 story frame 内只给现有 locations 添加位移；相机在 3–10 秒缓慢向通路前行，起点严格来自第三段镜头。`renderMemoryPreview` 增加可选 nextT，缺省时旧输出不变。
- [ ] Run 同一测试命令以及 `node --test tests/continuity-root-fix.test.js tests/memory-chain-spacing.test.js`。Expected: 全部通过。Commit `feat: open existing petal shell into a depth corridor`。

### Task 3: 清晰结尾字形与真实导航

**Files:** Create `src/guild-next-view.js`; Modify `src/main.js`, `src/style.css`, `index.html`; Test `tests/guild-next-view.test.js`, `tests/guild-next-integration.test.js`。

**Interfaces:** Produces `createNextView()`，API 与历史视图一致：`group`, `readingBounds`, `prepare()`, `resize(viewport)`, `update(state,camera,viewport)`, `dispose()`。Consumes nextOpacity，位置来自最终镜头焦点。准备过程检查所需字形，不盲目复用缺字的历史字体。

- [ ] 写测试：准确文案、全靠左、字号层级、边界与前景遮挡使用实时 readingBounds；起点隐藏、11 秒可读；字号和按钮在 390×844、430×932、844×390 安全区；dispose 不释放共享历史字库/模型。
- [ ] 写集成测试：下一程仍由同一 memory 场景渲染，人物入口仅在首次历史进入捕获；“重新观看”重置 player 与 scroll，“回到五境”使用 Garden 起始绝对进度，而非页面像素硬编码；两按钮触摸不被接管监听误判。
- [ ] Run `node --test tests/guild-next-view.test.js tests/guild-next-integration.test.js`。Expected: 新视图和导航缺失导致失败。
- [ ] 添加非金属 2n 文字署名。新视图只负责自己字形，历史视图在余韵阶段淡出，两个文字区域不同时完整可见。导航使用原有播放/滚动控制，添加键盘焦点与触摸安全区。
- [ ] 所需中文必须检查字库覆盖；有缺字时只补所需字形，不依赖外部字体网络下载。动态前景透明度仍由投影与文字前后关系计算，不按特定花瓣固定处理。
- [ ] Run 同一测试命令。Expected: 全部通过。Commit `feat: add next-chapter message and return controls`。

### Task 4: 全流程回归与交付

**Files:** Test `tests/guild-next-integration.test.js`; Create `docs/2026-10-07-next-chapter-handoff.md`。

**Interfaces:** Consumes Tasks 1–3 已完成接口；Produces 验证记录与待实机检查项。

- [ ] 添加 reduced-motion 切换、自动播放接管、猛滑历史入口、历史/下一程多次往返与 resize 测试；缺失行为先看到失败，再修复。
- [ ] Run `node --test test/*.test.js tests/*.test.js`。Expected: 既有 247 项及新增测试全部通过。
- [ ] Run `npm run build -- --base=/2n-spatial-world/`。Expected: 成功，仅记录既有体积 warning；不降低纹理/模型质量来压缩资源。
- [ ] 按完整故事检验而非单独 demo：历史第三段→余韵→开路→落点→重播/返回；真实 WebGL 与 iPhone Safari 检验不能用 Node 测试替代。若环境不支持 WebGL2，明确记录视觉未验收。
- [ ] 最终独立代码审查重点关注上述 Review Focus；提交代码与进展到新功能分支，保留当前 Pages。获得发布指令后再通过 PR 部署，不擅自覆盖正式站。

## 本轮状态

计划已依据当前线上代码完成，尚未修改运行时。按 Superpowers writing-plans 的交接门槛，需确认该实施计划后开始实现；建议 Native 执行，三项核心任务顺序依赖较紧，每步测试并提交，末尾一次独立审查。
