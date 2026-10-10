# 仓库维护规则

权威入口：README → PROJECT_STATUS → CODEX_HANDOFF → 部署说明。main为正式源，功能在独立分支开发，验证后按用户授权合并。

仅清理已经被main完整包含、且没有开放PR或部署用途的分支；未合并研究分支保留。`perf/free-mirrors-2026-10-07`仍是EdgeOne生产来源，由工作流同步main，不能删除。禁止强制推送、改写历史或删除模型来做清理。

src：运行时；content：已核实人物与历史；public/assets：原始高清资源；scripts：可重现构建；test/tests：回归；studies：视觉研究；docs：发布与历史记录。dist、node_modules、生成传输目录不提交。历史文档不当成当前配置。

2026-10-10整理：更新过期根目录入口和文档索引；原入口全文已归档；用户明确授权合main、Pages发布与无用分支清理。
