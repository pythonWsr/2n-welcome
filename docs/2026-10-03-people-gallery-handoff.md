# 人物廊第一轮本地接入交接（2026-10-03）

本轮只追加原结尾之后的管理层阅读和群像入口，不是完整成员浏览/交互。面向中文受众，iPhone 13 Pro Max / Safari 优先。同一 renderer、scene、camera；原前段字体、14 个高清展示 GLB、原贴图/传输包未降级或替换。

## 已接入与实际接口

- `src/people-story.js` 是主入口真实依赖：`TOTAL_UNITS=73.2`，旧 `STORY_UNITS=55.2`，新增 `PEOPLE_UNITS=18`。`scrollToStory` / `storyToScroll` 保持旧 28 单位绝对坐标；相同物理滚动距离仍采样相同旧镜头，不把五境挤快。`chapterAt` 导出绝对章节、hero/world/return/people 进度，`sampleStoryPose` 对已有 camera 采样；无资源就绪状态或历史累积。
- 自动播放时长 `150*73.2/55.2 ≈198.913043478` 秒，原每单位速度保持不变，默认关闭；原右下半透明按钮不变。普通手动 wheel/touch/pointer/导航键立即暂停；人物重试按钮的激活不误接管故事，滚轮经过它仍暂停。横竖切换保留归一化滚动进度；倒滑恢复原结尾、旧花瓣围合与地面接管行为。
- `createPeopleGallery(content/people.json)` 接收原始已核对文案。旧核心 `prepareEverything()` 完成模型/文字/GPU 预热后才创建/准备人物；不进入 `allBiomesReady && gpuReady && companionship.ready && flowers.ready` 的原硬门槛。构造异常与字体错误单独捕获，原场景继续渲染；不会等待字体移动镜头。
- gallery 使用 `group`、有限 promise `retry()`（同 `prepare()`）、动态 `ready/error`、`resize(aspect)`、`update(peopleT,camera,dt,reduced)`。近入口只有轻量可访问准备/重试状态；逐帧读取 `ready/error`，晚到字体同步会消除旧失败提示；重试不 seek。
- companionship 调用 `update(returnT,dt,peopleT)`，reduced motion 下 dt=0；gallery 同时收到 dt=0 和 reduced=true。初始减少动态设置可直接到末段，但手动接管后仍可前后滚读，直接采样、不缓动；中途改变偏好不跳到结尾，未接管时减少动态会停在当前镜头。
- 名称/职责/简介最多三层、简介最多两行；重点文字实际字形范围约束 NDC x±.72/y±.70。群像入口是中性实例化节点，只显示附近少量真实姓名，不是头像或成员专属花瓣系统。

## 内容与补充字体复现

编辑路径：`content/people.json`；规则：`content/README.md`。五位管理层 awdc、flowerwsr、CNFlyDream、sschara、20180333 及全部 **95 个真实成员姓名** 独立于镜头；LTJ 等旧站成员未遗漏。来源为只读旧仓库 `Llhleo/2n` 的 `main:dist/index.html`，冻结 commit `cc697d2a00402fd7176a6572169dab97d3f7518a`，blob `6aafb2de59fbe0ee67f6697fd5d295d1eb667d19`；精确 URL 及原始管理层简介保留在 JSON 的 source/provenance。未经核实的旧成绩、等级不作为当前文案。

补充字体 `public/assets/fonts/people-sc-semibold.woff` 为 13,912 字节 **NotoSansCJKsc-Medium.otf**（实际 Medium/500；输出名 semibold 不宣称源字重）的子集。官方源：`https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Medium.otf`。

源 SHA-256：`ca094f6b0001fb048ca39ddd797a0cdb0179e1e55c6561e111c49c3e6a61d7b7`。
WOFF SHA-256：`83ac257bbe4e826b457b26ff9dfa6135b2073fdc83ab89f8b4784baf30dd80ce`。
许可证 `public/assets/fonts/OFL.txt` 原样保留。所有人物 Text 使用 SDF256、gpuAccelerateSDF=false。保留源字形、名称、横排 kern/ligature；不启用可导致 Troika parser 不支持 GPOS type1 format2 的可选纵排/替代 features。不替换前段字体；更新汉字时需重新 subset。

