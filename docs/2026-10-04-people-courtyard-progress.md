# 花瓣同行庭院实施进度（2026-10-04）

用户已确认设计稿、实施计划、子代理方式和独立 worktree。按已有项目继续，不重做资产，不改旧 Llhleo/2n、main 或 Pages。介绍仍在 content/people.json。

## 本次恢复

2026-10-04 继续时，本地回到早期快照，独立 worktree 和上一轮 Task 4 的未提交环境代码不在本地。已从 GitHub checkpoint bd9deb9075c283eefee762edf3c2fafd7ccd7fae 恢复完成的 10 个文件；本地恢复 commit c4b41729b2553628158272973696f8719c8128c5，完整测试 168/168 通过。

Task 1–3 不重做。Task 4 从未完成部分续做：固定沿途花瓣簇、高清共享实例、最大运动避字、完整包围框与跨站无跳现。上一轮的定向 39/39 是历史记录，不冒充本次恢复后的结果；其代码未取得可恢复 checkpoint。

Task 4 本次已有连贯实现草稿：companionship/people-courtyard 与新增 environment 测试。RED 17 项中 3 失败（入口完整花瓣、42 实例池、避字体积）；首轮定向 4/4 GREEN，使用现有 14 个 GLB 的真实位置缓冲包围框。已覆盖四视口读站/转场、旧矩阵/实时入口/地面恢复、高清迟到共享引用及资源释放、最大幅度避字/倒滑/reduced。此 checkpoint 是未审查 WIP：密集 cutoff 连续性、完整 suite、独立审查仍待完成；不得视为已部署。

Task 4 已完成：本地 commit 7692eeb09ea670c029a4a928bda340cfccbe225f。最终定向 19/19、完整 174/174；四视口、7 人与保守单人拆组、读站开始/中/末及转场采样均检查真实完整模型。1199 个密集邻点与实际池替换边界检查通过，对照移除平滑处理会失败。独立审查 Spec compliant、Task quality Approved，无 Critical/Important；已有 offline fixture 诊断为待整理 minor。模型和材质共享、高清迟到升级、42 实例上限及地面恢复通过。当前开始 Task 5 集成，Sites 仍未切换。

Task 5 已有主入口/故事映射/VM 测试的连贯草稿，首轮定向 10/10 GREEN（尚未完成旧路径删除）。已检查前段 150 秒不变、映射互逆、字体晚到时保留同一路线与真实相机姿态。接下来删除临时旧人物/侧边走廊实现、加强播放中 resize/语义位置检查，再跑完整 suite/build/独立审查。本次 WIP 未审查、未部署。

Task 5 候选已提交本地 2db0c2dad33aa2df9ece1da8d08c1b6a4aa01621 + 5e3dd23：统一路线接入、准确 autoplayToScroll/scrollToAutoplay 映射、旧 150 秒、窗口阅读时长、默认关闭/手动暂停、重试不 seek、播放中语义 resize、迟到字体不换当前物理路线。实际 gallery+VM 测试发现并修复了未知字形行高 Infinity 导致文字 NaN 消失；共享摄像机测试发现并修复了倒滑回五境残留 up 方向。最终定向 30/30、完整 171/171、构建及 diff-check 通过。旧点阵/最近三名/独立人物走廊已删除。独立审查进行中，候选尚未发布。

详细验证保存在 docs/reviews/2026-10-04-courtyard-environment.md 与 docs/reviews/2026-10-04-courtyard-integration.md。测试数下降包含删除已废弃行为断言并新增共享路线回归；不冒充手机视觉/性能实测。

已重新确认 Sites 仍为 v42、源码 537be1fc60418af393cf9511549b91e5dd77fe8a；原站源码已打开，尚未更新或部署。当前支持流程仍缺少 control-browser，浏览器/手机/性能实测保持未验状态。

## 已保存阶段

Task 1 已完成：共享世界空间路线、5 位管理层与按原顺序每 7 人分组的成员窗口、确定性正反滚采样、既有高清花瓣来源 key。源文件 src/people-courtyard.js；仅新增路线，尚未替换线上画面。

本地代码 checkpoint：250a30090414dfe42a6261f6f497bf3c9f9c0ebc；基线 ed2bc1aa3c8071c0c25590c7a6600189a0f0f005。独立任务审查结论：Spec compliant、Task quality approved。定向测试 4/4、完整 suite 157/157；基线 153/153。已有故障恢复 fixture 输出预期 offline warning，不是新增失败。

## 下一阶段

Task 2 已完成并通过独立 Spec/Quality 审查：本地 checkpoint 6f4bf1fcdc42ac19fe856970419da43eedd427a9；定向 15/15、完整 160/160。相机读取同一 shared route，入口保持原姿态，阅读目标固定、相机低速平移，up 连续；完整字形框投影为 CSS 像素，字号测量使用代表性单字形墨迹高度，短标点不迫使文字放大。

