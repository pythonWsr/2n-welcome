# GitHub Pages 与本分支

本分支包含从源仓库复制过来的 Pages 工作流。它当前仍配置为监听 `main` 和源项目旧分支 `sync/persistent-3d-2026-09-27`，并在 Vite 构建时使用 `/2n-spatial-world/` 路径。

这意味着：

- 向 `copy/2n3d-main-20261007` 提交不会自动运行此工作流。
- 工作流中的预期网址 `https://llhleo.github.io/2n-spatial-world/` 属于源仓库 `Llhleo/2n-spatial-world`，不代表当前分支已经部署。
- 如果要在 `pythonWsr/2n-welcome` 发布，需要先确定实际 Pages 地址，然后同步检查工作流触发分支、Vite base 路径和仓库 Pages 设置。

本轮未调整 Pages 配置或触发部署。