将上述源字体下载到自己的绝对路径并验证源哈希，设置 `PEOPLE_SOURCE_FONT` 为该文件绝对路径，在仓库根执行（需 fontTools 的 pyftsubset）：

```sh
node --input-type=module -e 'import{readFileSync}from"node:fs";import{execFileSync}from"node:child_process";const data=JSON.parse(readFileSync("content/people.json"));const text=data.leaders.flatMap(p=>[p.name,p.role,p.intro]).concat(data.members).join("");const unicodes=[...new Set([...text].map(c=>c.codePointAt(0)))].sort((a,b)=>a-b).map(c=>"U+"+c.toString(16)).join(",");execFileSync("pyftsubset",[process.env.PEOPLE_SOURCE_FONT,"--unicodes="+unicodes,"--flavor=woff","--output-file=public/assets/fonts/people-sc-semibold.woff","--layout-features=kern,liga,clig","--name-IDs=*","--name-legacy","--name-languages=*","--notdef-glyph","--recommended-glyphs"],{stdio:"inherit"});'
```

Task3 的实际字体 parser/typesetter 几何测量已覆盖完整三层 block，不是字符数估计，也不等于浏览器 SDF atlas 或 Safari 验证。本轮 focused 自动测试执行真实章节模块和主入口（只替换 GPU/资源边界），检查旧相机、直接结尾、倒滑、横竖切换、资源错误/晚到恢复、播放速度/结束/暂停以及减少动态的可控阅读。

本轮验证：`node --test tests/people-integration.test.js` 为 **8/8 通过**；`node --test test/*.test.js tests/*.test.js` 为 **153/153 通过**、0 失败；`npm run build` 成功（Vite 66 modules，3.23s）。全套测试中的 `garden petals unavailable Error: offline` 是既有故障恢复 fixture；构建保留既有大 chunk 提示，npm 另报告环境 `http-proxy` 配置警告。烘焙/传输生成步骤没有改动受跟踪资产，`git diff --check` 通过。

## 发布界线与待办

人物版已发布到原有 owner-private Sites（当前 v42）：地址 https://twon-dark-spatial-world.llhleo.chatgpt.site；Sites 源码提交 `537be1fc60418af393cf9511549b91e5dd77fe8a`，部署 `appgdep_6ac0f318e49881919a9cb170b9660bb4`，版本 `appgprj_6aad813744b08191a16efff74d7ebaf0~appgver_8135a9953c1c8191be0bc29a85ecaa91`，状态 succeeded。GitHub `experiment/lookback-v2` 同步 checkpoint 为 `8c4814faa0ec9f28ae8b2fa3b61d4cdbeab4cf89`；本地实施 checkpoint 为 `e7fb96b441724352b45623287fa589274cb8c10e`。

花朵 Pages 已成功上线：https://llhleo.github.io/2n-spatial-world/ ，冻结源码 `496fbddb997930027b97120789b0e7934451515f`，workflow commit `14800e49f05e23fb4397b9216481d4ee17615475`，run `37117517763`。旧环境规则阻塞仅是历史；人物版不覆盖冻结 Pages。不改 main、旧 Llhleo/2n 或 release 分支。

已完成：本地全套测试/构建、GitHub `experiment/lookback-v2` 同步、原 Sites 私有部署及 succeeded 核验；没有修改 main、旧 Llhleo/2n 或冻结 Pages。仍未完成：iPhone 13 Pro Max / Safari 真实文字清晰度、前后滚动、横竖切换、首访/复访加载、帧率/内存实机验收；完整成员浏览/交互以及后续周年/影像/结尾也未实现。
