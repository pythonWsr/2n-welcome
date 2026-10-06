# 2n Spatial World — Codex 交接

更新时间：2026-10-03（北京时间）。从现有成果继续，不重做。

## 最新接续
- 用户已确认连续回望与汇聚即旋转方案。本轮仅改 src/lookback.js、src/companionship.js 和新回归测试，不改前进段/模型/贴图。
- 回望各区域保持明显位移而非近乎停止；汇聚从开始就顺时针旋转并缩小半径；最终阅读处才收稳。
- 人物廊方向已确认；设计文件 docs/superpowers/specs/2026-10-03-people-gallery-design.md 等待用户审阅。不要跳过设计审阅直接声称新章节已实现。
- 发布与验证结果以 PROJECT_STATUS.md 最新记录为准；原 v38 记录保留作历史。
- 最新 Sites v39 已发布成功，源码 da901544d5cb8fdb63ef597ea04043f900edf631，部署 appgdep_6ac0895f5c5c8191adea4db86ef29856。117 项测试与构建通过；仍需 Safari 实机验收。
- 本轮本地压缩包不完整，最终由服务端从已保存源码构建上线；不要复用两个不完整 tar。

## 本轮修复（已发布 Sites v38）
- 开始时核实 Sites 仍 v37，上一轮 SDF256 与公转尚未发布。
- Hell 出口补充两种原有花瓣，不重新分配既有三段地面实例；回头前方不再只朝空尾段。
- 世界空间飞行增加不同频率的上下/侧向漂移，暂停滚动仍更新；倒滑恢复地面实例。
- 起飞后从原地尺寸渐增至 1.7 倍，汇聚时平滑适配原有文字外围，Iris 相对尺寸不变。
- 下载 6 路与解码 2 路独立调度，解码不占网络槽；14 个高精度 GLB、1024 贴图原文件不变。
- 本轮仅修复并更新 Sites，成员章节仍暂停，须用户实机确认本段后才继续。
- 112/112 回归测试通过，生产构建成功。真实 Safari 效果、首屏耗时仍待用户实机验收。
- GitHub 修复 commit：db7f907450843d9bc469d17acb6961bd5e53545d；已核对完整 tree 与本地一致。
- Sites 源码 commit：7da325b1ed5674958e7d30d08df36c7fac595ad7；部署 appgdep_6abe91046ad0819189cb97acfcd02ab0 已成功。

## 仓库与保护边界
- 仓库：Llhleo/2n-spatial-world。
- 工作分支：experiment/lookback-v2；不合并 main，不触发 GitHub Pages。
- main 必须保持 0b5d6921bb7f794a5c10ff7150b6cb1618825c5d。
- Sites：https://twon-dark-spatial-world.llhleo.chatgpt.site。
- 已上线 v39，Sites 源码提交 da901544d5cb8fdb63ef597ea04043f900edf631。
- 不修改开场 2n、既有五境地形/纹理/花瓣/前进镜头、Safari 视口稳定与雾过渡。

## 当前成果
- 五境回望；Garden/Desert 有独立观察窗口。
- 14 种真实地面花瓣起飞、独立世界空间飞行、错峰围合；倒滑恢复原地实例。
- Garden: Rose/Clover/Golden Leaf；Desert: Cactus/Sand/Iris；Ocean: Pearl/Shell/Starfish；Jungle: Peas/Tomato/Compass；Hell: Darkmark/Corruption。不加入 Blood Stinger/Mob。
- 独立展示 GLB 位于 public/assets/companion-display/，14 个模型约各 3.2 万三角面、1024 贴图；地面仍用轻量版。
- 文案两行：每个地图， / 都有2n的足迹。独立中文 650 字重字体。
- 用户已确认 v37 文字正常；此前方块由不合法的 SDF 尺寸 96 引起，已修正为 128。

## 上一轮 checkpoint（已随 v38 发布）
- 本地提交：4df9f3d8a62a697aaa75470b65e51606c28b80ff。
- SDF 提升为 256；仅阅读段渲染像素比上限从 1.5 提高至 2。
- 围合后缓慢顺时针公转（约 0.10 rad/s），保持展示朝向、纵深、中央留白；不自转、不反向交织。
- update(t,dt) 驱动环绕，reduced-motion 禁用公转；倒滑退出阅读段重置。
- 107 项测试通过，Vite 构建成功；尚无新版本实际 Safari 验收，不得将测试通过等同视觉通过。
- 这批修改原先未部署，现已随本轮 v38 发布；不代表已通过实机视觉验收。

## 接续顺序
1. 核对分支、文件、commit、GLB 数量；保留全部成果。GitHub API 同步提交与本地 SHA 可以不同，以 tree/文件内容一致为准。
2. 重跑 node --test test/*.test.js tests/*.test.js 与 npm run build。
3. 用手机竖屏真实渲染检查文字清晰度、公转间距/速度/遮挡、倒滑、加载与 Safari 帧率。
4. 本轮已按用户要求更新原 Sites；后续保持不合并 main，不改 Pages。
5. 然后设计全 3D 管理层/成员章节，先提交方案供确认；该章节尚未实现。

## 名单来源
旧站 Llhleo/2n 的 main:dist/index.html 为已查到的名单来源；交接后重新读取并核对，不能凭记忆编名单。
已读到管理层：awdc（会长）、flowerwsr（副会长）、CNFlyDream（副会长）、sschara、20180333。旧站还有完整成员名单，包含 LTJ。
不要将旧成绩数值视为最新数据。

## 技术与操作
- Three.js 0.180.0 / troika-three-text 0.52.4 / Vite 6.1.0。
- 重点文件：src/lookback.js、src/companionship.js、src/main.js、tests/lookback-v2.test.js、tests/display-assets.test.js。
- 原工作区：/workspace/scratch/9d135a850972/lookback-v2；Sites checkout 为相邻 site-recovery。新 Codex 环境不要依赖这些路径存在；从 GitHub 分支恢复。
- .openai/hosting.json 已记录原 Sites project_id，不能新建替代 Site 或曝光凭据。
- 直接 git push 曾因缺少认证失败；GitHub 官方插件可上传二进制 blob、create_tree、create_commit、非强制更新独立分支。
- 工具数分钟无返回就保存现场并换安全替代方式；每完成一个阶段报告；阶段完成即 checkpoint。

