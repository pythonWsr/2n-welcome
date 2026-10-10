# 免费多线路加载与自动更新

基于 feature/next-journey 的 b91ac412212a82d20119cd634b65e588392c5698，保留最新结尾、重播修复和所有高清资产。

## 下载行为

每个模型先读按 SHA-256 标识的浏览器缓存。原源先发起下载，2 秒未完成时启动备用源，同时最多两份下载。第一个完成解压、GLB 检查、长度和 SHA-256 校验的结果获胜，取消另一份下载。后续优先使用上一个有效源；失败时仍会尝试其他源。压缩资源均失败后保留本页原 GLB 回退。成功资源保留，重试不刷新页面。

所有 41 个唯一模型（高清花瓣、花朵、五境花瓣）统一生成内容哈希压缩文件；此构建原始 53,803,588 字节，无损传输 39,514,097 字节。未简化模型或贴图。

`VITE_ASSET_MIRRORS` 是逗号分隔的 HTTPS 静态资源根地址，例如 `https://2n.llhleo.top/,https://2n-spatial-world.vercel.app/`。未设置时只使用已有 Vercel 生产地址。Cloudflare 地址在成功部署、确认 CORS 后才加入配置。字体、JS 和网页入口继续由各站自己提供，当前竞争机制仅覆盖 GLB。

## 自动更新

Vercel 项目 `2n-spatial-world` 已通过 Git 集成关联本仓库，已观察到 main 生产部署和 feature/next-journey 推送产生的自动预览部署。main 是正式发布来源；功能分支自动产生预览，不能把未合并分支当成 main。两家必须跟踪同一正式分支、运行相同构建。无需额外 Vercel Token 或付费服务。

Cloudflare Pages 已连接 Git 仓库 Llhleo/2n-spatial-world；当前试发布生产分支 perf/free-mirrors-2026-10-07；构建命令 npm run build；输出 dist。CF 随此分支更新，Vercel main 自动发布不变；两家尚未统一正式发布分支，不能声称任意分支的新版本自动同步。现有 2n.llhleo.top 被 Worker 占用，不覆盖；新自定义域名待确认。项目中已有 public/_headers 设置 CORS 与内容哈希文件长期缓存，vercel.json 提供等价响应头。不要将 `.glb.gz` 强制标记成 Content-Encoding: gzip；程序兼容返回压缩字节或平台已解压的 GLB。

每次构建生成 `/release.json`，携带平台提供的 Git commit SHA，no-cache，可对比两个站是否完成同一版本部署。异步部署期间某镜像缺少新哈希文件时回退可用源；旧代码不会接受内容不匹配的新模型。不宣称多平台发布具有原子性。

## 费用与入口

使用 Pages 静态托管和 Vercel Hobby，不启用 R2、付费 Worker 或付费计划。域名续费独立于托管。镜像落地复制全部静态产物，不能运行时代理回 GitHub。Cloudflare 与 Vercel 是独立供应商；Vercel 自定义子域名应设 DNS-only。

网页入口完全无法访问时，其 JS 无法自动切换，应同时公开主站和备用站链接。免费境外托管不能保证国内速度；仍需国内三运营商、iPhone Safari 冷缓存测试。测量首帧、解除开屏锁、下载、解码、预热分阶段耗时，不把本机下载速度当成中国网络实测。

## 本轮验证

259 项 Node 检查通过；生产构建通过；无超过 25 MiB 的构建文件。新增测试覆盖备用源胜出并取消停滞请求、拒绝错误版本、全源失败有限退出。Cloudflare Pages 和域名绑定待可用接口或经批准的浏览器操作，未配置即不属于已完成的自动更新链路。

## 2026-10-07：公开部署与隐藏日志

开屏“加载详情”使用原生 details，默认折叠。展开后显示主加载阶段、最近线路、下载/缓存/失败计数及最近 60 条请求、胜出、缓存、解析和失败事件；支持关闭按钮及 Escape，开屏结束随加载状态隐藏。仅展开时限频更新，不增加动画帧负担，不持久化，不显示 URL query 或请求头。模型下载按绝对 URL 去重，本站不会与本站别名重复竞争。

