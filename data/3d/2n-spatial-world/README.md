# 2n Spatial World｜2n 公会 3D 网站

这是 2n Florr 公会的五境 3D 叙事网站。访问者可以沿着镜头旅程经过 Garden、Desert、Ocean、Jungle、Hell，观看场景、花瓣模型、人物和公会故事。

## 本分支是什么

本分支 `copy/2n3d-main-20261007` 是从 [Llhleo/2n-spatial-world](https://github.com/Llhleo/2n-spatial-world) 复制来的独立项目快照，源提交为 `85179de8179f299165d494948d6473e941174713`。文件复制到这里时保留了网站源码、模型和资源、内容数据、测试及有追溯价值的设计记录。

此分支的代码和原仓库发布站点可能随后的开发而不同。原项目地址仅作参考：

- GitHub Pages：<https://llhleo.github.io/2n-spatial-world/>
- Sites 预览：<https://twon-dark-spatial-world.llhleo.chatgpt.site>

## 本地运行

需要安装 Node.js。克隆本仓库后，在本分支项目根目录运行：

```bash
npm install
npm run dev
```

Vite 会在终端显示本地访问地址。检查测试：

```bash
node --test test/*.test.js tests/*.test.js
```

生成生产构建：

```bash
npm run build
```

构建会先生成花瓣摆放数据和模型传输文件，再输出到 `dist/`。依赖目录、构建目录与生成的模型传输文件不提交，规则见 `.gitignore`。

## 目录说明

| 路径 | 内容 |
| --- | --- |
| `src/` | 3D 场景、镜头、加载和叙事运行时代码 |
| `content/` | 人物、公会故事等可维护内容；编辑前阅读该目录的 README |
| `public/assets/` | 网页使用的模型、纹理、字体和其他资源 |
| `scripts/` | 可重跑的场景数据和模型传输构建脚本 |
| `test/`、`tests/` | 自动检查；项目目前将测试分在这两个目录 |
| `studies/` | 模型与视觉研究、资源对照和检查素材 |
| `docs/` | 维护说明、设计记录、发布记录与历史资料 |

## 维护时请留意

- 模型和场景资源由代码引用；删除前先检查引用与构建依赖，不要只因文件名看起来旧就移除。
- 日期命名的设计、发布和审核记录用于追溯当时的选择，不等于当前运行状态。当前分支说明以本文及 `docs/README.md` 为入口。
- 该分支继承的 Pages 工作流仍使用原项目的分支名和 `/2n-spatial-world/` 路径。此分支没有自动部署配置；发布到 `pythonWsr/2n-welcome` 前，需要先单独核对目标仓库的 Pages 路径和工作流。
- 本轮只整理这个分支的文档和过期状态快照，没有合并到 `main`，也没有触发部署。

人物内容编辑规则见 [content/README.md](content/README.md)，文档索引见 [docs/README.md](docs/README.md)，发布配置说明见 [PAGES.md](PAGES.md)。
