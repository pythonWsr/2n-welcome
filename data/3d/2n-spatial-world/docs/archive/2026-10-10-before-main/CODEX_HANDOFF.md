# Codex 接续入口

## 2026-10-07 结尾开放弧接续

参见 [结尾右侧开放弧](docs/2026-10-07-ending-open-arc.md)。`feature/ending-open-arc` 基于最新 perf 分支，保留加载与托管配置；只改结尾落位路径，原三幕及镜头不变。本轮不合 main、不推公开生产分支，原 Sites 单独部署。后续发布必须继续先读下方部署指示，不能以此视觉更新宣称四站同步。

## 2026-10-07 加载与部署优先交接

先读 [托管入口与 main 自动更新指示](docs/deployment/hosting-and-updates.md)。两主站是 GitHub Pages 和 https://2n.llhleo.top/；五家模型候选为 CF、EdgeOne、Vercel、Pages、jsDelivr，三路并发，默认隐藏日志。当前加载优化发布分支 perf/free-mirrors-2026-10-07，最新运行时1f508c5。**main 自动同步尚未统一，合并前必须处理 Pages 触发分支与 CF/EdgeOne 生产分支；不能宣称已经配置完成。** 后续添加模型也须沿用无损构建、commit固定CDN及完整校验，具体步骤见链接。以下视觉历史交接继续有效，但旧“不更新 Pages”记录不覆盖后续用户明确发布授权。


最新优先：docs/2026-10-06-history-landing-occlusion.md。手动进入历史在第8秒第一段完整显现处重置滚动目标，不再追赶猛滑到后段。第三幕前景重叠花瓣按投影动态调整到约70%不透明。

最新优先：docs/2026-10-06-manual-entry-speed.md。手动离场局部限速，自动播放不变；更新三个标题及对应缺字。

最新优先：docs/2026-10-06-chain-spacing-dust.md。原链交接初段整理不均匀角间距，保留原实例；尘埃覆盖实际运镜视野。只改故事场景，不改相机与地图。

最新优先：docs/2026-10-06-continuity-root-fix.md。原实例交接取代补链；地图固定，镜头复用 motionPath。过渡保留原雾效，地狱新增静态封闭侧壁。手机视觉验收尚未完成。

最新优先：读取 docs/2026-10-06-glide-chain-date.md。已根据手机反馈调整镜头缓慢掠行、连续长链和日期主导排版。以下旧记录仅作背景。

优先读取 [花瓣记忆廊预览记录](docs/2026-10-06-memory-corridor-preview.md)。新构图已部署专用 `?historyPreview=1` 入口；先等待构图反馈，再继续三幕连续动画。不要将本阶段称为完整36秒故事已完成。方案与计划在 `docs/superpowers/`，旧主入口暂时保留。


当前原 Sites 已发布工会历史三站，先读 [发布记录](docs/2026-10-05-guild-history-release.md) 和 [项目状态](PROJECT_STATUS.md)。从 GitHub 开发分支 `experiment/lookback-v2` 接续，不使用旧本地 v49 源码覆盖已完成内容。

1. 已完成三段批准历史，独立编辑 `content/history.json`；人物仍编辑 `content/people.json`。不补造历史事实。规格与计划在 `docs/superpowers/`。
2. 核心代码：`guild-history-data.js`（校验）、`guild-history-route.js`（31 秒可逆采样）、`guild-history-view.js`（三站文字/局部暗底/字体重试）、`guild-history-font.js`（延迟字体）；共用控制器在 `people-story.js` 与 `main.js`。
3. 保留首页金属 2n、高清模型、七个花朵、五区、原旅程、人物与 v45 世界长链。收尾金属模型已停用；收尾设计暂停，不复制首页动画。
4. 最终 215 项检查通过，生产构建通过，审核三项重要异常均已修复。手机真实视觉/GPU 验收尚未做，不把单元检查当作实机验收。
5. 下一步先验收人物至历史衔接、文字换行、长链遮挡和反向滑动，再做小范围润色。未来新收尾需另行设计。
6. 本轮只更新开发分支及原 Sites；不修改 GitHub main/Pages 或旧 Llhleo/2n。先核对当前线上版本与最新 GitHub，再行动。
7. 发布时使用官方 Sites helper。环境 Git 曾使现有文件被还原；使用系统 Git 的 PATH 后 helper 核对推送与归档成功。先保留独立工作源码，绝不发布源码不一致的归档。遇到阻塞先 checkpoint 再改用可用工具。
8. 减少重复完整测试与审阅；仅因新增修改或重要失败再次验证。已完成资源和历史文档不删除。

