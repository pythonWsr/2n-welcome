# 托管、五家竞速与自动更新
更新：2026-10-10。仅适用Llhleo/2n-spatial-world。

| 平台 | 入口 | 发布来源 |
| --- | --- | --- |
| GitHub Pages | https://llhleo.github.io/2n-spatial-world/ | pages.yml监听main，保留原github-pages环境与子路径 |
| Cloudflare Pages | https://2n.llhleo.top/ | API已切换main，保留Git连接与生产自动发布 |
| EdgeOne | https://2n.edgeone.llhleo.top/ | 仍监听perf/free-mirrors-2026-10-07；sync-edgeone.yml在main更新后快进该分支 |
| Vercel | https://2n-spatial-world.vercel.app/ | 既有main Git自动生产集成，本轮main推送实际生成同SHA生产部署并READY |
| jsDelivr | https://cdn.jsdelivr.net/gh/Llhleo/2n-spatial-world@COMMIT/public/assets/ | 资源CDN；COMMIT由每次构建真实40位SHA替换，无网页部署 |

EdgeOne控制台本轮遇到登录墙，未宣称已把平台设置改成main。使用保留的Git自动部署链路，通过工作流快进同步main；同步不会强推覆盖独立成果。如果快进失败，应检查发布分支新增工作，不能强制推送。该分支仍有用途，清理时保留。

模型先试本地有效缓存，再最多三条活动请求，五家候选按供应商去重。先通过解压、GLB、原长度和SHA256校验的请求获胜并取消其他活动请求。没有降低高清模型质量。原始GLB、缓存和候选失败回退保留；加载日志默认隐藏。网页/JS/字体本身不参加模型竞速。

main推送不等于部署成功。需观察Pages/CF/EdgeOne/Vercel各自发布结果，核对四个网页的release.json，再GET模型校验长度/SHA256/CORS。jsDelivr读取commit固定的仓库原始GLB，不使用main缓存当即时版本。Sites单独部署，GitHub更新不会自动更新Sites。

本轮授权发布与核对记录见 [main发布](../2026-10-10-main-release.md)。此前状态全文已归档在../archive/2026-10-10-before-main/。历史“五家已同步”只代表当时提交，不代表本轮版本。
