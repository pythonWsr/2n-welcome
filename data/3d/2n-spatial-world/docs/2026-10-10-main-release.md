# main发布与仓库整理

用户授权：放大结尾最后一行2n，合main并发布Pages，保留五家竞速，核对各平台并清理无用分支。

结尾2n从15px调整为响应式36–52px，手机390–430宽约43–47px；正文和标题、左对齐、布局边界均保留。295项完整测试通过；Pages子路径构建通过；仅保留既有大包警告。五家候选、三路并发、GLB/长度/SHA256校验代码未修改。

Pages触发分支改main。Cloudflare实际API已切换main并保留自动生产部署。EdgeOne控制台要求登录，平台分支未改；新增main→旧EdgeOne生产来源分支的快进同步工作流，避免旧站停更并保留有用途分支。Vercel发布状态及线上版本待合并后核对。

整理README、PROJECT_STATUS、CODEX_HANDOFF、仓库规则、文档索引与部署说明；旧入口完整归档，不删除模型、研究或历史记录。分支清理仅处理main已完整包含且无部署用途、无独立成果的分支。合并及线上结果在本记录后续追加，当前不能仅凭本文件称发布完成。

## 实际发布证据

PR #8已合并，main运行时提交ec19d04bd50f66e79a3927594da28d463f818ed6。Pages运行38060302245成功；CF生产部署a72f5714-b705-4527-a66b-5e1fe180d91e成功；EdgeOne main同步运行38060302205成功且线上release.json为同SHA；Vercel通过main原生Git触发生产部署dpl_463snQ4cNsojdsWYQ9Prh4eQpUrC，状态READY。Pages、CF自定义域名/别名、EdgeOne实际release和脚本均包含放大2n、新commit固定CDN及EdgeOne候选配置。Vercel刚完成构建，正式域名最后一轮核对结果另附。

四站及jsDelivr指南针样本2443780 bytes、原SHA256匹配、CORS *；Vercel样本是在生产切换期间取到，其模型内容未变化，网页版本仍需最后核对。无国内运营商/iPhone Safari实测结论。

Sites v74来源fa7685f61ddb711d1a20c3bd730a03732a645637，归档构建使用上述main运行时SHA；部署appgdep_6aca4e21102c8191bbb03ceba912c719成功。

清理运行38060302232成功，远程分支13→8。已删除experiment/lookback-v2、feature/ending-open-arc、feature/hell-companionship、feature/next-journey、sync/persistent-3d-2026-09-27；提交均在main，不丢失成果。保留main、EdgeOne同步发布分支、3个有独立成果的模型实验分支、research/florr-3d-assets、旧花朵release及perf/china-network-2026-10-06。PR #7已被#8取代并关闭；PR #6和它未合并的独立优化成果保留。

最后核对：Vercel正式域名release.json已切换到ec19d04bd50f66e79a3927594da28d463f818ed6。四站运行时一致，jsDelivr固定提交模型可用。后续审核文档提交不改变运行时代码，各平台仍须随新的main提交完成各自构建。
