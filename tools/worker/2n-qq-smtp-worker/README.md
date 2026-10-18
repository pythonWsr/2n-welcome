# 2n / welcome-2n QQ 邮件网关 — Worker v0.2.2 / 协议 2

**状态：Worker 原型，尚未通过 QQ SMTP 真实发信测试；请勿用于生产同步。**

本仓库仅提供 Cloudflare QQ SMTP Worker、接口协议与 Actions 调用示例。WSR 负责 Actions 和 Windows 接收程序，20180333 负责 Windows 安装与实测，Llhleo 负责 Worker、配置及发信联调。首次约 408 MB 的仓库初始化包继续通过微信，不经邮件。

## 1. 收件人公开配置与信任边界（WSR 决策）

收件人地址允许公开在 `pythonWsr/2n-welcome` 仓库中；由 WSR 负责取得 20180333 同意并维护数据。

- Worker 固定读取 **仅此一处**公开 raw URL：
  `https://raw.githubusercontent.com/pythonWsr/2n-welcome/main/config/mail-recipients.json`
- 收件人公开 raw 地址**直接固定在 Worker 源码里**，不需要设置 `RECIPIENTS_CONFIG_URL`；如 Cloudflare 里已有此旧变量，它必须与该固定 URL 完全一致，否则返回 `503 invalid_config_url`。HTTP 请求不能覆写仓库地址或指定任意 `mail_to`。
- Worker 使用 Cloudflare **Cache API** 对**验证通过**的配置做 300 秒边缘缓存（各数据中心独立）。匿名读取，无 GitHub PAT、无 `GITHUB_CONFIG_TOKEN`。配置无效或获取失败直接拒绝发信（503），且不缓存失败结果。
- 缓存 TTL 为 300 秒，不代表 GitHub raw CDN 的全球更新延迟有绝对 5 分钟保证。上线前需测实际修改传播时间；若超过 5 分钟，调整缓存与抓取策略。

在 WSR 的 **main** 分支创建 `config/mail-recipients.json`：

```json
{
  "version": 1,
  "recipients": [
    { "id": "20180333", "email": "receiver@example.com", "default": true }
  ]
}
```

把 `receiver@example.com` 替换成 20180333 知情同意公开的真实邮箱。规范：`version:1`、1–30 条、`id` 唯一且仅包含字母数字 `_` `-`、邮箱格式合法、必须**恰好一个** `default:true`。ID 不存在返回 HTTP 400 `unknown_recipient_id`；配置损坏或无法读取返回 HTTP 503。

在仓库 `.github/CODEOWNERS` 加入：

```text
/config/mail-recipients.json @pythonWsr
```

**必须结合 GitHub Ruleset/Branch Protection 启用 Require review from Code Owners；单独 CODEOWNERS 文件不会强制审核。** 公开邮箱可能被爬虫读取，且拥有合并受保护分支权限的人可能改动收件人；此项是经仓库 owner 确认的信任边界变更。

> 2026-10-18 核查：已通过 GitHub API 验证 `pythonWsr/2n-welcome` 的 `main/config/mail-recipients.json` 存在且 JSON 格式正确；真实 Worker 到 GitHub raw 的请求仍需线上测试。

## 2. Cloudflare 配置与 Secrets

在独立 Worker `2n-qq-smtp-worker` 中只需要配置以下三个 Secrets：

| 变量或 Secret | 内容 |
|---|---|
| `SMTP_USERNAME` | QQ SMTP 发信账号（邮箱） |
| `SMTP_AUTH_CODE` | QQ SMTP 专用授权码，非 QQ 登录密码 |
| `SEND_API_TOKEN` | 生成随机 Bearer Token，WSR 的 Actions 使用相同值作为 `WORKER_TOKEN` |


**不再需要 `GITHUB_CONFIG_TOKEN`，也不使用固定 `MAIL_TO`。**

`wrangler.toml` 已设置 `workers_dev = true`。`/health` 的 `mail_configured:true` 仅表示上述三个 Secrets 非空且没有错误的旧 URL 绑定；不表示 GitHub raw 文件可访问，更不表示 QQ SMTP 已通过实际发信测试。

WSR 需在 GitHub Actions 配置 `WORKER_URL` 和 `WORKER_TOKEN`；不要打印 token、授权码或邮件内容。首次约 408 MiB 仓库初始化包仍采用微信，不走邮件。

## 3. 固定协议：Protocol 2

**全局约定**：

