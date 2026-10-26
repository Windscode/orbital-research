# 轨研 ORBITAL

个人航天仿真研究网站。整理建模方法、工程工具、公开任务资料，并记录 AerospaceSimUE 项目的架构、实现与验证范围。

- 网站：https://windscode.github.io/orbital-research/
- 仓库：https://github.com/Windscode/orbital-research
- 当前版本：8.0.0 · 2026-10-26

![ISS 构型与资料工作台](docs/screenshots/v8-iss-model.jpg)

## 内容与功能

| 模块 | 当前内容 |
| --- | --- |
| 知识库 | 53 篇笔记，53 个图谱节点、190 条关系、12 条学习路线 |
| 工具与数据 | 84 项开源、源码可见、商业、受限软件及数据资源；输入输出、使用条件、公开应用案例、工具对比 |
| 研究情报 | 27 条来源摘要与技术分析，分别标注来源发布日期、事件日期和核查日期 |
| 飞行器档案 | 56 型历史与现代任务选编，公开参数、系统说明、参数推断与不确定性 |
| 三维结构 | 56 个 GLB、56 幅几何预览、56 份构型记录；178 项结构特征关联部件与来源；五个观察方向、正交投影、三向剖切、部件隐藏、隔离、拆分与视图导出 |
| 影像图鉴 | 38 幅图：22 幅实拍/观测、2 幅官方示意、12 幅技术图解、2 幅生成概念图 |
| 个人项目 | 6 个架构层、7 个流程步骤、9 个技术专题、5 个场景、24 条源码证据、4 组验证记录 |
| 数值实验 | Euler / RK4 / Verlet，3 种初始轨道，步长收敛、误差曲线、计算成本与 JSON / CSV 导出 |
| 研究方案 | 5 组实施方案、20 项人工检查步骤；关联知识、工具与任务档案 |
| 阅读工作台 | 全站搜索、深链接、章节目录、字号切换、书签、笔记、已读状态与本地备份恢复 |

首页使用真实任务影像。阅读页面采用浅色背景，图谱、轨道与三维工作区采用深色背景。页面适配手机、平板和桌面；内容目录、数值实验、项目深度页与 Three.js 按需加载。

本轮重点是构型研究：44 型采用重新编写的专属几何，12 型保留已有专属几何并更新共用细节、材质和观察功能。档案卡片可在实际模型投影与任务照片之间切换。构型资料区列出选用的年份/任务状态、文献特征与未知项，可以定位到对应部件。新增笔记涵盖公开影像重建、质量与惯量、网格检查，配套 NASA 3D Resources、MeshLab、ParaView、OCCT 和 CGAL 条目。

## 本地运行

需要 Node.js 22 和 npm。

~~~bash
npm ci
npm run dev
~~~

访问 http://127.0.0.1:5173/ 。Windows 可运行 Start-Orbital.cmd；按 Ctrl+C 停止服务。

~~~bash
npm test
npm run build
npm run check:bundle
npm run preview
~~~

构建产物位于 dist/；预览地址 http://127.0.0.1:4173/ 。Vite 使用相对 base，静态图片、字体、延迟模块、Worker 和 GLB 均支持 GitHub Pages 的项目子目录。页面路由使用 hash，无需服务器重写。

## 部署

main 分支每次推送后，GitHub Actions 依次安装锁定依赖、运行检查、构建、检查入口体积，并发布 dist/ 到 GitHub Pages。工作流位于 .github/workflows/pages.yml，Pages 来源设为 GitHub Actions。需要重新运行时，可使用 Actions 的手动触发入口。

Pages 只部署静态网站，没有服务器、账户或数据库。书签与研究笔记保存在当前浏览器；本地开发站与公开站属于不同来源，迁移记录时使用知识库中的导出与恢复功能。

## 数据与源码组织

- src/：React / TypeScript 界面、Three.js 几何、阅读状态、搜索与数值计算。
- research/learning.json、knowledge-graph.json：知识内容与依赖图谱。
- research/library.json：工具与数据选型条目。
- research/vehicles.json、briefings.json：任务档案与研究情报。
- research/model-research-v8.json：56 型构型核对、结构特征与近似范围；其来源分组记录同时保留。
- research/project-deep-dive.json：AerospaceSimUE 深度审查及相对路径证据索引。
- research/project-deep-dive-sources.json：源码读取范围及证据等级。
- research/media-*.json：逐图说明、来源、署名与使用条件。
- research/*review*.json、source-availability*.json：不同轮次的核查记录；较早记录是历史快照。
- public/images/、public/fonts/、public/models/：离线资源、字体许可、GLB、模型来源 JSON 与 WebP 预览。
- scripts/：内容契约、图谱、数值、模型、导航、恢复和构建体积检查。

更改目录数据后，dev、test 和 build 的前置步骤会自动更新首页子集。更改模型或部件资料后运行：

~~~bash
npm run models:export
npm test
~~~

## 资料与验证范围

资料以官方文档、机构档案、论文与项目仓库为主要来源。核查日不代表所有链接当前仍可访问；内容变更应保留构型、版本、日期和证据来源。

三维模型是外部构型与功能级内部结构示意，不能当作实测 CAD、制造图纸或完整质量账本。例如 ISS 选用 2011 年主要总装构型，Galileo 表达高增益天线未能正常展开的状态，SLIM 表达设计着陆姿态。没有混用这些任务的后续状态。导出的 GLB 坐标经过展示归一化，不代表实物米制尺寸；剖切开口不生成实体封盖，不能直接进行质量或有限元计算。逐型说明见构型记录。

AerospaceSimUE 页来自只读源码和历史记录审查。本次没有构建或运行 UE 仿真；记录明确区分源码已实现、已读测试代码、历史验证和后续研究。本站不分发 UE 项目的源代码与大型资产。路径仅用于相对 UE5 工作区定位证据，不是可访问的源码链接。

浏览器实验使用点质量二体引力与有限精度开普勒参考解。没有 J₂、阻力、第三体、推力或任务级误差预算。测试验证结构、接口、有限几何、误差行为和状态恢复，不能替代独立科学审查或真实任务验证。

## 资源使用条件

第三方照片、任务图、字体和依赖分别适用原作者的许可，见 [资源署名与使用条件](THIRD_PARTY_NOTICES.md) 及对应清单。公开仓库不自动赋予第三方内容额外使用权。

本仓库暂未为原创代码指定统一开源许可证。尤其 ESA 的 Euclid 图像适用 ESA Standard Licence，不能视为公有领域或由代码许可证覆盖。
