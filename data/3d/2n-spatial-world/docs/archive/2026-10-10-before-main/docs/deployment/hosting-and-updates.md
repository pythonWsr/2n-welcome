# 托管入口、资源竞速与自动更新
更新日期：2026-10-07。适用仓库仅为 Llhleo/2n-spatial-world，禁止修改旧 Llhleo/2n。

## 主网站与五家候选
主网站为 GitHub Pages 和 Cloudflare 自定义域名。以下入口均已验证公开可访问；2026-10-07 最近完成的运行时代码为 `1f508c5ab7c75dcdee8d3921f60b74c8bee58bbc`。

| 候选供应商 | 网页/资源入口 | 角色 |
| --- | --- | --- |
| GitHub Pages | https://llhleo.github.io/2n-spatial-world/ | 主网站；独立模型候选 |
| Cloudflare Pages | https://2n.llhleo.top/ | 主网站；独立模型候选 |
| EdgeOne | https://2n.edgeone.llhleo.top/ | 备用网站；独立模型候选 |
| Vercel | https://2n-spatial-world.vercel.app/ | 备用网站；独立模型候选 |
| jsDelivr | https://cdn.jsdelivr.net/gh/Llhleo/2n-spatial-world@COMMIT/public/assets/ | 仅资源 CDN，无完整网页；COMMIT 必须换成构建对应的40位提交 SHA |

Cloudflare 别名 https://2n-spatial-world.pages.dev/ 与 CF 主站属于同一家，不重复计数。EdgeOne 的旧连字符域名不是当前入口；使用上表带点的域名。jsDelivr 示例中的 COMMIT 是占位符，不是可访问网站链接。

模型先尝试校验过的本地缓存；每个模型最多3条活动下载，先完成解压、GLB、长度和 SHA-256 校验的请求获胜，取消其他活动请求。五家候选并非同时全量下载，未启动的来源不能断言比赢家慢。网页入口、JS、字体不参加这套模型竞速；入口完全打不开时需自行打开另一个主站/备用站。加载详情默认隐藏，可展开、关闭，显示候选和实际赢家。保留高清模型质量。

## main 自动更新：当前尚未统一
有新提交、创建 tag 或创建 GitHub Release 本身不等于所有托管站自动更新。只有被平台/工作流监听的分支提交、构建和发布成功，才算更新。

| 来源 | 当前配置或核对依据 | 合 main 后自动更新？ |
| --- | --- | --- |
| GitHub Pages | 当前发布分支 pages.yml 监听 perf/free-mirrors-2026-10-07；main 目前旧工作流监听 main 与旧 sync 分支 | **不能直接保证**：直接合并当前工作流将覆盖 main 监听，必须先修复触发分支 |
| Cloudflare | 本轮 API 核实 production_branch=perf/free-mirrors-2026-10-07，production_deployments_enabled=true | **不会随 main 更新**，除非先改生产分支 |
| EdgeOne | 最近控制台已核对 Git 自动部署跟踪 perf/free-mirrors-2026-10-07；最近该分支推送后的公开 release.json 已更新到1f508c5 | **不能保证随 main 更新**，需重新核实并切换生产分支 |
| Vercel | 最近 Git 集成记录为 main 原生生产、功能分支预览；本轮功能版本通过 API 手动发布 production。当前 API 确认生产 READY、无密码/SSO保护，但未返回生产分支字段 | main 原生发布链路此前已观察到；**交接时仍需核实设置**，功能分支不会自动成为生产 |
| jsDelivr | 每次构建按平台 commit 生成不可变原GLB URL，资源来自仓库 public/assets | 新 main 的网站成功构建并上线后使用新的固定commit地址；不是CDN独立构建网页，也不保证即时全球命中 |

Sites 不是上述五家之一；更新 GitHub 不会自动更新 Sites，若仍需要迭代预览，应另行部署原 Sites 项目。

## 给后续模型的合并/发布指示
用户期望 main 成为统一正式发布源。以下步骤**尚未全部执行**；不能把此说明当成配置已完成。

