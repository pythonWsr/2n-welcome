# 2n Spatial World

2n 公会的五区域 3D 展示网站。现有模型、高清花瓣、花朵和人物文案均保留。

- GitHub Pages（正式发布）：https://llhleo.github.io/2n-spatial-world/
- Sites（迭代预览）：https://twon-dark-spatial-world.llhleo.chatgpt.site
- 当前开发分支：`experiment/lookback-v2`
- 当前进展：[PROJECT_STATUS.md](PROJECT_STATUS.md)
- 接续工作：[CODEX_HANDOFF.md](CODEX_HANDOFF.md)
- 编辑人物姓名、职务和介绍：[content/people.json](content/people.json)，规则见 [content/README.md](content/README.md)
- 公会故事设计（已确认；真实事件尚未接入）：[故事方案](docs/2026-10-05-guild-story-proposal.md)
- 当前预览：[Sites v49 独立结尾](docs/2026-10-05-guild-closure-v49.md)
- 发布记录：[2026-10-05 Pages 发布](docs/2026-10-05-pages-release.md)
- 仓库维护规则：[仓库指南](docs/REPOSITORY_GUIDE.md)
- 文档目录：[docs/README.md](docs/README.md)

## 目录

| 目录 | 用途 |
| --- | --- |
| `src/` | 场景、加载、镜头、人物展示 |
| `content/` | 可直接编辑的人物文字 |
| `public/assets/` | 线上使用的模型和字体 |
| `scripts/` | 无损传输与资源构建 |
| `tests/`、`test/` | 回归检查 |
| `studies/` | 历史模型与视觉研究，保留供追溯 |
| `docs/archive/` | 已过期的状态和交接快照 |

## 本地运行

Node.js 环境安装依赖后运行 `npm run dev`；生产构建使用 `npm run build`。
构建会自动生成花瓣实例和无损模型传输产物。`node_modules`、`dist` 和生成的模型传输目录不提交。

## 发布与开发边界

2026-10-05 用户明确要求将当前版本发布到 GitHub Pages：`main` 已快进至 `e65616c7ac91d7a381eed03d959baf4c65e77c94`，构建与部署成功。此发布包含 Sites v48 同版运行时代码，不再是早期花朵冻结版。

新视觉开发继续使用 `experiment/lookback-v2` 和原 Sites 项目；后续是否更新 Pages 需按当轮授权判断，不自动沿用本次发布授权。向 `main` 提交文档也会触发现有 Pages 工作流，运行时代码不变。

旧仓库 `Llhleo/2n` 保持不动。禁止为整理仓库删除模型、研究、历史分支或改写 Git 历史。
