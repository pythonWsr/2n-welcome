# 花瓣同行庭院 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用连续花瓣空间运镜、稳定人物交接和全部成员的有序阅读，替换当前闪烁文字和小字点阵。

**Architecture:** 保持现有 Three.js renderer、scene、camera 与前段故事坐标。新增集中路径描述，镜头、人物与花瓣共同采样；成员文字使用有限对象池，自动播放使用独立的时间到滚动映射。

**Tech Stack:** JavaScript ES modules、Three.js 0.180.0、Troika 0.52.4、Vite 6.1.0、node:test；不增加产品依赖。

**Spec:** `docs/superpowers/specs/2026-10-03-people-courtyard-design.md`（已获用户确认）

## Global Constraints

- 不改旧仓库 Llhleo/2n、main、Pages 发布分支或工作流。Pages 保持花朵冻结版。
- 保留 Hero、五境、地面花瓣、7 个花朵的分配与数量、高清模型、纹理、字体质量和原段加载优化。
- 内容继续编辑于 content/people.json；不虚构头像、介绍、个人专属花瓣、地图归属、成员排名或关系。
- 主文字区 x 为 12%–88%、y 为 30%–70%；避开右下自动播放按钮。
- 414×896：管理层姓名 44–56 CSS px、职务至少 22 px、简介至少 18 px；当前成员姓名至少 20 px，以投影字形实测。
- 当前及两邻组最多 21 个活动成员 Text；每 7 人一组，末组保留余数，窄屏可拆分连续子窗口。
- 自动播放默认关闭、手动接管即暂停；管理层阅读 5 秒，有简介 7 秒，成员组/子窗口各 5 秒，转场另计。旧前段仍为 150 秒。
- 不增加远程模型依赖，不降低模型、纹理或 SDF 精度；人物准备不得加入原世界加载硬门槛。
- 真实浏览器录制与 iPhone Safari 反馈独立于单元测试；部署成功不等于视觉验收。

## Review Focus

- 字体请求晚到且用户已倒滑：过期 sync 结果不得换错当前姓名（Task 3）。
- 名单人数变更或末组不足 7 人：所有名字按原顺序恰好获得阅读窗口（Task 1）。
- 窄屏长姓名与横竖切换：不裁切、不缩到 20 px 以下、不改变当前人物/组（Task 3、5）。
- 花瓣中心在视锥但模型边缘被裁或摆动遮字：以完整包围框和最大振幅检查（Task 4）。
- 自动播放过程中手动倒滑/重试：暂停不跳位置，重试不重启播放（Task 5）。

## 文件与接口约定

- 新建 `src/people-courtyard.js`：集中路径、分组、窗口与时间数据，无 Text、renderer 或异步加载。
- 修改 `src/people-path.js`：镜头与完整字形投影；保留 PEOPLE_UNITS=18，前段绝对故事坐标不变。
- 修改 `src/people-gallery.js`：五位管理层及成员文字池；移除规则球体网格与每帧最近三名筛选。
- 修改 `src/companionship.js`：仅人物段使用共享路径，旧回望不改变；共享已加载资产生成环境实例。
- 修改 `src/people-story.js`、`src/main.js`：共享 route 注入、分段自动播放和现有恢复入口。
- 修改 `content/README.md`：说明按名单顺序分组，介绍仍在 JSON。
- 测试放在 `tests/people-courtyard.test.js`、既有 people-path/gallery/integration 测试及新增 `tests/people-courtyard-environment.test.js`。

统一类型（JavaScript 对象契约）：

