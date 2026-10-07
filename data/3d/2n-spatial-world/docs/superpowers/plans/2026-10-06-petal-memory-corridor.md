# 花瓣记忆廊 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 将历史原位换字替换为独立空间内的三幕花瓣记忆廊，先交付构图预览，再完成连续动作。
**Architecture:** 纯布局/路线采样与 Three.js 显示分离。独立故事 group 复用现有高清资源；环境交接只由章节进度控制，反向滚动恢复原场景。保留既有文案、字体局部重试与旧章节坐标。
**Tech Stack:** Three.js 0.180.0、Troika 0.52.4、Vite 6.1.0、Node test；不新增依赖。
**Spec:** docs/superpowers/specs/2026-10-06-petal-memory-corridor-design.md

## Global Constraints
- 前面的五境、人物、v45 长链、高清资源和首页动画不改；故事不使用五境地表。
- 保留花瓣长链、尘埃、柔和斜光束。不复刻首页金属 2n、轮廓、动画、汇聚圆环或揭幕打光。
- 36 秒、6.4 单位；0–4 入场，4–12 相遇，12–15 转场，15–24 血祭，24–27 转场，27–36 繁盛。
- content/history.json 文案不改；没有确认种类前不指定首个 Unique 花瓣。
- 主体实例手机 ≤96、桌面 ≤144；尘埃手机 ≤240、桌面 ≤480；无新增下载、无降质、无全屏 bloom 或新增动态阴影。
- 正文18–20 px、标题28–34 px、日期14–16 px；无硬描边，阅读区避让。
- 阶段 checkpoint 到 experiment/lookback-v2；原 Sites 发布；main/Pages 与旧 Llhleo/2n 不改。

## Review Focus
- 快速跳到末端或反向回人物：只显示所属章节，原雾/灯光/地图正确恢复（Task 2、3）。
- 高清源迟到或缺少：不新增请求、不崩溃，已有模型安装后正确显示（Task 1）。
- 非对称模型及微浮动：用实际世界包围球保持间隙，最小屏幕也不穿文字（Task 1、3）。
- 字体超时、横竖屏变化：旧异步结果不覆盖新布局、重试有效（Task 3）。
- 重播/重复进入/释放：无重复实例池、不销毁共享资产、首屏 gate 不增加（Task 1、2）。

## Task 1：三幕关键构图与原 Sites 预览
**Files:** 新增 src/guild-memory-layout.js、src/guild-memory-scene.js、tests/guild-memory-layout.test.js、tests/guild-memory-scene.test.js；修改 src/main.js、src/companionship.js、src/atmosphere.js；保留生产旧行为默认值。
**Interfaces:**
- createMemoryLayout({mobile,assets,seed=260206}) -> {anchors,shots,bounds}；assets 每项 {key,radius,faceQuaternion}，radius 是显示缩放后世界球半径；anchor 有稳定 id/key、三幕位置、尺寸、朝向。
- createMemoryScene({mobile}) -> {group,install(source,kind,name),prepare(entryPose),setPreview(index),update(state,camera,dt),dispose()}；geometry/texture 共享，独立材质 owned。
- companionship 安装完成回调暴露实际 display geometry/material；不再次调用 loadPetal。atmosphere 返回 setVisible(value)，默认 true。
- 预览通过显式 ?historyPreview=1 进入，正常站点暂不启用新动画；提供三个可点选构图，不自动滑动。该入口只切镜头，不预加载一批新资源。

- [ ] 写布局失败测试：两次同 seed 返回同 id/坐标；主体数量预算；三个 shots 构图不同；球半径+两侧呼吸幅度+.1 间隙；三幕中段不组成闭合环/旧固定上下两排。
- [ ] node --test tests/guild-memory-layout.test.js 验证新增模块缺失时失败。
- [ ] 实现布局：入口姿态建立局部正交基；拱沿两支开放曲线、第二幕一支下弯上扬曲线、第三幕不对称分支花冠。局部世界单位关键镜头 position/target 初值分别 [0,0,70]/[0,0,0]、[16,-8,62]/[0,-4,-18]、[0,8,105]/[0,0,-30]，最后按真实模型包围球缩放整体。阅读走廊 x±.76、y±.4 NDC 无近景主体。
- [ ] 写/运行 scene 失败测试：同源安装幂等、迟到安装可用、无额外 fetch、dispose 不释放共享 geometry/texture、重复 prepare 无重复池。
- [ ] 实现实例显示、深蓝灰空间、最多3束柔光、预算内尘埃；暖白/暗红/淡金三幕灯色。无需追求最终动效。
- [ ] 接原 Sites 预览入口；使用默认关闭的新环境开关，不改变正常前半段。
- [ ] 运行上述两文件针对性测试；生产构建一次；GitHub checkpoint；官方 Sites helper 打包/推送/部署原站；保存准确 SHA 与预览 URL。
- [ ] 向用户展示三个构图，明确仅构图预览；依据规格等待构图反馈后进入 Task 2。