1. 先读 README、CODEX_HANDOFF 和本文件；核对远程分支、PR及各站 release.json，保留现有新版本成果。当前工作分支为 perf/free-mirrors-2026-10-07，PR #7 原目标是 feature/next-journey，不要未经核对改目标或宣称已合 main。
2. 合 main 前将 .github/workflows/pages.yml 的 push.branches 改为 [main]，保留 workflow_dispatch、Pages权限、github-pages环境和构建 base=/2n-spatial-world/。该环境已有 main 允许规则，不关闭保护、不新建环境绕过规则。若迁移期间需同时发布两分支，必须明确最后赢家会覆盖同一个站，避免同时推送造成版本倒退。
3. 在 CF 项目2n-spatial-world中把生产分支改为 main，保留Git连接、自动生产部署、npm run build、dist、CORS与域名。现有Toolkit工具只能读项目或创建新项目，不能因此假装已修改；使用支持更新的接口或获准的控制台操作。不要删除重建项目。
4. 在 EdgeOne 国际站现有项目 makers-d48cid6xzqvr / 2n-spatial-world 中核实并改生产分支为 main，保持Git自动部署、npm run build、dist、自定义域名、有效HTTPS证书及edgeone.json响应头。不要换成会过期的eo_token预览地址，不新增收费服务。
5. 核实 Vercel 现有项目 prj_oRWHEuqgx8wtJCFuQlysxdxBMORP（team_qnKxFjx6UMvDiJf1azQiEjUg）的 Production Branch=main、Git自动发布启用、生产域名公开。保持无密码/SSO保护，不把受保护的分支预览当正式公共入口。如果无法核实生产分支，明确报告“待核实”，不能仅凭手动生产部署声称自动更新正常。
6. 构建链保留 scripts/build-model-transport.mjs，用CF_PAGES_COMMIT_SHA、VERCEL_GIT_COMMIT_SHA、GITHUB_SHA或真实Git HEAD生成40位commit固定的jsDelivr原GLB地址。不使用main分支缓存作为即时版本，不把未提交的压缩目录当成GitHub CDN源。EdgeOne build时也必须检查生成的commit地址，不能把上次manifest覆盖回来。
7. 模型必须在 public/assets 中并提交Git；更新生成规则和资源注册后运行 node --test、npm run build；Pages还应验证子路径构建。不要提交dist、node_modules或生成的model-transport目录。无损压缩、长度/SHA256验证和三路并发上限必须保留。
8. 只有实际得到用户合并授权后才合 main；本轮用户只要求更新说明和核对，不是合并授权。若平台生产分支修改遇到需要确认的权限/安全操作，准备具体可审阅结果后说明阻塞，不绕过。
9. 合并后的main推送应触发各平台构建；观察构建/发布成功，再检查4个完整站 release.json 的commit均等于同一个main SHA。实际GET内容哈希模型，验证200、GLB/解压长度、SHA256、跨域权限；检查jsDelivr固定commit样本，并用iPhone Safari测试两主站的冷缓存开屏和日志。必要时清理/检查过期入口缓存，不因为一次旧release响应断言Git连接坏了。
10. 异步发布可暂时有版本差异，缺少新哈希资源时由其他有效源回退。全部一致前报告各站实际commit和阻塞，不能只凭HTTP200或GitHub绿勾声称五家都同步。创建tag/Release时若main没有新推送，按平台实际触发规则处理，不承诺自动重建。

## 新版本验收记录应包含
Git SHA、分支、4站release.json、各平台成功部署依据、模型/CORS校验结果、jsDelivr固定commit、iPhone实测是否完成。当前271项检查及构建通过；CF、EdgeOne、Vercel、Pages已验证1f508c5，EdgeOne与Pages的41模型全部下载校验通过。这些是最近运行时版本验收，不能替代未来main发布后的复核。

更多历史部署记录见 [free-mirrors.md](free-mirrors.md)，旧记录按时间阅读，以本文件的当前说明为准。
