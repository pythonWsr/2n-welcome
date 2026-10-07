# 人物廊第一轮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有花瓣阅读圆环之后，连续进入五位管理层人物廊与成员群像入口。

**Architecture:** 数据集中在根目录 content，人物镜头与呈现使用独立模块。沿用当前 Three.js 场景、相机、Troika 文字与 14 个原有花瓣模型；只追加章节，原路程采样与播放速度不变。

**Tech Stack:** Three.js 0.180.0、troika-three-text 0.52.4、Vite 6.1.0、node:test、现有字体的合法补充子集；不新增运行时依赖。

**Spec:** docs/superpowers/specs/2026-10-03-people-gallery-design.md

## Global Constraints

- 中文受众、iPhone 13 Pro Max / Safari 优先。只追加现有结尾之后的内容。
- 姓名、角色、简介最多三个文字层级；正文不超过两行。竖屏重点文字位于中央 72% 宽、70% 高的阅读区域。
- 继续使用当前 Three.js renderer / scene / camera；章节滚动进度决定阅读，倒滑可恢复。
- 不降低现有 14 种展示模型与贴图质量。不替换前段已稳定字体。
- 不改 main 或旧 Llhleo/2n。用户已授权独立分支发布花朵版 Pages；人物版不自动改该快照。
- 第一轮只做管理层与群像入口，不宣称完整成员交互、半周年、影像或结尾完成。

## Review Focus

- 文案增加新汉字或长英文姓名：必须有字形，长文本在安全区内，不能截断姓名。
- 字体失败或编辑内容错误：不锁住已完成的五境，人物区可重试且不跳转镜头。
- 用户直接拖到结尾或倒滑：采样确定，姓名焦点唯一，花瓣归位不丢失。
- 旋转手机或地址栏高度变化：沿用稳定视口，文本重新适配但章节不跳回起点。
- 新章节加入后自动播放：前段保持当前速度，末尾正常停止，手动输入仍立即暂停。

## Task 1：独立可编辑文案与来源

**Files:** Create `content/people.json`, `content/README.md`, `src/people-data.js`, `tests/people-data.test.js`.

**Interfaces:** `normalizePeople(data)` 返回 `{leaders, members, source, errors}`。leader 为 `{id,name,role,intro}`；members 为来源中的姓名字符串数组，不附编造角色。无效记录不崩溃，不补造内容。

- [ ] 写测试：五人顺序严格为 awdc、flowerwsr、CNFlyDream、sschara、20180333；角色为会长、副会长、副会长、管理层、管理层；成员保留 LTJ；空职责与空简介合法，重复 id、空姓名、非数组产生可读 errors。
- [ ] 运行 `node --test tests/people-data.test.js`，先确认缺模块失败。
- [ ] 只读核对旧仓库 main:dist/index.html，记录来源 commit 与 blob SHA。原始介绍保留在 provenance；展示省略旧等级、Super 数量与贡献数字。flowerwsr 简介原义缩写为两行；没有可靠简介的其他人只显示姓名和角色。
- [ ] 实现 JSON 与校验。README 说明只改 name/role/intro，intro 最多两行，保存后重新构建发布；未来新增汉字需更新补充字体，不能手动改镜头。
- [ ] 测试通过后 checkpoint commit。

## Task 2：可倒滑的独立镜头与阅读布局

**Files:** Create `src/people-path.js`, `tests/people-path.test.js`; consumes `lookbackPose(1,camera)`, `readingPoint`, `readingQuaternion`.

**Interfaces:** 导出 `PEOPLE_UNITS=18`；`peoplePose(t,camera,aspect)` 返回 `{position,target}`；`peopleState(t)` 返回 `{transition,focus,opacity,crowd}`，focus 为 -1 或 0–4。采样函数不使用 dt。

