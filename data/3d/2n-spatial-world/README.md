# 2n Spatial World

面向中文玩家的 Florr 2n 公会全 3D 叙事：五境 → 同行与成员 → 工会历史 → 立体花瓣开放弧结尾。

| 入口 | 地址 |
| --- | --- |
| 主站 GitHub Pages | https://llhleo.github.io/2n-spatial-world/ |
| 主站 Cloudflare | https://2n.llhleo.top/ |
| 备用 EdgeOne | https://2n.edgeone.llhleo.top/ |
| 备用 Vercel | https://2n-spatial-world.vercel.app/ |
| Sites 迭代预览 | https://twon-dark-spatial-world.llhleo.chatgpt.site |

模型保留五家候选：Pages、Cloudflare、EdgeOne、Vercel、固定提交的 jsDelivr。每模型最多三路活动下载；赢家需通过解压、GLB、长度及 SHA-256 校验。jsDelivr 仅资源 CDN，没有完整网页。

## 开发与发布

正式源为 `main`。Pages 工作流监听 main；Cloudflare 已改为 main 自动生产部署。EdgeOne 现有生产分支 `perf/free-mirrors-2026-10-07` 由 `sync-edgeone.yml` 从 main 快进同步，仍承担部署用途，不应删除。Vercel 的实际生产版本须结合平台状态和 release.json 核对。Sites 单独发布。

安装依赖后运行 `npm run dev`；检查 `node --test`；构建 `npm run build`。Pages 构建追加 `-- --base=/2n-spatial-world/`。不提交 dist、node_modules 或生成的传输目录。

- [当前状态](PROJECT_STATUS.md) · [接续开发](CODEX_HANDOFF.md)
- [托管与自动更新](docs/deployment/hosting-and-updates.md) · [文档索引](docs/README.md)
- [人物资料](content/people.json) · [工会历史](content/history.json)
- [仓库维护规则](docs/REPOSITORY_GUIDE.md)

旧仓库 Llhleo/2n 不改动。保留原始模型、纹理、研究和历史记录；仅清理已被正式版本包含、且不再承担部署职责的分支。