此前接续内容见历史发布记录和 `docs/archive/`。


## 已发布：立体花瓣记忆廊（2026-10-06）

- 实现提交：62c63a7f9ecfcf8cb8b94771ef0f1000e5d077b2
- Sites 来源提交：2f10e9d76831d07f23db7052c49c5636009e2823
- 部署：appgdep_6ac4836ec1308191801d9095c581761c，状态 succeeded
- 地址：https://twon-dark-spatial-world.llhleo.chatgpt.site；直达故事预览：https://twon-dark-spatial-world.llhleo.chatgpt.site/?historyPreview=1
- 正式故事和预览均支持滑动切换文字与立体包围，同一批高清花瓣连续迁移；main / Pages 未改。
- 后续：先做真实手机视觉验收，再安排花朵点缀和人物到故事入口的衔接润色；不可重新制作已完成的开头、五境或人物模块。


## 2026-10-06 · 三阶段故事已发布

- 代码提交：880339973a01f8d8f07cae79eaa2de2438c86da5
- Sites 来源：1b88e1a41bd394ebdd96adad8ef3e2f5aaa4c204
- 部署：appgdep_6ac487ec397081919a901fc91f036d4f，succeeded
- 地址：https://twon-dark-spatial-world.llhleo.chatgpt.site；故事直达：https://twon-dark-spatial-world.llhleo.chatgpt.site/?historyPreview=1
- 双链交错 → 球壳包围慢转 → 扩展停转、呼吸浮动。日期/标题/正文共同靠左；尘埃连续保留。35 项相关测试及构建通过。
- 待办：真实手机视觉反馈、花朵点缀、人物至故事入口润色。不要重做已完成部分，不修改 main / Pages 或旧 2n 仓库。


## 2026-10-06 · 双链与球壳修复已部署

代码：f97bf75f727e19965a0d3a2cf7e80cc56adb26a3；Sites 来源：6b4e96e15785220129dfa2338b2aa83250a38f63；部署 appgdep_6ac49a47ca2481919294b009fa2ece91 已成功。
地址：https://twon-dark-spatial-world.llhleo.chatgpt.site/?historyPreview=1。
已移除使球体变方的屏幕矩形位置推移，增加可感知的长链呼吸，平衡第三幕前景尺寸。减少动态效果保留低幅呼吸并关闭自转。37 项相关测试和构建通过；真实手机视觉验收待用户反馈。详细记录 docs/2026-10-06-memory-motion-fix.md。main / Pages 不变。


## 2026-10-06: story reading aperture, crisp text and original petal colors

- Runtime GitHub commit: c19fe9bf1aaf31c655da0a7db55d3aa238fb1d5c, experiment/lookback-v2 only.
- Sites pushed source: 7b6fdcdf50449ed3a24bdc2d1b676f7f82270714.
- Successful deployment: appgdep_6ac4ab6e75e48191968a8c930159e380.
- Preview: https://twon-dark-spatial-world.llhleo.chatgpt.site/?historyPreview=1
- Native DOM story text replaces active SDF draw (which remains fallback); no dark reading shade over HD petals. Open spherical belt targets reserve the central reading space while maintaining real front/rear depth and continuous chains/shell/expansion. Neutral white light and fog-free cloned story materials preserve source colors; dust/beam accents remain colored.
- 40 targeted checks pass; Vite build passes. Real-phone visual acceptance pending. Do not alter main/Pages. Detail: docs/2026-10-06-memory-reading-fix.md.


## 2026-10-06: restore full sphere, allow petals in front of story text

User rejected the peripheral open-belt composition. Current deployed runtime is e6003b8e0369a0f9772ad7e203dc6a5bb961edf7 (experiment/lookback-v2). Layout, camera and model lighting restored from f97bf75. Story text is again in the 3D scene with depthTest=true, including its shade, so foreground petals can occlude glyphs naturally; story/preview DPR cap is 2.5. Full spherical depth, chain breathing and continuous transitions are preserved. Do not restore the open belt/native overlay unless requested.

Sites source 042f481cbd3f0d4e91bb08e30eb7e1aa075c0676; successful deployment appgdep_6ac4c20ce3d0819196f4424f70573fc2. https://twon-dark-spatial-world.llhleo.chatgpt.site/?historyPreview=1

38 targeted checks and production build pass. Phone visual acceptance pending. Initial archives were truncated; regenerated complete archive with identical dist/manifest and verified gzip integrity before successful upload. No main/Pages changes. Detail: docs/2026-10-06-memory-depth-restore.md.


## 2026-10-06: faster sphere / original colors / independent breathing, full-site delivery