早一轮 Pages/DNS 接口尚缺 Git 连接能力；后续新增 cf_pages_create_github_project 已实际成功创建 Git 集成项目，不再存在该接口阻塞。现有 2n.llhleo.top 是 Worker 管理的只读 AAAA 记录，不覆盖。

用户已明确授权公开 Vercel 部署。本轮验证日志与下载逻辑，Vercel Git 集成继续自动构建分支预览；生产 main 自动发布不变。此次功能分支正式部署只更新 Vercel，不合并 main，不更改 GitHub Pages。浏览器实机检查及国内线路速度仍需单独验收。

## 2026-10-07：CF 独立线路上线

项目 2n-spatial-world；公开入口 https://2n-spatial-world.pages.dev/ 。部署 c93ed079-ff57-4915-8f30-61938cdf09df，源码 0839f1ac95b43339770f2118045580d0d676d484；平台 build/deploy 均 success。新浏览器可无登录打开站点，默认折叠“加载详情”。测试浏览器无 WebGL 2，未完成 3D 动画视觉验收；资源 HTTP 校验被当前执行环境访问限制阻挡，未宣称完成 CORS/模型下载验收。CF 不经 Vercel 代理，页面、字体、脚本和原始模型均由独立静态产物提供；已有模型竞速在 CF 入口使用同源和 Vercel 备用。Vercel/其他入口尚未新增 CF 为默认模型镜像，待资源响应核验。

当前 CF 开启 perf/free-mirrors-2026-10-07 分支的 production_deployments_enabled，后续该分支提交会自动构建。域名 spatial.llhleo.top 尚未写 DNS，查询未发现现有记录；若获准，可 CNAME 到 2n-spatial-world.pages.dev 并绑定 Pages。免费全球 CF 非付费 China Network，国内访问与速度待用户实测；入口本身不可达时资源竞速无法解决，必须提供独立入口。

## 2026-10-07 11:57：域名绑定与第三资源源核对

用户授权绑定 2n.llhleo.top，已删除旧 Worker。DNS 查询无记录；Pages 已登记域名。新增 proxied CNAME（2n.llhleo.top -> 2n-spatial-world.pages.dev）返回 Cloudflare API 403 Authentication error。随后 DNS 仍为空，Pages 为 pending / CNAME record not set。域名尚未完成；需修复 DNS 写入凭据权限后继续，不反复重试同一认证失败。

远程加载器默认仅配置本站和 Vercel，CF 无镜像环境变量覆盖：实际两条资源候选，不是三条。自有域名与 pages.dev 是同一 CF 源；缓存和原GLB回退不算独立线路。GitHub Pages 的 release.json 和当前内容哈希压缩模型样本均404，未接入当前竞速。

jsDelivr 新候选已实际 GET 全部41个原始GLB（固定提交0839f1ac95b43339770f2118045580d0d676d484），全部200、跨域*、长度与SHA-256匹配，合计53,803,588字节，无失败。例：https://cdn.jsdelivr.net/gh/Llhleo/2n-spatial-world@0839f1ac95b43339770f2118045580d0d676d484/public/assets/garden-petals/rock.glb 。原始GLB在GitHub中，构建生成的model-transport压缩文件未在仓库中；接入必须适配路径、保持内容校验，随构建固定commit。官方分支缓存12小时，不适合作即时更新。只完成寻找和验证，尚未修改加载器，非国内测速。

完整第三托管候选：EdgeOne Makers/Pages官方Free支持Git与自动CI/CD，可部署同一dist，另配置CORS和内容哈希缓存；大陆可用区自定义域名要求备案，海外区域需国内实测。尚未部署。Netlify Free目前300credits/月，生产部署15credits、流量20credits/GB，3D流量下额度偏紧，不优先。

来源：https://github.com/jsdelivr/jsdelivr 、https://pages.edgeone.ai/pricing 、https://pages.edgeone.ai/document/domain-overview 、https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/ 。

## 2026-10-07：jsDelivr 自动跟随构建