## Task 2：连续路线、长链形态与环境交接
**Files:** 修改 src/guild-history-route.js、src/guild-memory-layout.js、src/guild-memory-scene.js、src/people-story.js、src/main.js、src/companionship.js、src/atmosphere.js；新增 tests/guild-memory-transition.test.js；更新 tests/guild-history-route.test.js。
**Interfaces:**
- createHistoryRoute(events,entryPose) 保持接口，增加 frame 与 shots；sampleHistory(route,t,aspect) 保持原字段，增加 memoryWeights:[3]、environmentWeight、chainPhase、textAnchor。
- sampleMemoryAnchors(layout,state,time) -> anchors；相同 id 在各幕间连续迁移，不替换随机集合。
- createMemoryScene.update(state,camera,dt) 更新有限实例；前半程 install/prepare 在空闲帧执行，不加入 gpuReady 加载门槛。
- 可逆环境权重作用于旧 world/flowers/companionship、旧 atmosphere 和独立 memoryGroup；不透明物体退场用章节局部淡化控制，禁止突兀隐藏贴近镜头的地面，且必须还原原材质值。

- [ ] 写/运行失败测试：t=0 position/target/up 与人物终点吻合；各边界前后 position/target/anchors 接近；对任意 t 正倒采样相同；无 NaN；36秒/6.4单位双向映射往返误差<1e-8。
- [ ] 替换 3% dolly。时间结点 [0,4,12,15,24,27,36] 对应距离 [0,.7,2.2,2.7,4.5,5,6.4]；空间镜头与形态采用端点速度连续的插值。阅读段只轻微漂移。
- [ ] 入场沿已有最终长链方向连接新链；过渡期间按空间遮挡/淡化交接，旧固定两排不残留；长链不缩成点再出现。
- [ ] 写/运行环境失败测试：people→history→people 恢复 group 可见性、材质 opacity、灯光、雾；快速跳段无残影；重播无重复池；旧尘埃与新尘埃不双重叠加。
- [ ] 实现环境交接与第二幕顺序下沉/翻转/升起、第三幕分支展开，呼吸 amplitude 上限参与间距。
- [ ] 运行上述相关测试；保存 checkpoint，不无理由重复全套检查或构建。

## Task 3：文字、播放、失败路径与最终发布
**Files:** 修改 src/guild-history-view.js、src/main.js；更新 tests/guild-history-view.test.js、tests/guild-history-integration.test.js、tests/people-integration.test.js；新增 docs/2026-10-06-memory-corridor-release.md；更新 PROJECT_STATUS.md/CODEX_HANDOFF.md。
**Interfaces:** update(state,camera,viewport) 使用 textAnchor 或 state.target；readingBounds 继续提供世界包围盒；prepare/resize 的 revision 和请求隔离保留。原自动播放仍共用 people-story 映射。

- [ ] 写/运行失败测试：5–11/16–23/28–36秒完整阅读；转场至多一张 card 可见；414×896、896×414、280×600测量字形不越界；文本与近景花瓣球不相交。
- [ ] 调整暖白文字布局/局部软暗底与文字 anchor；手机尺寸允许标题28–34、正文18–20、日期14–16；全部正文保留，不缩小到不可读以强行塞入。
- [ ] 保留并运行字体超时→resize→retry 的旧回调隔离测试，新增从章节外重试后进入可用的检查。
- [ ] 接完整36秒自动播放与末端重播；关闭 preview-only 主路线隔离，预览入口仍可供复核。
- [ ] 跑相关历史/人物接缝测试，一次必要生产构建。必要整套检查仅最终一次；不做重复多轮代理审阅。视觉以真实截图为准。
- [ ] 保存 GitHub checkpoint；官方 Sites workflow 同步、推送核对源码、打包部署原站。若环境 Git 再回写旧文件，保留源副本，用系统 Git 运行同一 helper，不发布错源归档。
- [ ] 原生发布工具返回 succeeded 后记录版本/部署/SHA。非终态有限轮询，超过数分钟保存并改用可用替代，禁止重复新建站点。
- [ ] 更新状态、交接、未完成手机验收项；告知实际完成与部署链接，Pages 未改。

## 执行与自检
推荐 Native：本代理逐任务完成，避免为高度耦合的镜头/实例接口反复创建代理上下文。保留必要最终独立审核，验证与审美验收分开。
规格覆盖已检查：三幕差异、长链尘埃光束、禁用地图与金属设计、资源/预算/倒滑/文字/分阶段预览均有任务归属。
本计划等待用户审核后开始 Task 1；构图预览阶段仍需用户视觉反馈再推进完整动画。


## 2026-10-06 执行检查点
Task 1：构图预览已保存并部署；14种高清模型共享、三幕静态镜头、尘埃/光束、文案开关已接入。219项检查通过。花朵点缀及真实视觉验收仍未完成；构图入口及重要修复见 [执行记录](../../2026-10-06-memory-corridor-preview.md)。Task 2/3 尚未开始，等待规格要求的构图反馈。