Task 3 已实施：21 个成员 Text 对象池、数据版本校验和整组同步发布；实际字形边界测量、窄屏长名拆分、空间交接防中央重叠、终景保留最后 4 个姓名。初版 checkpoint 36fbc6b20740bf34baa29d099dffdb7c0ea4c753，定向 11/11、完整 164/164。

独立审查发现准备测量与每帧显示共用文字槽的竞态，已在 49f8f01 修复：成员测量完成前保留对象池，已有领导层仍可显示；定向回归 15/15（包含延迟/即时同步、超时重试、迟到和销毁）。独立复审：原问题已解决，无新增 Critical/Important 问题，Task 3 审查完成。

后续为 Task 4 有层次高清花瓣环境、Task 5 时间映射/自动播放/恢复接入、Task 6 整段验收与原 Sites 更新。线上尚未切换到新路线。

## 审查待跟进

- 派生排版路线已加命名空间，保留原人物 ID；最终审查须核对初始路线也不会产生歧义。
- 镜头导数、透明度边界、转场投影重叠/空白和最终余数组已补回归检查。
- 花瓣 scale 是目标展示外径，Task 4 必须按实际几何尺寸归一化，并保持入口的实时圆环变换连续。

## 验证与发布界线

原 Sites 当前仍为 v42：https://twon-dark-spatial-world.llhleo.chatgpt.site ，源码 537be1fc60418af393cf9511549b91e5dd77fe8a。本轮尚未发布人物改版。Pages 保持既有花朵冻结版。

受支持的 managed preview 要求 control-browser 技能，当前目录未提供该技能，未绕过其浏览器边界。尚无本轮连续浏览器视频、手机视觉、启动/帧时间/内存实测；不能把测试通过写成视觉或性能通过。开发继续，验收限制会在发布前明确报告。

## 已作决定

1. 空成员数组的有效路线须支持，不放松无效记录校验；实查 normalizePeople 已接受空数组，未建立绕过路径。
2. 中间任务保留现有 optional-route 兼容，直到 Task 5 接入新路线再移除不再使用的旧路径；风险是暂时双路径，须在集成审查关闭。
3. 缺少浏览器实测不阻塞纯代码开发，但性能与视觉不宣称通过；风险是回退尚不可见，必须保留为未验项。
4. 人物站横向间距改为每站 50 世界单位，窄屏子窗口同步偏移；这是为避免前后姓名中央重叠，风险是较长转场需要更多沿途景物，Task 4 必须覆盖。

## Final current state

Tasks1–6 code and handoff complete. Whole-branch review found a real Troika clean-sync lifecycle bug after height-only resize / identical route adoption. Sole correction wave f40b7d7c501de75cca7c6ce4cb1df97f673577bd reuses settled shaping while guarding pending/stale work. Faithful regressions were RED then GREEN. Scoped independent re-review clean, no open findings. Final tests159/159 plus omitted unchanged directory15/15, total174/174 across two runs; production build and diff-check passed. Earlier pending-review paragraphs are historical checkpoint states.

Current goals: save all final source, tests, handoff and review/decision records to GitHub experiment/lookback-v2; update original owner-private Sites. Pages/main/old repository remain untouched. Then obtain real Safari continuous-view feedback and same-device startup/frame/memory evidence; any visual adjustment must respond to actual observed issues. Browser acceptance is explicitly pending, not inferred from deployment. Editable people introductions remain content/people.json.

All nine controller decisions and their risks are preserved in docs/reviews/2026-10-04-courtyard-controller-decisions.md.

## Confirmed publication — 2026-10-04

- GitHub reviewed code checkpoint: 7c845ea6e9f9ee0c72c66acedabb092a8adcf0f4 on Llhleo/2n-spatial-world / experiment/lookback-v2; final six differences read back exactly. Earlier unchanged checkpoint files compared exactly before commit.
- Sites version43, source34f7cbc26244463f855fe79316c2e9a9f14dd586. Native deploymentappgdep_6ac1c3ffd73c819183c804fa7d2495f1 returned succeeded. Saved-version source SHA was independently read back.
- URL: https://twon-dark-spatial-world.llhleo.chatgpt.site
- Original project identity and owner-only audience confirmed unchanged. No GitHub Pages/main/old-repository operation.
- All code work complete and reviewed. Remaining: actual Safari/phone continuous visual review, actual font metrics and device startup/frame/memory measurements. These were not performed, and deployment success does not establish them.
- Next work: review deployed phone experience against the handoff checks; fix concrete observed flicker, composition, readability or performance issues with preservation of HD quality and existing world. Introductions remain conveniently editable in content/people.json.
- Rollback reference: Sitesv42/source537be1fc60418af393cf9511549b91e5dd77fe8a.