Runtime GitHub: 5ef7e818c1b0d01a5299fd6edde02cff4a6e4104. Sites source: ef3c6b20667e987734bdc2bd92c30bd5a38da86d. Deployment appgdep_6ac4d3c400748191a214f38927752671 succeeded.

Deliver full-site root https://twon-dark-spatial-world.llhleo.chatgpt.site (story follows members); preview query remains optional. Stage-two rotation is .28 rad/s (2.8x prior) with continuous weighting. White directional/key/fill lights plus fog-free cloned models restore source colors without flattening geometry; dust/beams retain stage accents and shade is .22. Final petals bob individually in Y with differing periods/phases/amplitudes and mean-offset subtraction, holding the shell center fixed. Keep full spherical shell and foreground text depth occlusion.

41 distinct relevant checks passed across targeted runs, including normal root three-stage integration, independent signed Y movement and stationary center, stopped final rotation, neutral light and unchanged original material colors; production build and archive integrity passed. Real phone visual acceptance pending. Main/Pages and earlier chapters unchanged. See docs/2026-10-06-memory-motion-integration.md.


## 2026-10-06: continuous member-map departure into story

Runtime GitHub 8233ed12202f1a98758de4c608b437400928a8f3. Sites source 0001a35def6a2e98d4c11772c9b877d1b079c0ee. Successful deployment appgdep_6ac4d72bbadc8191a2204d9dd4880e03. Root https://twon-dark-spatial-world.llhleo.chatgpt.site

First four existing story seconds now lift/retreat from the actual last member camera, follow with captured HD chain instance poses, retire terrain through fog before traveling between coordinate spaces, and arrange the first story chains. First story text starts only after arrival. Member names fade in the first second. Absolute camera/frame sampling supports reverse and direct seek. Story lighting targets/dust/beams follow the same frame. Subsequent sphere/individual bobs unchanged. Standalone historyPreview intentionally has no map departure.

44 distinct relevant checks pass across targeted runs, including actual original HD-instance initial world pose/scale and follow projection, start/end continuity, lift, world retirement/restoration, delayed text and normal root integration. Final build and archive integrity pass. Phone visual acceptance pending. Main/Pages unchanged. See docs/2026-10-06-members-to-story-transition.md.


## 2026-10-06: camera departure and left-to-right chain handoff corrected

- Published Site source: 00d3a382494b9ea5774f9cae9a140bb2de403caa; deployment appgdep_6ac4da784050819199e81887c172293a succeeded at https://twon-dark-spatial-world.llhleo.chatgpt.site.
- Corrected map handling: world/terrain roots remain fixed and renderable while the camera lifts and retreats; transition no longer hides/moves the map. The member chain is replaced by its captured story copy.
- Chain handoff now captures poses in story-camera space and pairs identical HD petal assets left-to-right; both story chains start off the left edge and enter toward the right. Camera lift/retreat enlarged for a clear departure before the dark story setting.
- 35 relevant tests and production build pass; archive integrity checked. The GitHub development branch contains this checkpoint only; main/Pages are unchanged. Real-device visual confirmation remains pending.


## 2026-10-06 Camera-chain departure checkpoint
Members → guild memory now uses a fixed story world frame outside the final map. Terrain position/rotation/scale/opacity and transition fog remain unchanged. Camera follows an outward/upward curve; member clones are recognized by asset key and rebased geometry is normalized when capturing their exact rendered world poses. Captured chains retain global branch order; heads lead full-size followers entering from the left. Followers have independent sliding coordinates while following camera flight, then settle into fixed story locations before text fades in. Opening monument is suppressed only during memory rendering. Resize invalidates entry capture. Stage 2 rotation and stage 3 individual bob preserved.
Validation: 38 related tests passed; production build passed; fresh independent review found no blockers. No mobile browser visual QA this round (supported control-browser capability unavailable). Do not claim iPhone visual acceptance. Check the published transition on device before broadening scope. GitHub main/Pages unchanged.


## 2026-10-06 Slow glide / connected chains / date hierarchy
Departure lasts seven seconds with more scroll distance, a low initial control point and delayed camera rotation. Map remains stationary. Captured member chain slots reflect projected spacing; missing followers interpolate the same angular chain instead of starting elsewhere with delays. Actual member poses and assets retained. First date fades after seven-second arrival. Date font ~46px, title23px, body16px; aligned left. Stage2/3 unchanged. Validation: 44 focused tests and build passed; independent reviewer found no blockers. On-device visual acceptance pending; no supported browser-control skill available here. GitHub main/Pages untouched.