已接入原GLB jsDelivr候选，每次build依据CF_PAGES_COMMIT_SHA、VERCEL_GIT_COMMIT_SHA、GITHUB_SHA或Git HEAD生成不可变URL。非40位commit不生成CDN候选；不使用分支缓存。默认镜像加入CF Pages与Vercel，本站地址去重，jsDelivr作为额外候选，沿用GLB/长度/SHA-256校验、最多2个同时请求和失败回退。CF入口现在有CF、Vercel、jsDelivr三家资源候选。CDN的原GLB比无损压缩传输大，优先级在压缩资源之后。自动更新仅在相应发布分支成功build后生效，不代表GitHub任意分支变更都会发布。

EdgeOne无可用专用接口，已通过浏览器尝试腾讯云邮箱登录；目前停在拖拽安全验证码，尚未创建或连接EdgeOne项目，需要验证码操作确认。未宣称EdgeOne自动更新已完成。

本轮 node --test 全量检查和生产build已运行；生成41个固定commit的CDN地址，新增原GLB来源胜出及错误版本拒绝的回归测试。

## 2026-10-07：EdgeOne 国际站 Git 自动部署落地

经用户确认，仅安装授权 Llhleo/2n-spatial-world 的 EdgeOne GitHub App。国际站项目 makers-d48cid6xzqvr / 2n-spatial-world；生产分支 perf/free-mirrors-2026-10-07；自动部署开启，预览关闭；全球可用区（不含中国大陆），Vite / npm install / npm run build / dist。未启用收费服务。

