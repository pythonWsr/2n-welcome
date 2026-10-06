# Guild Closure Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有人物结束后增加 12 秒、可正反滑动的全 3D 结尾原型，不接入未经核实的公会历史。

**Architecture:** 保留现有 people route 和镜头采样，在旧总进度之后追加 closure 区间。结尾从现有最后镜头连续延伸，先清退人物文字，再显露复用首页资源的小尺度金属 2n；场景仍使用现有主 renderer/camera 和 Hell 地面。模型、网络并发、加载闸门、名单均不改。

**Tech Stack:** Three.js、Vite、JavaScript ESM、node:test；不引入新依赖。

**Spec:** [已获继续指令的故事提案](../../2026-10-05-guild-story-proposal.md)。本计划只实现提案 B 的结尾原型，不实现事件站、媒体或 45–70 秒完整故事。

## Global Constraints

- 用户已在 2026-10-05 授权继续设计方案；产品实现仍在本计划审阅之后开始。
- 旧仓库 Llhleo/2n 不改；Garden 原地形、模型、密度、Camera 和加载策略不改。
- 仅 PETAL，不使用 MOB；不新增模型下载，不降低模型/纹理质量，不增加首屏等待任务。
- 保留 v48 的 v45 风格世界长链，不回到固定短排。
- 人物名单、角色、简介和源顺序不改，不添加虚构历史。
- 使用现有单 renderer/camera，绝对进度采样；无新滚动容器、锁屏跳页或高速跨地图移动。
- 本原型仅展示金属 2n 和“重新观看”导航按钮，不新增世界空间汉字。完整故事文案的字形扩展留给后续计划。
- 新视觉只部署原 Sites 项目；当前指令的合 main 针对现有文档 PR #4，不视为提前授权尚未实现的视觉代码合并。
- 本计划不把自动构建通过当实机视觉验收；不做盲目并发加速或无关重构。

## Review Focus

1. 快速正反滑动：同一绝对进度返回同一镜头和可见性，不保留结尾雕塑在人物段。
2. 横竖切换：结尾不会套用人物索引恢复逻辑而跳回名单。
3. 人物文字尚未就绪：仍可进入/退出结尾，重试不改进度。
4. 模型资源共享：移除结尾不能 dispose 首页共享几何、材质或 env。
5. reduced motion 与重播：呼吸可停，但可滑动、可重播，不重复创建对象或监听器。

---

### Task 1: 可逆结尾采样与播放映射

**Files:** Create `src/guild-closure.js`; Modify `src/people-story.js`; Test `tests/guild-closure.test.js`、现有人物/距离测试。

**Interfaces:**
- Produces `CLOSURE_UNITS=3`、`CLOSURE_SECONDS=12`。
- Produces `sampleClosure(t,entryPose)`: entryPose 为现有 sampleCourtyard(route,1,aspect) 输出的 position/target/up；返回 position、target、up、peopleOpacity、monumentOpacity、replayVisible。
- t 为 0..1：0..0.25 清退文字；0.25..7/12 显露雕塑；7/12..1 阅读。显示用 smootherstep，可倒退。
- 主体复用 entryPose 朝向；只将 camera 到 target 的向量长度从 1 渐变到 1.04，不旋转至天空、跨地图或移动地形。
- people-story 保留 `LEGACY_TOTAL_UNITS=STORY_UNITS+PEOPLE_UNITS`，TOTAL_UNITS 仅加 3。旧 hero/五境/回望/people 的绝对坐标与 pose 不改，扩展归一化 scroll 映射和 autoplay 秒数。

- [ ] 写测试：sampleClosure(0) 与 entryPose 完全相等；0.25 时 peopleOpacity=0、monumentOpacity=0；7/12 时 monumentOpacity=1；replayVisible 仅 t>=7/12。
- [ ] 写测试：0、.2、.8、1、.2 的顺序采样与独立 .2 结果相同；NaN 及非有限 entryPose 抛 RangeError；合法 t 越界 clamp。
- [ ] 写映射测试：旧章节 pose 保持、closure 端点 round-trip 误差小于 1e-6、autoplayDuration(route) 增加恰好 12 秒、无 route 不产生 NaN。
- [ ] 运行 `node --test tests/guild-closure.test.js`，记录新模块缺失导致的失败。
- [ ] 实现上述纯函数和映射；维护旧单位坐标，不重新作者化 people windows 或改变已有 readSeconds。
- [ ] 运行新增测试以及 `tests/people-distance.test.js`、`tests/people-path.test.js`，通过后 checkpoint。

### Task 2: 复用雕塑与独立结尾可见性

**Files:** Create `src/guild-closure-view.js`; Modify `src/main.js`；Test `tests/guild-closure-view.test.js`、`tests/guild-closure-integration.test.js`。

