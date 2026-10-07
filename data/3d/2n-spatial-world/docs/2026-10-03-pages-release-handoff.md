# 当前花朵版 Pages 发布：保护规则阻塞

用户于 2026-10-03 18:44（上海时间）明确要求：人物之前把当前花朵版设为 GitHub Pages，人物介绍独立成便于编辑的文件。

已保留当前原 Sites 和原始资产。独立发布分支 release/pages-flowers-2026-10-03 基于 496fbddb997930027b97120789b0e7934451515f；发布流程 commit 14800e49f05e23fb4397b9216481d4ee17615475。流程明确 checkout 固定源码，不包含未来人物开发。main 与旧 Llhleo/2n 没有改动。

本地 Pages base 构建成功、125 项测试通过；远端 Actions run 37117517763 的 build 也 success，deploy failure。远端明确原因：Branch "release/pages-flowers-2026-10-03" is not allowed to deploy to github-pages due to environment protection rules.

运行链接：https://github.com/Llhleo/2n-spatial-world/actions/runs/37117517763

这是保护规则，不是编译或上传慢。已停止发布，不能擅自关闭保护、换名环境绕过保护、改写 main、合并 PR 或借其他分支绕过。下一步请求用户授权只将此固定发布分支加入 github-pages 的部署允许列表；GitHub 插件无此操作，需要批准浏览器设置回退，或由用户自己设置。完成后重试同一次失败部署并核实成功与正式 URL，避免重新制作网站。

人物设计已获确认；实现计划 docs/superpowers/plans/2026-10-03-people-gallery.md 已保存，尚待计划审阅与执行方式选择。文案计划 content/people.json + content/README.md。尚未创建人物产品代码，不把计划称为人物已上线。

## 2026-10-03 18:55（上海时间）：阻塞已解决

用户确认允许指定发布分支，并确认人物计划及代理执行。已通过 GitHub 设置只新增 release/pages-flowers-2026-10-03 精确分支规则，保留 Selected branches and tags 与原 main 规则，不关闭保护，不改其他设置。重试 run 37117517763 后 build / deploy 均 success；Pages 设置明确显示该运行已发布。正式地址 https://llhleo.github.io/2n-spatial-world/ 已打开核对，固定花朵版源码仍是 496fbddb997930027b97120789b0e7934451515f。之后的人物修改不自动覆盖此快照。
