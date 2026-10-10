# 接续开发

先读 README、PROJECT_STATUS、docs/deployment/hosting-and-updates.md，再核对远程 main 与实际 release.json。

1. 使用最新 main 为基线；保留五境、原始模型、人物与工会史事实，旧 Llhleo/2n 不改。
2. 模型五家竞速和三路并发、无损传输、校验及缓存不可丢失。jsDelivr URL 必须固定真实40位构建提交。
3. guild-next-view.js 管理末尾文字；guild-memory-scene.js 管理故事及最终花瓣。文字淡化时实体花瓣必须保留 nativeDepthWrite，否则会出现内部面覆盖正面的花瓣错乱。
4. main 推送触发 Pages 与 Cloudflare；sync-edgeone.yml 快进 EdgeOne 仍监听的 perf/free-mirrors-2026-10-07，不删该分支。Vercel 核对实际生产部署。Sites 单独部署同一源码。
5. 合并前 node --test 和 Pages 子路径构建；合并后核对四站 release.json 及 commit 固定 CDN 样本。不能仅凭HTTP200称全平台同步。
6. 原有手机视觉、GPU性能验收仍须实际验证；自动测试不代表Safari实测。

历史设计与交接保留在 docs/；本轮整理前的入口全文在 docs/archive/2026-10-10-before-main/。