- 文件名 `bundle.part.NNN`，`part_index` 从 **1** 开始，第一片是 `bundle.part.001`，第二片是 `bundle.part.002`。`part_total` ∈ [1,256]，每片单独发送，即使仅有一片也标 `001/001`。
- `job_id` 由 Actions 用 `run_id-run_attempt-target_sha前7位` 生成，例如 `1234567-1-bbbbbbb`。同一次 Action 的全部邮件共用一个 `job_id`。每次重新触发/重跑可生成新 job；旧 job 的包**不能混合**。
- `generated_at` 由 Actions 一次生成、固定在同一 job 内，格式 `YYYY-MM-DDTHH:MM:SSZ`（UTC）。`received_at` 为 Worker 受理时间（API 响应，不保证与最终收件时间一致）。
- 逐片 `sha256` = SHA256(原始分片 bytes)，`bundle_sha256` = SHA256(分片前完整 update.bundle bytes)，二者为 64 位小写 hex。Worker 发信前验证逐片摘要；Windows 端必须再次校验每片及合并的完整摘要，且 `git bundle verify`、校验目标提交。
- 去重记录可使用 `(target_sha,part_index,sha256)`，但**合并的主分组键必须是 job_id**。选择同一目标提交中**最新的完整且校验合格的 job**，绝不混合两个 job 的分片；`generated_at` 是 Actions 发信时间，不能依赖各收件端 IMAP 时间排序作为安全依据。
- 不支持 `only_parts`：首次联调遇到缺片，手动重跑整个 job；接收端可以保留旧 job 以供调试，但不得和新 job 拼接。成功更新后清理过期作业文件。
- `part_size` 由 Actions input/变量控制，**默认 256 KiB 用于联调，上限 4 MiB（仅网关硬上限，不保证 Worker 免费档稳定）**。按 64KiB → 256KiB → 1MiB → 3MiB 做单片测试。默认建议 5 秒发信间隔，QQ 限流应以实际测试结果为准。

### GET /health

无需 Token，返回示例：

```json
{"ok":true,"service":"2n-qq-smtp-worker","protocol_version":2,"worker_version":"0.2.2","mail_configured":false}
```

仅表示 Worker 正常响应；`mail_configured` 检查 Secrets 是否非空，并**不验证 SMTP、GitHub 配置访问权限**。

### POST /v1/send

请求头：`Authorization: Bearer <WORKER_TOKEN>`、`Content-Type: application/json`。

```json
{
  "recipient_id": "20180333",
  "job_id": "1234567-1-bbbbbbb",
  "base_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "target_sha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "generated_at": "2026-10-17T12:00:00Z",
  "part_index": 1,
  "part_total": 2,
  "filename": "bundle.part.001",
  "sha256": "<64位小写hex>",
  "bundle_sha256": "<64位小写hex>",
  "content_base64": "<原始字节的标准Base64>"
}
```

成功返回 HTTP 200：

```json
{
  "ok": true,
  "mail_accepted": true,
  "protocol_version": 2,
  "worker_version": "0.2.2",
  "recipient_id": "20180333",
  "job_id": "1234567-1-bbbbbbb",
  "part_index": 1,
  "part_total": 2,
  "sha256": "<分片sha256>",
  "bundle_sha256": "<完整bundle sha256>",
  "received_at": "2026-10-17T12:00:01.000Z"
}
```

`mail_accepted:true` 仅表示 **QQ SMTP 服务器给出接受应答**，不意味着收件邮箱已经收到附件。

### POST /v1/notify

适用于 `up-to-date`、`not-ancestor`、`unknown-base`、`too-large`、`manual-action`、`failed` 状态通知；同样发送至配置中的 `recipient_id`（可省略）。请求示例：

```json
{
  "recipient_id": "20180333",
  "job_id": "1234567-1-bbbbbbb",
  "base_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "target_sha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "generated_at": "2026-10-17T12:00:00Z",
  "status": "up-to-date",
  "message": "No missing changes; already up to date."
}
```

成功响应与 send 相似：包含 `ok,mail_accepted,protocol_version,worker_version,recipient_id,job_id,received_at,status`，**无分片字段**。Worker 和原生 SMTP 后端对通知邮件使用相同的 `X-2N-*` 邮件头（见下）。`message` 最长 1200 字符，允许换行但禁止控制字符注入。

### 统一邮件头（SMTP 与 Worker 必须一致）

```text
X-2N-Protocol-Version: 2
X-2N-Job-ID: 1234567-1-bbbbbbb
X-2N-Base-SHA: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
X-2N-Target-SHA: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
X-2N-Generated-At: 2026-10-17T12:00:00Z
X-2N-Recipient-ID: 20180333
X-2N-Type: part
X-2N-Bundle-SHA256: <SHA256 of complete bundle>
X-2N-Part: 001/002
X-2N-SHA256: <SHA256 of this part>
```

通知邮件把 `X-2N-Type` 设为 `notify`，额外增加 `X-2N-Status`，**不包含** bundle 和 part 的 SHA256。两个后端都必须遵守此约定，且附件类型为 `application/octet-stream`，文件名固定 `bundle.part.NNN`。

### HTTP 错误码与重试