- `Route={stations,memberGroups,windows,seconds}`；station 含 `id,kind,memberIndices,position,target,up,petalAnchors,readSeconds`。数组索引和位置只来自这个模块。
- `Window={stationIndex,start,readStart,readEnd,end}`，均为人物进度 0–1。入口/终景各 2/3 秒；站间转场 .9 秒，reading duration 遵循 Global Constraints；按时长归一化生成窗口。
- `createPeopleRoute(data)->Route`：调用既有 normalizePeople；不重排数据，校验失败抛出既有内容错误。
- `resizeCourtyard(route,{width,height,glyphMetrics})->Route`：glyphMetrics 为以人物/成员 ID 索引的完整字形 bounds 与字号尺度；返回派生路线，不修改来源名单。拆分窗口时重算 windows/seconds，station 保留 sourceStationId 与 memberIndices，供主入口保持当前阅读对象。
- `sampleCourtyard(route,t,aspect)->{position,target,up,visibleStations,primaryStation,petals}`；visibleStations 条目含 stationIndex、opacity、reading。位置为世界坐标，petals 为完整环境实例的 position/quaternion/scale 与来源 key。
- `peoplePose(t,camera,aspect,route)->{position,target}`：设置实际 camera，up 从共享采样获得。入口 t=0 与 lookbackPose(1) 一致。
- `createPeopleGallery(data,route)`：保留 group/prepare/retry/ready/error/resize/update/dispose 接口，resize 增加可选 height 参数，update 的 camera 参数不变。
- `companionship.update(returnT,dt,peopleT=0,route=null)`：route 只用于 peopleT>0；原回望行为不改。
- `autoplayToScroll(timeFraction,route)->scrollFraction`、`scrollToAutoplay(scrollFraction,route)->timeFraction`、`autoplayDuration(route)->seconds`：互逆映射，前段 150 秒，后段 route.seconds。

## Task 1: 共享路线与完整成员窗口

**Files:** Create `src/people-courtyard.js`, `tests/people-courtyard.test.js`; modify `content/README.md`。

**Interfaces:** 消费 normalizePeople(data)；产出 createPeopleRoute 和 sampleCourtyard，遵循上述契约。

- [ ] 写失败测试 `groups preserve source order and remainder`：95 人为 14 组，每组最多 7；flatten 索引等于 0..94；0/1/7/8/96 人均保持顺序与末组人数。不存在成员时只展示管理层/终景，不生成空组。
- [ ] 写失败测试 `windows are continuous and deterministic`：全部窗口无重叠主阅读区/无遗漏；每个姓名恰有一个主窗口；t=-1/0/1/2 输出有限值并 clamp；t=a→1→a 得到相同位姿。
- [ ] Run `node --test tests/people-courtyard.test.js`；确认因新接口缺失失败。
- [ ] 实现分组、窗口、连续缓弯三维路径和 shared station 数据；阅读区 current opacity=1，相邻文字只在区外交接，不采用焦点 ID 硬切淡入淡出。
- [ ] Run 同一命令；所有断言 PASS。
- [ ] 提交本任务三个文件，message `feat: define shared people courtyard route`。

## Task 2: 空间平移镜头与稳定阅读构图

**Files:** Modify `src/people-path.js`, `tests/people-path.test.js`; extend `tests/people-courtyard.test.js`。

**Interfaces:** 消费 Task 1 route；产出 peoplePose(t,camera,aspect,route) 和 `projectTextBounds(camera,worldMatrix,glyphBounds,viewport)->{rect,fontPixels,fits}`，rect 为 CSS px，fontPixels 为视觉字号尺度。

- [ ] 写失败测试 `entry matches lookback and first derivative`：入口位置/朝向误差 <1e-6，边界两侧有限差分不跳变；站间 position 变化而非只有 quaternion 变化。
- [ ] 写失败测试 `reading framing survives aspect changes`：414×896、390×844、320×568、896×414 所有镜头有限；直接 seek 和倒滑结果一致；up 校正连续，无零向量。
- [ ] Run `node --test tests/people-path.test.js tests/people-courtyard.test.js`，确认新行为测试 FAIL。
- [ ] 实现世界空间 position/target/up 连续曲线；平移路径穿过前、中景花瓣，读站保持低速移动；保持原结尾姿态无突变。
- [ ] 实现完整字形框投影函数；不逐帧缩放人物以掩盖构图缺陷。旧 peopleAnchor/state/layout 若不再被消费，删除旧实现并更新测试，不维持两套路径。
- [ ] Run 同一命令，PASS；提交 `feat: add continuous courtyard camera framing`。

## Task 3: 无闪烁管理层与可读成员文字池

**Files:** Modify `src/people-gallery.js`, `tests/people-gallery.test.js`, `content/README.md`。