- [ ] 写测试：t=0 的位置/朝向等于原结尾，0–1 全程有限，起步速度平滑；相同 t 正滑/倒滑结果相同；[0,.16) 过渡、[.16,.84) 五个唯一焦点、[.84,1] 群像入口。
- [ ] 写安全区测试：414/896、896/414、桌面 16/9 下焦点文字边界均落在 NDC x±.72、y±.70；长姓名适配而不截断。
- [ ] 运行测试确认失败，实现以原阅读相机坐标为基准的平滑弧形路径、五个焦点与后移升高的群像入口，保持一个主要阅读焦点。
- [ ] 运行 `node --test tests/people-path.test.js` 通过后 checkpoint commit。

## Task 3：人物文字与花瓣舒展

**Files:** Create `src/people-gallery.js`, `public/assets/fonts/people-sc-semibold.woff`, `tests/people-gallery.test.js`; Modify `src/companionship.js`.

**Interfaces:** `createPeopleGallery(data)` 返回 `{group,prepare,update(t,camera,dt,reduced),resize(aspect),ready,error,retry,dispose}`；`prepare` 使用现有 `prepareWorldText` 及有限超时；`companionship.update(returnT,dt,peopleT=0)` 保持默认 peopleT=0 时当前行为完全一致。

- [ ] 写测试：默认前段花瓣矩阵不变；peopleT 从 0 开始无位置突变，文字先退场，花瓣一边旋转一边舒展为两侧通道；倒滑恢复原环。群像节点与花瓣分属不同组。
- [ ] 写文字准备失败/重试测试：人物失败不改变五境 ready；迟到字体完成可恢复，不重复清空已就绪姓名。焦点唯一，非焦点职责隐藏，简介最多两行。
- [ ] 运行测试确认失败。构建独立补充字体（保留 OFL），包含 content 所有姓名与中文，不改现有字体。文字使用 sdfGlyphSize=256、gpuAccelerateSDF=false；装饰复用原几何/材质，群像节点实例化，不生成头像或人物专属花瓣身份。
- [ ] 实现文字与位置适配；仅显示焦点及邻近姓名，群像入口只展示空间节点及靠近焦点的真实姓名；prefers-reduced-motion 停止自主旋转与环境漂移。
- [ ] 运行相关测试通过后 checkpoint commit。

## Task 4：章节接入与发布

**Files:** Modify `src/main.js`, `PROJECT_STATUS.md`; Create `src/people-story.js`, `tests/people-integration.test.js`, `docs/2026-10-03-people-gallery-handoff.md`. Minimal additions to `index.html` and `src/style.css` are allowed only for the new nonblocking people-entry preparation/retry status.

**Implementation clarification:** Keep progress conversion and chapter selection in the small pure `src/people-story.js` helper so tests exercise the actual scheduling used by main, not just source patterns. Preserve the existing scene, viewport, intro gate and all prior UI behavior.

**Interfaces:** `TOTAL_UNITS=STORY_UNITS+PEOPLE_UNITS`；旧段仍用原 progress 的 28 单位坐标采样，新段 t 单独计算。自动播放 duration 为 `150*TOTAL_UNITS/STORY_UNITS`，保留旧段单位速度，不挤快五境。

- [ ] 写集成测试：旧章节同一滚动位置仍采样同一相机；新增末段、直接跳结尾、往回拖、横竖切换不重置进度；人物错误不锁住开场；自动播放完整结束且手动暂停有效。
- [ ] 运行测试确认失败，接入异步人物准备与章节调度；人物资源不进入原五境开场的硬性就绪门槛。近入口提供轻量的准备/重试状态，不让镜头等待字体。
- [ ] 运行 `node --test test/*.test.js tests/*.test.js` 与 `npm run build`；保留质量与既有资产，记录尚未做的 iPhone 视觉验收。
- [ ] checkpoint 并同步 experiment/lookback-v2，使用原 Sites 发布流程部署、确认 succeeded；不把人物版推到冻结花朵版 Pages 分支。
- [ ] 提供 code SHA、Sites 地址、文案编辑路径和未完成项；完整成员交互仍标记未实现。
