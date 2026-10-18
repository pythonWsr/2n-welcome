# 维度折叠结尾 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 缩短五境星云停留，加入三层立方体展开、错位翻转和粒子穿行，再收束为原开头金属 2ⁿ。

**Architecture:** 独立框架模块管理三层发光立方体；粒子模块保留完整云团与原雕塑表面采样，通过新的体积目标做连续形变。独立结尾入口改为18秒，现有正式路由不变。

**Tech Stack:** Three.js 0.180.0、GLSL、Vite、Node test。

**Spec:** 本文件的视觉编排源于本会话已确认的「方案1：维度折叠」。参考本地 reference-world/src/ch/03_v1.js 的维度展开和分层光框，以及 src/engine/lines.js 的逐笔描边；独立编写，不直接移植参考项目源码。

## Global Constraints

- 仅 experiment/particle-ending；不合main，不发布Pages或其他正式托管。
- Sites仅独立结尾，保留现有私有访问设置。
- 保留262,144粒子，不减画质，不改现有花瓣模型和正面校正。
- 最终形状直接采样createMonument；不绘制新字体，不改变角标n。
- 普通透明混合，保留当前已修正亮度，不用高强度全屏泛光。
- 实验前基线为14a4a2cbb8ee91e2cfd9b2cd659e9eb03d6c87ab，已在远程实验分支保存。

## 视觉与时间

| 时间 | 主动作 | 粒子与镜头 |
| --- | --- | --- |
| 0–3秒 | 星云建立 | 三个不规则云团渐显，沿用当前五境配色 |
| 3–4.5秒 | 框架逐笔展开 | 云团开始向框架内部流入，不突然切换成另一个物体 |
| 4.5–8.5秒 | 三层错位开合 | 外层向外展开，中层倾转，内层反向转；粒子穿过框面，在经过处形成亮度波 |
| 8.5–12.5秒 | 折叠汇聚 | 框架向中心折叠并熄灭；粒子错峰沿连续弯曲路径形成2ⁿ |
| 12.5–18秒 | 标识与文案 | 镜头回正，保留雕塑明暗与外围星尘，文案有稳定阅读时间 |

框架大小递减、中心轻微错位，不做三只同轴匀速旋转盒子。框架由独立几何线条构成，粒子分布于宽厚体积而不是全部堆积在边线上。手机竖屏优先，中央主体完整入镜，外围花瓣不抢主体。

## Review Focus

- 拖动进度或重播：框架与粒子必须按进度确定性恢复，不残留上一帧状态。
- 手机窄屏：框架旋转后的角点仍在安全范围，不能像之前圆盘一样切边。
- 降低动态效果：取消持续旋转与穿行扰动，阶段过渡和终态仍完整。
- 收束边界：框架先熄灭，终态2ⁿ不被线框遮盖；粒子坐标不能突跳。
- 资源生命周期：重复创建/销毁场景释放所有框架几何、材质与粒子资源。

---

### Task 1: 分层框架与时序

**Files:** Create src/guild-ending-frames.js; Test tests/guild-ending-frames.test.js.

**Interfaces:** `endingDimensionFrame(t, reduced=false)` returns `{visibility, draw, fold, rotations, scales}`; `createEndingFrames()` returns `{group, update(t, aspect, reduced=false), dispose()}`. 归一化进度对应18秒；使用三层完整立方体，每层12边。

- [ ] 写失败测试：在t=0和1时visibility=0；t=.35时visibility>0、三层方向不同；t=.70时visibility=0；非有限输入按0处理。修改输入顺序后再次采样同一t必须deepEqual。reduced模式旋转不随进度持续变化。
- [ ] 运行 `node --test tests/guild-ending-frames.test.js`，确认因功能不存在而失败。
- [ ] 实现分层逐笔描边、不同方向倾转与折叠；CPU描述和实际几何使用同一数据，线条有亮核心、低强度宽光晕，不依赖原生lineWidth。
- [ ] 测试实际group更新后含三层36边；相机使用endingCamera，在aspect=.46/.6/1.8和t=.25/.35/.45逐点投影，角点abs(x/y)<.9；销毁事件覆盖全部材质和几何。
- [ ] 运行该测试通过，提交框架与测试。

### Task 2: 粒子穿行与连续汇聚

**Files:** Modify src/guild-ending-particles.js; Test tests/guild-ending-particles.test.js.

**Interfaces:** `endingTransitPoint(u,v,w,group,t,reduced=false)` returns `[x,y,z]`，为框架内部宽厚流动体提供确定性目标；`endingFrame(t)`添加维度段状态，原有API仍保持兼容。

- [ ] 写失败测试：t=.3与.42的真实目标样本位移>12；XYZ皆有体积；相邻1/1000进度位移<2；reduced模式去除穿行扰动；所有输出有限。保留真实粒子数、原模型边界与角标n检查。
- [ ] 运行 `node --test tests/guild-ending-particles.test.js`，确认因新目标或新时序缺失而失败。
- [ ] 云团至穿行体错峰插值，框面经过时增强局部亮度；8.5秒开始形变，12.5秒完成。粒子不堆到线框上，保持NormalBlending与当前可见点核。
- [ ] 镜头随维度阶段侧前方小幅环绕，汇聚时回正；窄屏按aspect拟合。保留入口摄像机连续性、终态花瓣分层与GPU资源释放测试。
- [ ] 运行全部 `node --test`，修复相关失败，提交粒子与测试。

### Task 3: 独立入口、打包和发布

**Files:** Modify src/guild-memory-scene.js, studies/ending/main.js, scripts/build-ending-preview.mjs, docs/experiments/2026-10-11-particle-ending.md; extend scene integration test.

**Interfaces:** 场景通过createEndingFrames接入、更新、销毁；独立预览18秒，状态标注「五境星云 → 维度折叠 → 2ⁿ」。正式路由仍16秒，不部署正式站。

- [ ] 写失败集成测试：实际memory场景在维度段有可见框架、在终态无框架；粒子仍262144；重播恢复框架阶段，dispose释放框架资源。
- [ ] 运行集成测试，确认未接入时失败。
- [ ] 接入框架并改独立入口时长；构建脚本检查新框架和粒子确实进入产物，文档记录时序和验证限制。
- [ ] 运行 `node --test`、`node scripts/build-ending-preview.mjs`、`git diff --check`，核对修改仅限本计划范围。
- [ ] 保存checkpoint并push实验分支；按Sites源仓库工作流同步、打包、部署现有私有独立结尾。部署结果为成功才能报告上线。
- [ ] 无受支持浏览器QA则明确报告GPU和iPhone视觉未验收，不将单元测试等同于视觉效果通过。

## 执行状态

已完成并发布独立结尾预览：https://twon-dark-spatial-world.llhleo.chatgpt.site 。全部309项测试通过，独立构建通过。独立审查的两项重要问题已用回归测试修复；完整CPU/GPU形变轨迹对照测试作为后续小项。手机GPU视觉待实机验收。

GitHub实现提交：9be9333949213ce0c5388c3b0d2caf9953747a9b，仅experiment/particle-ending。星云备份：checkpoint/particle-ending-nebula-20261011 → 14a4a2c。Sites已部署源码25396d03142e9398ff0a5a92cdc61c2766c75dae；部署appgdep_6acb4084ab308191a18501e41b0f1cef返回succeeded。main、Pages和其他正式托管未修改。