**Interfaces:** 消费 route/sampleCourtyard、projectTextBounds；产出 createPeopleGallery(data,route) 生命周期；resize(aspect,height=896) 更新排版，update(t,camera,dt,reduced) 不改变共享路径。

- [ ] 写失败测试 `handoff has no opacity jump or central duplicate`：边界±1e-5 检查可见文本 opacity 连续；reading 主文字为 1；不存在旧 .13 相邻灰名；已准备文字切换不出现全部主体同时归零。
- [ ] 写失败测试 `pool covers every member without stale sync`：成员活动 Text<=21；所有窗口访问得到对应组全部名字；延迟 sync 后先倒滑再返回不能显示过期字符串；dispose 后不回写，重试不 seek。
- [ ] 写失败测试 `narrow long names split rather than shrink`：用真实最长姓名及额外长名 fixture，在 320×568 保持字号下限和完整字形框；需要拆分时组内顺序不变、所有人可达；横竖切换保留原组和当前姓名阅读位置。
- [ ] Run `node --test tests/people-gallery.test.js`，确认新增断言 FAIL。
- [ ] 实现固定阅读排版、空间交接、fog=false 的文字材质、五位领导已有简介；保持 SDF256/gpuAccelerateSDF=false，移除球体点阵及最近三名排序。
- [ ] 实现 current/previous/next 文字池，更新仅在离屏层进行；绑定数据 revision token 后 sync 完成才公布可读层。字体异常局部保留重试；不渲染未准备字符串，不虚报 ready。
- [ ] 实现窄屏子窗口布局；宽高变化时以 station ID/member index 保持语义位置，并供 Task 5 的时间映射读取子窗口列表。route.windows 仅由统一 `resizeCourtyard(route,{width,height,glyphMetrics})->Route`（定义于 people-courtyard.js）派生，不允许 gallery 私自维护另一套窗口。
- [ ] Run 同一命令，PASS；提交 `feat: present readable courtyard people and member groups`。

## Task 4: 高清花瓣的有层次环境

**Files:** Modify `src/companionship.js`, `src/people-courtyard.js`; create `tests/people-courtyard-environment.test.js`。

**Interfaces:** 消费 shared petals 和现有 loaded assets；产出 update(returnT,dt,peopleT,route) 的实例变换，resizeCourtyard 保持环境与镜头共同坐标。

- [ ] 写失败测试 `old return samples remain identical`：peopleT=0 时选取起飞、汇聚和圆环采样，与基线矩阵相同；倒滑恢复地面原实例。
- [ ] 写失败测试 `all shots contain complete separated petals`：读站及每个转场起/中/末至少 3 个分离可见花瓣、两个深度层；用 geometry 包围框变换检查视锥，不只中心。
- [ ] 写失败测试 `maximum decorative motion avoids text`：用最大漂浮/旋转振幅包围体检查阅读区不相交；reduced 模式装饰角/漂浮不推进；相同 t 的章节位置可逆。
- [ ] Run `node --test tests/people-courtyard-environment.test.js tests/lookback-v2.test.js`，确认新增测试 FAIL。
- [ ] 移除人物 corridorPoint 中复制的角度/时间常量，改用 route；原 14 个花瓣平滑展开，额外实例共享几何材质，实例数上限 42（含原 14 个），不下载资源、不新增基础球体装饰。
- [ ] 以实例疏密、深度、镜头平移形成变化；漂浮只用有界装饰偏移，不移动阅读锚点。dispose 只释放新建实例/自有资源，不释放共享源模型。
- [ ] Run 同一命令，PASS；提交 `feat: populate courtyard with shared high definition petals`。

## Task 5: 故事接入、分段自动播放与恢复

**Files:** Modify `src/people-story.js`, `src/main.js`, `tests/people-integration.test.js`。

**Interfaces:** main 创建同一 route 并注入 peoplePose/gallery/companionship；sampleStoryPose(progress,camera,portrait,route) 增加 route 参数。chapterAt 和原前段坐标维持；自动播放采用本计划的三个映射函数。

