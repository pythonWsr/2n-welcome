# data/3d —— 3D 网站集成本地说明

本目录把 [Llhleo/2n-spatial-world](https://github.com/Llhleo/2n-spatial-world) 的
3D 网站集成到 `pythonWsr/2n-welcome` 主站，作为「3D首页」栏目。

本文件是**本地维护说明**，不属于上游项目，也不会被同步脚本覆盖。

## 目录结构

```
data/3d/
├── README.md                    ← 本文件
├── index.html                   ← 栏目入口，iframe 外壳
├── sync-from-copy.mjs           ← 从 copy 分支同步源码的脚本
├── sync-from-copy-utf-8.bat     ← Windows 入口（UTF-8），含 Termux→GBK 转换
└── 2n-spatial-world/            ← 3D 项目本体，来自上游
    ├── src/
    ├── public/
    ├── content/
    ├── scripts/
    ├── studies/
    ├── test/  tests/
    ├── docs/
    ├── vite.config.js
    ├── package.json
    └── dist/                    ← 构建产物，由 GitHub Actions 生成后提交
```

## 项目来源

- 上游仓库：<https://github.com/Llhleo/2n-spatial-world>
- 上游线上地址：<https://llhleo.github.io/2n-spatial-world/>
- 复制分支：`origin/copy/2n3d-main-20261007`
- 同步脚本默认从该分支拉取源码

## 本仓库对上游项目的本地修改

以下改动**有意偏离上游**，同步脚本会保留本地版本：

| 文件 | 修改 | 原因 |
|---|---|---|
| `2n-spatial-world/vite.config.js` | 加 `base: './'` | 让构建产物在任意子路径下可用（上游用 `/2n-spatial-world/` 绝对路径） |
| `2n-spatial-world/.gitignore` | **删除** | 忽略规则已整合到仓库根 `.gitignore` 的 `3d-auto-sync` 区块 |
| `2n-spatial-world/.github/workflows/pages.yml` | **删除** | 该工作流仅对源仓库生效，本仓库用根目录 `.github/workflows/build-3d.yml` 取代 |
| 其他 | 见下方「仓库级新增」 | 均为集成相关，不属于 3D 项目本身 |

## 仓库级新增（不在 3D 目录内）

| 路径 | 作用 |
|---|---|
| `data/3d/index.html` | 栏目 iframe 外壳，指向 `2n-spatial-world/dist/index.html` |
| `data/tabs.json` | 主站栏目配置，插入 `3d` 栏目位于 `home` 与 `announcements` 之间 |
| `.github/workflows/build-3d.yml` | 3D 项目构建 + 提交 `dist/` 的 Actions 工作流 |
| `NOTICE` | 声明 3D 项目来源及本地修改 |
| `.gitignore` | 加入 `3d-auto-sync` 区块，由同步脚本维护 |

## 与上游文档的差异说明

上游 `README.md` 与 `docs/REPOSITORY_GUIDE.md` 写着：

> `node_modules/`、`dist/`、生成的模型传输文件不提交。

**本仓库的实际情况不同**：

- `node_modules/` —— 依然不提交（由 `npm install` 生成）
- `public/assets/model-transport/` —— 依然不提交（构建过程生成）
- **`dist/` —— 提交**。因为 `pythonWsr/2n-welcome` 走 GitHub Pages 静态部署，
  主站 iframe 需要读取 `2n-spatial-world/dist/index.html`。构建由
  `.github/workflows/build-3d.yml` 在推送后自动完成，产物再提交回仓库。

读取上游文档时请注意这一差异。本文件为准。

## 同步机制

`sync-from-copy.mjs` 用于在 `origin/copy/*` 分支有更新时，把新源码同步到
`main` 的 `data/3d/2n-spatial-world/`。

### 使用

```bash
# 预览
node data/3d/sync-from-copy.mjs --dry-run

# 实跑
node data/3d/sync-from-copy.mjs

# 指定分支（多个 origin/copy/* 时）
node data/3d/sync-from-copy.mjs --branch=origin/copy/xxx
```

Windows 下双击 `sync-from-copy-utf-8.bat`，或在 Termux 中先生成 GBK 版本：

```bash
cd data/3d
bash sync-from-copy-utf-8.bat --shift   # 生成 sync-from-copy-gbk.bat
```

### 处理规则

| 场景 | 行为 |
|---|---|
| 本地未改过，上游有更新 | 直接覆盖 |
| 本地改过（如 `vite.config.js`） | 保留本地；上游版本存到 `.local/3d-sync/<path>.upstream`；尝试自动应用已知补丁 |
| 本地已删（如 `.gitignore`、`pages.yml`） | 不还原 |
| 上游新增文件 | 直接落地 |
| 上游已删、本地还在 | 移到 `.history/<时间戳>/` |
| `SYNC_EXCLUDES` 中的路径 | 完全跳过（依赖、构建产物等） |

### 自动补丁

| 文件 | 补丁 |
|---|---|
| `vite.config.js` | 若无 `base:` 字段，插入 `base: './',` |

## 构建与部署

- **构建**：`.github/workflows/build-3d.yml` 在 `main` 分支的
  `data/3d/2n-spatial-world/**` 有推送时触发
- **流程**：`npm install` → 测试 → `npm run build` → 提交 `dist/` 回仓库
- **部署**：主站 GitHub Pages 部署后，`data/3d/index.html` iframe
  即可加载 `dist/index.html`

首次部署前需确认仓库设置：

**Settings → Actions → General → Workflow permissions** 选 **Read and write permissions**

否则 Actions 无法推回 `dist/`。

## 本地命令（3D 项目）

```bash
cd data/3d/2n-spatial-world
npm install
npm run dev        # 本地预览
npm run build      # 生产构建，输出到 dist/
```

## 目录说明（3D 项目内部）

参见 3D 项目自带的 `README.md`、`docs/README.md`。其中关于 `dist/` 的说明以本
文件为准。
