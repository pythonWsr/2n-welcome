# 提交给 WSR — Cloudflare QQ SMTP Worker v0.2.2

## 已部署

- Cloudflare Worker 名称：`2n-qq-smtp-worker`（由 Agent Toolkit 部署，版本 v0.2.2，部署记录显示 100%）
- `workers_dev = true`（Wrangler 配置和 Cloudflare 后台已启用）
- HTTP 接口：`GET /health`、`POST /v1/send`、`POST /v1/notify`
- 邮件协议：`X-2N-Protocol-Version: 2`（v0.2.2 与 v0.2.0 协议版本相同）
- 仍为**联调原型**，没有通过 QQ SMTP 出口/IP 风控测试。

## 收件人来源已经按你的决策固定

配置文件（公开）：

`https://raw.githubusercontent.com/pythonWsr/2n-welcome/main/config/mail-recipients.json`

规范：

```json
{"version":1,"recipients":[{"id":"20180333","email":"receiver@example.com","default":true}]}
```

`receiver@example.com` 必须由你替换成知情同意公开的 20180333 邮箱。

- 你的仓库需设置 `.github/CODEOWNERS` 文件，写入 `/config/mail-recipients.json @pythonWsr`，并启用 Require review from Code Owners 的分支保护；仅有 CODEOWNERS 不等于强制审核。
- Worker 固定校验上述 URL，不接受请求体改变 URL；`recipient_id` 可缺省，使用唯一 `default:true`。
- Cache API 有效缓存 300 秒，GitHub raw 上游缓存可能造成额外延迟，无法承诺严格全球五分钟内刷新。
- 正确仓库 `pythonWsr/2n-welcome` 的配置文件已在 main；GitHub API 读取并解析成功。

## Cloudflare 所需三个 Secrets（均已核实存在）

- `SMTP_USERNAME`：QQ 发信邮箱
- `SMTP_AUTH_CODE`：QQ SMTP 专用授权码
- `SEND_API_TOKEN`：独立随机 Bearer Token，GitHub Actions 中存为 `WORKER_TOKEN`
- `RECIPIENTS_CONFIG_URL` **不再是必需项**：公开 URL 固定在代码里；如保留旧绑定，必须与上面的正确 URL 一致，否则返回 503。

**不需要 `GITHUB_CONFIG_TOKEN` 或 `MAIL_TO`。不要将任何 Token/授权码提交仓库。**

## GitHub Actions 对接

请求头：`Authorization: Bearer <WORKER_TOKEN>` 与 `Content-Type: application/json`。

`/v1/send` 发送分片 JSON 必含：`job_id, base_sha, target_sha, generated_at, part_index, part_total, filename, sha256, bundle_sha256, content_base64`；可选 `recipient_id`。SHA 均为小写完整值，`part_index` 从 1 开始，文件名必须为 `bundle.part.NNN`。

`/v1/notify` 必含：`job_id, base_sha, target_sha, generated_at, status, message`；可选 `recipient_id`。`status` ∈ `up-to-date, not-ancestor, unknown-base, too-large, manual-action, failed`。

所有请求成功返回 `mail_accepted:true, protocol_version:2, worker_version:"0.2.2", received_at`，分片额外返回 `bundle_sha256, sha256, part_index, part_total`；**mail_accepted 仅代表 QQ SMTP 接受，不代表真正投递到收件箱**。

HTTP 400/401/404/413/415 不重试；502/503/504 或网络超时有限重试，503 带 `Retry-After: 30`。TCP 断开可能已经投递，依赖 Windows 端按 job 去重。

你已决定首次 408MiB 全量走 PC 微信；`part_total>256` 时 Actions 发 too-large 通知而不是附件。Worker 仅有单片 4MiB 硬上限，默认 256KiB 用于小规模联调，**未验证免费版 CPU 限额**。

## 待协作联调

1. WSR 提交上述配置并检查 raw HTTP 200、分支保护；确保 20180333 同意公开邮箱。
2. Llhleo 在 Cloudflare 配齐上述三个 Secrets（已完成），再查 `/health` 的 `mail_configured:true`。
3. WSR 在 Actions 配置 Worker 地址和对应 Token；Actions SMTP 直连后端的邮件头与 Worker 相同，`send_part.py` 保留为单片调用器；`send_all.py` 由 WSR 写。
4. 按 SMTP 64 KiB → 256 KiB → Worker 64 KiB → 256 KiB → 1 MiB 实测；记录 QQ 限流、投递、CPU 1102。
5. 20180333 的 Windows IMAP 接收脚本由 WSR 开发，20180333 配置 Windows 凭据管理器并执行。

## 验证情况

已通过本地 Node Mock SMTP 测试：健康状态、鉴权、私有密钥不入日志、公开配置格式与 300 秒 Cache API、错误 SHA、错误文件名、超限分片返回 413、邮件头、附件 MIME 边界、通知状态。不包含真实 QQ 发信或 Windows 端到端测试。

完整接口协议见 [README.md](README.md)。
