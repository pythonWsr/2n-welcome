# 仓库维护规则

## 权威入口

README → PROJECT_STATUS → CODEX_HANDOFF。完整设计和历史记录从 docs/README 进入。
不要在多个根目录文件分别维护互相矛盾的最新版本号；历史记录保持当时原文。

## 分支职责

- main：GitHub Pages 正式发布；现有 push 工作流自动构建部署。
- experiment/lookback-v2：3D 网站开发及 Sites 迭代；下一次实现开始前核对两分支最新 SHA。
- release/pages-flowers-2026-10-03 等旧分支：历史发布证据，保留；不当作当前开发入口。

不删除分支、不强制推送、不重写历史、不调整保护策略。

## 文件职责和清理边界

| 路径 | 内容与维护方式 |
| --- | --- |
| src/ | 已完成运行时；文档整理不做大规模重构 |
| content/people.json | 已核实人物内容，保留 id、顺序及来源 |
| public/assets/ | 原模型、字体及资源，禁止因“清理”删除 |
| scripts/ | 可重现的生成流程 |
| tests/、test/ | 回归检查，保留 |
| studies/ | 历史模型研究，保留供回退；不是线上新增下载 |
| docs/resource-sources/ | Florr 资源原始说明 |
| docs/reviews/、docs/superpowers/、docs/archive/ | 历史过程记录，明确非当前状态 |
| node_modules/、dist/、生成的传输产物 | 本地/构建输出，按现有 gitignore，不提交 |

新故事的 history.json、media.json 仅是规划路径，目前没有创建运行时内容。
无用资源的删除必须先证明无引用、可重建且有备份；本轮没有删除任何代码、模型、研究、分支或历史记录。

## 本轮整理（2026-10-05）

纠正 Pages 花朵冻结版的过期描述；更新文档索引、接续规则及人物分组说明；
保存当前 Pages 发布证据与故事提案。文档已保存到开发分支；工具禁止直接写 main，
通过文档整理 PR 提交正式分支更新，合并前 main 文档仍是旧入口。
不改变网站运行时代码、模型、人物数据或工作流。仅核对文档路径和差异，不重复完整运行时测试。
