# 2n Spatial World

2n 公会的五区域 3D 展示网站。现有模型、高清花瓣、花朵和人物文案均保留。

- 主网站 GitHub Pages：https://llhleo.github.io/2n-spatial-world/
- 主网站 Cloudflare：https://2n.llhleo.top/
- 备用网站 EdgeOne：https://2n.edgeone.llhleo.top/
- 备用网站 Vercel：https://2n-spatial-world.vercel.app/
- 第五家候选 jsDelivr：仅模型资源 CDN，无完整网站（构建自动固定 commit）
- **托管/竞速与 main 自动更新：[当前配置和后续模型指示](docs/deployment/hosting-and-updates.md)**
- Sites（迭代预览）：https://twon-dark-spatial-world.llhleo.chatgpt.site
- 当前加载优化发布分支：`perf/free-mirrors-2026-10-07`；历史视觉开发记录另见交接文件
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

当前运行时版本 `1f508c5` 已公开部署到 Pages、CF、EdgeOne、Vercel。模型使用上述五家候选，每个模型最多3条活动下载，赢家须通过完整校验；加载日志默认隐藏。

**目前不能保证合 main 后全部托管站自动更新。** CF与EdgeOne跟踪加载优化发布分支；该分支Pages工作流只监听自身，直接合并会覆盖main触发规则；Vercel功能版本本轮由手动生产发布完成。合main前必须按[托管与更新指示](docs/deployment/hosting-and-updates.md)统一生产分支并核验，jsDelivr随网站构建生成新commit固定地址。创建tag或Release不自动等同于部署。

本轮仅更新说明，不合并main、不修改平台生产分支。后续模型先阅读上述指示和CODEX_HANDOFF，再根据当轮用户授权发布。2026-10-05 Pages历史记录仍保留供追溯；Sites需单独部署。

旧仓库 `Llhleo/2n` 保持不动。禁止为整理仓库删除模型、研究、历史分支或改写 Git 历史。