首次部署 dpencn5fozxk 成功，源码 9e328fd8d4fd93f3fb4e1f1a0f9d070a071fbaa0。随后推送 edgeone.json 配置提交 c6a44f290e0aba2579b2a3efe0ccb319f29d16f5，自动产生生产部署 dp425cfe4zgv，47 秒构建成功，Git 推送触发链路已实际验证。控制台标头面板确认 /assets/* 跨域 *、内容哈希压缩资源 immutable 一年、release.json no-cache 配置已生效。

公开入口 https://2n-spatial-world.edgeone.dev/ 和首次独立部署地址均返回 Site Unavailable；执行环境对 release.json 的实际 HTTP GET 虽为 200，但内容是同样的 HTML 错误页，不能认定资源可用或完成 CORS 验收。域名面板显示已生效，项目显示运行中，失败原因未确定。未把尚不可访问的 EdgeOne 域名加入默认镜像。当前已验证并接入的独立供应商仍为 CF Pages、Vercel、jsDelivr；同源和原 GLB/浏览器缓存回退不重复计算。待 EdgeOne 入口与模型 GET 可用、长度/SHA256/CORS 验证通过后才接入。

2n.llhleo.top 先前 Pages 登记待 CNAME，DNS 写入接口认证失败仍未解决。EdgeOne 官方域名说明指出大陆环境访问默认域名需时效预览链接，建议自定义域名建立稳定入口；本次 Site Unavailable 不能据此直接判定为大陆限制。来源 https://pages.edgeone.ai/document/domain-overview 。

## 2026-10-07：供应商去重与首轮独立竞速

CF 自定义域名 2n.llhleo.top 已验证入口、release.json c580a811、rock 压缩模型实际 GET；解压后长度/SHA256 正确，CORS *。用户新增 EdgeOne 自定义域名 2n-edgeone.llhleo.top，目前部署中，测试请求返回 502，未加入默认镜像，待实际模型可用再接入。

新增明确供应商映射，只针对本项目域名合并 CF 自定义域名与 pages.dev；EdgeOne 自定义域名与默认域名亦同类。每个模型候选去重后，默认立即发起最多两条独立供应商请求；原源与 commit 固定的 jsDelivr 为首次竞争，Vercel 为剩余候选；复用上次验证赢家。失败/超时释放位置继续后续候选，获胜取消其他活动请求，保留 GLB/长度/SHA256 和原文件回退。并发上限是每个模型两条请求，不宣称所有供应商同时下载，也不保证未发起线路一定更慢。

隐藏日志新增全部候选供应商及最近状态（未启动/下载中/获胜/失败/已取消），累计请求/胜出/失败/取消；“最近获胜线路”仅由通过校验的赢家更新，正在下载的请求不再覆盖它。保持默认折叠、展开时限频更新、有界记录、不记录 query/token。浏览器本地缓存命中时可不发起网络竞速。

新增回归测试验证 CF 别名合并、两条独立请求在响应前启动、候选与取消可见且不覆盖赢家。node --test 268 项通过，npm run build 成功。未改变五境/资产质量/GitHub Pages。

## 2026-10-07：EdgeOne HTTP 校验故障与 Pages 发布

用户实际域名为 2n.edgeone.llhleo.top（不是此前的连字符域名）。HTTP release.json 返回 5078a04，HTTPS 返回证书 hostname mismatch；HTTP 页面不具备 crypto.subtle，导致每条下载在 SHA256 校验时失败。保留安全校验，不降级到无校验或 HTTP 镜像。加载器在发起请求前检查安全摘要能力，不具备时提示使用有效证书的 HTTPS 地址，避免误报多源网络故障。EdgeOne 分类识别已加入正确自定义域名，TLS 和 HTTPS 模型核验之前不启用为默认镜像。

用户明确授权当前版本发布 GitHub Pages。pages.yml 改为跟踪 perf/free-mirrors-2026-10-07，保留 Actions 构建/上传/部署与子目录 base=/2n-spatial-world/；不合并 main，不修改旧 Llhleo/2n。Pages 发布与模型 CORS/SHA 校验完成后才增加该资源根。269 项检查及 Pages 子路径生产构建通过。

## 2026-10-07：GitHub Pages 接入竞速

经用户明确确认，在 github-pages 环境允许名单中只新增精确分支 perf/free-mirrors-2026-10-07，保留 main 与 release/pages-flowers-2026-10-03 及其他保护配置。重试运行 37579480186 后 release.json 已公开返回 3346da9；rock 内容哈希压缩文件 GET 200、CORS *、解压后长度 319572 和 SHA256 均匹配。默认模型镜像新增 https://llhleo.github.io/2n-spatial-world/，保留仓库子路径。CF 入口现在有 CF、jsDelivr、Vercel、GitHub Pages 四家独立候选；每个模型最多两条活动下载，不是四条同时全量下载。第一个完成校验的活动请求胜出，失败后补充其他候选，历史赢家优先，缓存命中可不下载。

pages.yml 已跟踪此发布分支的推送，Actions 自动测试/构建/部署；jsDelivr 随构建固定 commit，内容哈希防止混用不同模型。未合并 main，未修改旧 Llhleo/2n。270 项检查通过，Pages 子路径构建通过；构建有现存大 chunk 提示，不影响退出成功。Vercel 当前仍是 main 原生生产自动发布，本功能分支通过手动 API 发布 production，不能声称任意分支在所有平台自动同步。

EdgeOne 正确域名 2n.edgeone.llhleo.top 的 HTTPS 重试仍返回证书 hostname mismatch，尚未加入跨站默认镜像；HTTP 静态文件可访问不等于安全网页可加载模型。需要有效 HTTPS 证书后再核验资源/CORS并接入。不关闭 SHA256，不绕过 TLS，不增加 HTTP 镜像。默认折叠日志继续显示已配置候选与实际获胜线路；本次未完成 iPhone Safari 国内冷缓存或真实 WebGL 视觉验收。

## 2026-10-07：EdgeOne HTTPS 与三路并发

用户已配置 EdgeOne 证书，HTTPS release.json 已返回 fecb925；rock 压缩模型 HTTPS GET 200、CORS *、解压长度与 SHA256 通过。新增 https://2n.edgeone.llhleo.top/ 为默认独立资源镜像，并排在默认备用压缩源第一位；CF 入口首次请求通常是 CF、commit 固定 jsDelivr、EdgeOne。共五家候选：CF、jsDelivr、EdgeOne、Vercel、GitHub Pages。保持供应商去重、历史赢家优先、GLB/长度/SHA256 验证、缓存与原文件回退。

根据用户要求每个模型活动请求上限由 2 提高到 3，默认立即启动最多三家，获胜取消其他活动请求，失败释放位置补后续候选。上限按模型计算，不是全站三条；未发起的剩余候选不能被断言更慢。自定义正 hedgeDelay 时启动第一家后，延迟启动其余两家。新增测试证明前三条在完成响应前启动且第四条保持等待；271 项全量测试通过，生产构建通过，现有大 chunk 提示仍在。自动 Git 发布分支、Pages 子路径和模型质量不变。
