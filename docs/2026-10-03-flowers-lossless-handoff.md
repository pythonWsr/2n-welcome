# 高清传输与地图花朵 checkpoint

本轮已实现：高清花瓣专用两路下载队列、共享两路解码、gzip 无损传输、原始字节 SHA-256 校验、浏览器复用缓存与原 GLB 回退。21 个模型原始 44,212,356 字节，压缩后 32,200,266 字节（减少 27.2%）。14 个既有高清花瓣本身减少约 22.8%。这些是传输数据量，不是实机加载时间；未降低几何、贴图或渲染质量。

自动播放默认关闭，完整路程从 180 秒调整为 150 秒。保留按钮半透明、用户接管与暂停行为。

地图原始花朵 GLB 已保存到 public/assets/map-flowers，均已确认 +Z 为表情正面；使用完整 scene，保留眼睛与嘴等所有部件和原材质。Garden 01/07、Desert 02/05、Ocean 03、Jungle 04 各一个；Hell 06 五个，共 11 个。宽度 8–10 世界单位，大于普通地面花瓣；地面接触探针不改变可见几何。近场朝向镜头平滑转动，不加入原回望花瓣动画。

验证：125 项测试通过，生产构建成功；压缩脚本逐个断言解压与原 GLB 字节完全相等。未做 iPhone Safari 实机验收，仍需检查第一次与第二次加载速度、07 贴图、前后滑动的朝向、花朵与地面关系。现有大 bundle 提示仍存在，不属于构建失败。

发布目标：既有 twon-dark-spatial-world Sites，保持 owner-private。GitHub 仅 experiment/lookback-v2；不动 Pages、main 和旧 Llhleo/2n。部署结果另追加记录，不能把 checkpoint 当作已经上线。

## 已完成的发布结果（2026-10-03 18:35 上海时间）

- GitHub 代码和完整原模型 commit：181c0320e0ae162ca2e9d531fd3478a4c47d4e3f。
- Sites 已推送源码 commit：f85a06dafab7bad1d2a4c4ac756f9175da06a286。
- 两端源码树均为 9aadccf81badfaf9ec98cdacdaf18df8800c86ff，原模型 blob SHA 逐个一致。
- 部署 ID：appgdep_6ac0da78cd4c8191a5e4ead23bf95188；原生返回 succeeded。
- 版本 ID：appgprj_6aad813744b08191a16efff74d7ebaf0~appgver_090a6b7b7b548191a7031c3922cb2ec7。
- 地址：https://twon-dark-spatial-world.llhleo.chatgpt.site 。保持原私有权限。
- 77 MiB 部署包 gzip 完整性与目录检查通过，含原始 GLB、21 个生成传输包及生产入口。生产构建成功。
- 未完成：iPhone Safari 首次/复访加载计时、真实材质与镜头下的花朵视觉验收。人物任务按最新指令继续暂停。

用户最新指令（18:33 上海时间）：只继续速度优化和花朵接入，人物暂缓。之后经用户要求才恢复现有人物廊设计：核对原项目五位管理者真实姓名和职责，交付连续过渡、管理层弧形展示、群像入口；完整成员交互与后续周年/影像/结尾仍不在第一轮。不得编造人物数据或把入口称为完整成员章节。
