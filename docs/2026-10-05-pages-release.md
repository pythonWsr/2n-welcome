# 当前版本 GitHub Pages 发布记录

时间：2026-10-05（北京时间）。用户明确要求推送目前版本到 GitHub Pages。

- 仓库：Llhleo/2n-spatial-world；旧 Llhleo/2n 未修改。
- 正式地址：https://llhleo.github.io/2n-spatial-world/
- 发布源码：`e65616c7ac91d7a381eed03d959baf4c65e77c94`。
- main 原先落后开发分支 55 个提交，没有分叉；使用 force=false 快进，无强制覆盖。
- Actions：https://github.com/Llhleo/2n-spatial-world/actions/runs/37272779171
- 状态：build success，deploy success，head_sha 与发布源码一致。
- 验证：201 项测试通过；Pages base=/2n-spatial-world/ 构建成功。
- 未改 Pages 配置、现有工作流、保护规则，也未重部署 Sites。

Sites 当前仍为 v48，源码 `d334e77bdf31aadf1766439e5ac3fc2d0c530a37`；
GitHub 运行时 checkpoint 为 `b20253a4e80e83221d84a6884a08fa1126107f78`，
发布源码 e65616… 包含同版运行时代码及后续文档。

## 验证边界

构建、测试及部署成功，不等于新版本 iPhone Safari 视觉/性能验收完成；本轮未做新实机视觉检查。

## 后续规则

main 是 Pages 发布分支；开发分支 experiment/lookback-v2 用于 Sites 迭代。
本次明确授权只覆盖本次发布。后续视觉改变是否发布到 Pages 要依当轮授权判断。
文档整理提交到 main 会由现有工作流自动进行同版代码构建；这不表示新增故事已经上线。