- [ ] 写失败测试 `old story samples and speed do not change`：旧 55.2 units 全部位姿仍相同；播放 75 秒到 27.6 units，150 秒到旧结尾；原 PEOPLE_UNITS=18、TOTAL_UNITS=73.2 保留，时间长度不再直接等比推算。
- [ ] 写失败测试 `autoplay windows and inverse mapping`：所有读站/组满足设计秒数；timeFraction→scroll→timeFraction 误差 <1e-9；从人物中途开启无跳变；结束正确停止。
- [ ] 写失败测试 `manual pause retry and resize preserve semantic position`：wheel/touch/pointer/nav 停止播放；retry 不 seek、不开播；横竖切换保持当前 station/member，必要子窗口变化不丢人；晚到字体不跳镜头。
- [ ] Run `node --test tests/people-integration.test.js`，确认新增测试 FAIL。
- [ ] 实现映射；createAutoplay 仍接收总秒数并保存时间 fraction，main 在 toggle/advance/resize 边界转换，不改旧播放器为一套隐含双坐标状态。
- [ ] 接入共享 route 与 resizeCourtyard；人物字体仍在旧 gpuReady 后准备，不阻塞旧核心；保留默认关闭/半透明按钮和 reduced-motion 手动可达性。
- [ ] Run `node --test test/*.test.js tests/*.test.js` 和 `npm run build`；全部 PASS，生成资产须与原受跟踪文件一致；提交 `feat: integrate courtyard story and paced autoplay`。

## Task 6: 整段视觉审查、保存与 Sites 发布

**Files:** Create `docs/2026-10-03-people-courtyard-handoff.md`；仅为验收发现的具体缺陷修改上述文件及对应测试。

**Interfaces:** 消费已接入完整故事；产出真实验证记录、GitHub checkpoint、原 Sites 部署记录和未完成项。

- [ ] 基线检查为执行前置步骤：在 Task 1 产品修改前保留基线截图/视频与启动、帧时间、内存测量；本任务结束时同设备同条件重测。记录工具、设备、采样区间；不能虚构未取得的指标。
- [ ] 启动 dev server，按可用浏览器能力验证 WebGL；检查 414×896、320×568、896×414 的完整字形、完整花瓣包围框、中央主体交接和按钮避让。
- [ ] 录制入口→五位管理层→全部成员组→终景连续过程，再录快速正反滚、横竖切换、自动播放中途手动暂停；逐帧查看切换点，不以停靠点截图代替录制。
- [ ] 逐条对照 Spec 7；若失败，先加对应回归断言，再修局部代码并复测。没有真实浏览器能力就保存现有成果，明确视觉阻塞，不伪称通过。
- [ ] Run `node --test test/*.test.js tests/*.test.js`、`npm run build`、`git diff --check`；记录真实输出。核对变更没有旧五境/高清资产/Pages 文件。
- [ ] 完成整个分支的独立代码审查；根据最终批准的执行方式，逐任务或最终审查均保留结论，失败不得当通过。
- [ ] 写交接记录：本地/GitHub SHA、修改范围、测试、浏览器证据、性能比较、iPhone 待验项。checkpoint commit 后将全部变更同步 experiment/lookback-v2 并回读核验，不 force push、不改 main。
- [ ] 读取 Sites building/hosting 技能，按现有项目流程同步并发布到原 Sites，不改访问权限；任何操作超过几分钟没有返回，保留 checkpoint 改用可用工具，不反复等待同一失败。
- [ ] 核对 deployment succeeded 和部署源码 SHA；交付原地址与 GitHub SHA，请用户 iPhone Safari 验收。未获实机确认前标记“已部署，手机视觉待验”，Pages 不动。

## 自审与执行交接

覆盖核对：Spec 1/2→全部任务的约束与失败测试；Spec 3/4→Task 1–4；Spec 5/6→Task 3–5；Spec 7→Task 6。额外五类 Review Focus 均有命名测试。接口字段、坐标/时间 fraction、资源所有权和语义 resize 已明确；本文件没有实施产品代码。

推荐 subagent-driven：路线、文字池、花瓣和主入口接口相互依赖，逐任务独立审查可防止再次出现“各段测试通过，但组合画面失败”。路线先定，后续按依赖顺序执行，不让多个代理同时修改同一文件；独立审查可以并行读取。

下一审批点：用户审阅实施计划并确认执行方式；之后使用对应执行技能启动开发。本轮计划保存不代表人物问题已修复或上线。