| HTTP | 条件 | Actions 行为 |
|---|---|---|
| 200 | QQ SMTP 已接受 | 标记分片已提交（并非投递成功） |
| 400 / 401 / 404 / 413 / 415 | 参数错、Token 错、路径错或过大 | 不自动重试，修正配置/请求 |
| 502 | SMTP 连接或投递失败 | 可有限重试，可能产生**重复邮件** |
| 503 | Worker Secrets 或 GitHub 收件人配置缺失/不可用 | 暂停、按 `Retry-After` 或配置修复后重试 |
| 504 / 网络超时 | 结果不确定 | 有限重试，**可能已经投递**，依赖接收端去重 |

Worker 不具备跨请求的幂等保证或持久队列；不要在网络故障时无限重试。建议在 Actions 层设置并发锁、最大重试次数以及片间节流。正式生产需进一步考虑 Cloudflare 侧限流。

## 4. Actions 与 Windows 接收端

`scripts/send_part.py` 使用 Python 标准库调用 `POST /v1/send`；也可使用同一脚本的 `notify` 子命令调用通知接口。运行环境通过 `WORKER_URL`、`WORKER_TOKEN` 读取配置。

Windows 接收端由 **WSR 开发、20180333 运行**。解析协议版本和邮件头，先校验分片，合并后校验完整 Bundle SHA256，然后 `git bundle verify`，从 Bundle fetch 到临时 refs，再安全快进或 rebase。本地未提交修改按双方约定先保留/提交；`rebase` 冲突时 `rebase --abort`，不要默认执行 `reset --hard`。`rebase` 会改写本地提交的 SHA，不能要求最终 HEAD 与远程 `target_sha` 必须相等，而应验证目标 commit 已是本地分支的祖先。

GitHub Actions 端需检查 base_sha 是否是 target_sha 的祖先，增量 bundle 的正确 Git 写法是 `git bundle create update.bundle HEAD ^<base_sha>`（在 checkout 到 target commit 的基础上）；不能只用两个裸 SHA 生成空包。首版不要向不受信任的 PR 工作流暴露 `WORKER_TOKEN`。

## 5. WSR Actions / Windows 接收端对接

- Actions 用 `workflow_dispatch` 收集 `base_sha`（必填）、`recipient_id`（默认 `20180333`）、`part_size`（Worker 默认 `256 KiB`，单片上限 `4 MiB`）、`backend`（默认 `worker`，可切 `smtp`）。
- WSR 生成 `job_id=run_id-run_attempt-target_sha前7位`，`generated_at` 同一 job 内固定；先算完整 `bundle_sha256`，分片编号从 001 开始，`part_total>256` 时不发附件而发 `/v1/notify` `too-large`。
- 由 WSR 维护 `tools/send_all.py` 做有限重试与 5 秒发信间隔；`scripts/send_part.py` 仍保持单片发信，不在这个 Worker 包中实现全局调度。SMTP 后端亦按同一邮件头发信，Worker 出错不自动静默切换后端。
- Windows 接收程序由 **WSR 编写**，**20180333 安装运行**。只认 Protocol 2 邮件头和附件名；按 `(job_id, part_index, sha256)` 去重，合并时同一个 job 严禁混片；优先最新 `generated_at` 的完整有效 job；逐片与整体 SHA256 后才进行 `git bundle verify`，并采用安全快进或 rebase，不自动 `reset --hard`。

## 6. v0.2.2 验收清单（实时状态）

- [x] `wrangler.toml` 中 `workers_dev = true`
- [x] 固定公开 raw URL、删除 `GITHUB_CONFIG_TOKEN` 依赖、规范验证、300 秒 Cache API
- [x] `part_index=1 → bundle.part.001`、Bundle 与分片 SHA256 校验；`part_total>256` 拒绝
- [x] `/v1/notify` 包含 `too-large` 状态；所有 Protocol 2 邮件头和响应体字段保持一致
- [x] MIME 附件 base64 与关闭边界之间只保留一个 `\r\n`；notify 正文 base64 与 SMTP 终止符之间只保留一个 `\r\n`（本地模拟 SMTP 测试）
- [x] Node 本地模拟测试：401、400 错误 SHA、400 文件名、413 超限、配置无效 503、缓存与 MIME
- [ ] WSR 将 `config/mail-recipients.json` 公开提交至指定 main 分支（截至当前 raw 404）
- [x] Cloudflare 已配置三个 Secrets（名称核实成功）
- [ ] `/health` 在线确认 `mail_configured:true`（不等于发信验证）
- [ ] 真实 QQ SMTP：64 KiB → 256 KiB → 1 MiB → 3 MiB，记录失败/CPU 1102
- [ ] QQ SMTP 连续 5–10 片、真实 Windows IMAP 接收、重复邮件与冲突恢复联调

**API 响应 200/`mail_accepted:true` 表示上游 QQ SMTP 接受邮件，不保证收件成功。** 单次 HTTP 超时可能在邮件已接受后发生，重试会重复投递，必须依靠接收端去重。免费版 10 ms CPU 限额与 QQ IP 及邮件速率限制尚未验证；本版仍属原型，不得用于覆盖生产仓库。