**Interfaces:**
- Consumes Task 1 的 sampleClosure 返回值。
- Produces `createClosureView({monument})` → `{group,update(state,entryPose,camera,viewport),dispose()}`。
- monument 是 main 持有的 createMonument() 原组；结尾浅复制层级并共享已有 geometry/material，不调用 createLighting、不生成第二套 PMREM。
- 结尾材质透明度需克隆，仅结尾自有材质由 dispose 释放。shared geometry、scene.environment 不释放。
- 独立 group 平面朝向与 entryPose 阅读姿态一致；几何包围盒投影宽度目标 viewport.width*0.30，最大 0.36；整体须在 x 12%–88%、y 30%–70% 内。
- 原型雕塑是悬浮标识，不将其伪装为贴地建筑；放在 entryPose.target，保持既有有限地面取景。

- [ ] 写共享资源测试：移除结尾后原 monument 的 geometry/material 仍存在且没有被 dispose，实例不会反向改变原 monument opacity。
- [ ] 写视口测试：414×896、896×414 的投影完整处于上述范围，无模型负尺度或非有限矩阵。
- [ ] 写生命周期测试：update 不增加 children、mesh/material 数量；t=0 group 不可见，monumentOpacity=0 时不绘制；重复 dispose 不异常。
- [ ] 运行新增测试，确认预期失败，再实现 view。
- [ ] 在 main 保留原 monument 引用，创建一次结尾 view；渲染时按 chapter 更新。人物 update 后单独乘 peopleOpacity，不让原 update 下一帧覆盖淡出效果；倒退恢复原人物显示。
- [ ] 结尾的 companionship 使用原 world anchors，不创建新花瓣；若旧链穿入雕塑中心，只隐藏与雕塑世界包围盒（膨胀 15%）相交的结尾实例，不改原人物布局，倒退恢复。
- [ ] 将遮挡避让、人物异步字体未完成和往返显示加入 integration 测试；必要时以新增结尾 gate 传入 companionship，旧调用默认 gate 关闭，保持原旅程输出。
- [ ] 执行新增 view/integration 测试、`tests/people-integration.test.js`，通过后 checkpoint。

### Task 3: 重播、横竖屏与一次预览发布

**Files:** Modify `src/main.js`、`index.html`、`src/style.css`；Test `tests/guild-closure-integration.test.js`；Update `PROJECT_STATUS.md`、`CODEX_HANDOFF.md`。

**Interfaces:**
- 添加按钮 `#replay`，标签“重新观看”，目标尺寸至少 44×44px；仅 Task 1 replayVisible 时显示。
- 点击重播先停止 player，重置受控/请求/当前 progress 至首页坐标并同步 scroll，再恢复原输入机制；不重新下载模型、不重新创建 renderer。
- viewport 改变时 closure 使用归一化 closureT 恢复；人物原 capturePeoplePosition/restorePeoplePosition 只用于 people，不用于 closure。

- [ ] 写集成测试：进入结尾后横竖切换保留 closureT；无 people.ready 时也能重播；播放停止后不会下一帧跳回结尾。
- [ ] 写测试：reduced motion 下 view 保留可见主体，呼吸 dt=0；重播 5 次 renderer/资源/监听器不增加。
- [ ] 运行失败测试，再实现按钮、位置恢复及文档。
- [ ] 检查移动端 safe-area，按钮不遮挡原自动播放按钮；控件可用系统字体，禁止为了控件新增模型或 Troika 字体下载。
- [ ] 仅运行上述新测试及直接受影响的旧测试一次；执行 `git diff --check` 和一次 `npm run build`。不为单项小改重复全套或多代理审阅。
- [ ] GitHub checkpoint 到开发分支；使用原 Sites 项目发布，并核对返回版本与源码。构建用 Sites 根路径，不能上传此前 Pages base=/2n-spatial-world/ 的旧 dist。
- [ ] 保存真实发布 SHA、地址、剩余验收项；阻塞时保存进展并报告，不循环等待数分钟。
- [ ] 请求 iPhone Safari 一次集中验收：末组淡出 → 金属 2n、前后滑动、横屏、重播。未获反馈不宣称审美验收，也不合视觉代码到 main。

## 本计划自检与边界

覆盖提案 B 的原型，不覆盖 C 的真实事件与 D 的影像；没有待填事件占位内容上线。
没有新模型请求/高清降质/首页资源任务；旧主镜头采样坐标保持。
五类 Review Focus 均归入对应任务测试。扩展映射时凡新增 context 参数，
所有 autoplay、scroll、resize 调用必须同步，不新增第二条 player 时间轴。
实现前应先将开发分支同步到最新已合文档的 main，核对现有文件及未提交改动；
本地 Sites 管理仓库的 main 不等于 GitHub main，不能直接用其 remote 推送正式仓库。

**审阅交接：** 推荐主代理直接执行，不另开逐任务代理，符合用户节约额度要求。
请确认此 12 秒结尾原型计划；确认后使用 executing-plans 开始代码。
