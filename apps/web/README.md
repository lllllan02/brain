---
title: "星云"
updated_at: "2026-10-08"
category: "项目开发"
tags: ["知识库", "图谱", "Markdown", "服务启动", "GitHub-Pages"]
---

「星云」是本地文档阅读页面，首页移植 [Galaxy View](https://github.com/Longwind1984/galaxy-view) 的三维星空渲染、辉光、星云背景和镜头控制。每颗文档星点对应一篇笔记，连线来自真实正文引用；背景星点仅用于装饰，不参与文档计数。正文直接读取 `content/`，不维护第二份内容。页面外壳和阅读面板沿用 [Neural Creator Dashboard](https://github.com/luoluo-121/neural-creator-dashboard) 的适配实现。项目介绍见 [[README|README]]。

## 启动与使用

需要 Node.js 22.12 或以上。在项目根目录执行：

```sh
make install
make
```

首次启动前用 `make install` 安装依赖，之后直接运行 `make` 或 `make run`。打开 `http://127.0.0.1:4173`。服务只监听本机；可用 `make PORT=4174` 更换端口，按 Ctrl+C 停止服务。开发页面与文档接口由同一个本地服务提供。

- 首页与阅读区域共用完整的三维星空背景，打开列表或正文时只调整星云取景位置，背景不随侧栏切割，正文阅读卡片保留不透明的局部底色。首页只保留左上角星云标志与「星云」名称、底部搜索框、右上角分类展开与单个视图轮换按钮。拖动旋转、滚轮缩放；悬停或选中星点时显示标题，点击星点打开阅读侧栏。文档结点使用有最小显示尺寸的菱形星核，与压暗的背景星点区分；当前文档以更大、更亮的主星、四角定位标记和常驻标题突出，打开分类或标签列表时仍保留。
- 点击右上角「分类」，整体星云经过收拢、错峰飞出并带短拖尾、回落成团三个阶段，按 `category` 分成独立星云；再次点击收回。分类之间不显示连线，分类内保留淡淡引用；点击分类可聚焦，点击文档突出同类引用，完整引用仍可在阅读面板查看。未填写 category 时归入「未分类」，分类相同不会自动产生连线。
- 底部搜索支持标题、别名、标签与正文；按 `/` 或 `⌘/Ctrl + K` 聚焦。输入后显示结果，点击或按 Enter 打开文档；按方向下键进入结果，再用 Tab 与 Enter 选择。
- 搜索框右侧的「随机复习」从当前已收录的全部笔记中随机抽取一篇，原地显示可点击的标题，旁边保留随机按钮；点击标题才打开正文并聚焦星点，点击随机按钮只更换标题。有多篇时避开当前篇目，不受搜索词或分类限制。没有笔记时入口禁用，只有一篇时换篇按钮禁用；窄屏保留标题并截断过长文本，悬停可查看完整标题。暂不记录掌握程度、保存进度或安排间隔复习。
- 阅读面板显示文档分类和标签（无分类显示「未分类」，无标签时隐藏标签行），点击分类或标签采用相同的整体视图聚焦方式，不自动进入分类星云，并从当前阅读文档结点的投影位置直接扇出细线，连接到仅含标题的文档列表；默认无边框和底色，悬浮或键盘聚焦时突出。标题错峰展开，切换和收起时淡出回落。连线起点随当前阅读文档和镜头更新，终点跟随列表滚动，只连接当前可见的标题，表示分类或标签归属；少量光点沿线从当前结点流向标题，两端渐隐，抵达标题端点时触发向外扩散并消退的波纹，系统减少动态效果时关闭光点和波纹。列表一次包含全部结果，数量较多时在列表内滚动，无分页。点击列表项切换正文并保留列表和滚动位置，关闭列表恢复当前文档的聚焦；专注阅读时点击属性会回到侧栏。保留正文、代码高亮与复制、表格、目录、出站引用和反向引用；可切换专注阅读。
- 正文内部链接、文档引用和反向引用支持悬浮预览：短暂停留后显示目标标题、分类和可滚动正文，卡片优先放在正文面板左侧并保留间距，左侧空间不足时回退到链接上方或下方；章节或段落块链接直接定位到对应内容；悬停时左侧对应文档星点以双拍心跳发光并显示标题，保留当前阅读文档的选中状态，退出预览后恢复；减少动态效果时改为稳定高亮。鼠标移入卡片可继续阅读，点击标题或「打开文档」跳转，Esc 先关闭预览。键盘聚焦链接也可预览，Tab 可进入卡片；触屏点击保持直接打开。预览复用当前已收录正文，本地与 Pages 收录范围一致。交互参考 [Quartz Popover Previews](https://quartz.jzhao.xyz/features/popover-previews)，样式沿用阅读面板。
- 右上角视图按钮同时显示三个名称，用滑块高亮当前模式，点击按「银河 → 星云 → 深空 → 银河」轮换，默认星云。分类展开保留各节点及连线在整体视图中的配色：分类星云在银河按平面螺旋排列，在星云过渡成有厚度的扁球层，在深空均匀铺成立体球面；每团内部的真实文档节点也从平面旋臂逐步增加纵深；分类模式不使用旋臂或云团贴图，切换时节点、镜头与光效平滑过渡；首次准备新模式时保留现有画面，后续轮换复用已计算的坐标，不重复加载。深空压暗背景星点，并放大文档星点、保留淡淡引用连线。点击左上角标志回到全景；Esc 清空搜索或关闭阅读。首页不再显示暂停、重播和独立的回全景按钮。
- 尊重系统减少动态效果设置，关闭自动环绕、入场和分类爆发动画，分类切换直接显示结果。窄画布按横纵范围取景、分类名称自动避让，并降低像素比、背景密度和关闭辉光；无法创建三维画面时仍可通过搜索阅读。
- 本地模式每 4 秒检查文件变化，页面隐藏时暂停检查和场景渲染。文档地址使用唯一文件名；移入 inbox 的待处理文档不再收录，重新入库并保留文件名后可恢复原地址。

每篇文档只使用一个 `category`，未填写时归入「未分类」；分类按名称排列，不由目录决定。`tags` 参与检索，`type`（兼容 `classes`）表达文档类型。

```yaml
---
title: "RAG 检索评测"
category: "RAG"
tags: ["Agent", "检索", "评测"]
---
```

该文档归入 RAG 分类，标签参与搜索。category 是本项目约定的自定义文本属性，填写一个分类名称；Obsidian 内置属性包括 tags、aliases、cssclasses，其中 cssclasses 用于样式。[官方属性说明](https://obsidian.md/help/properties)

## 三维场景移植

Galaxy View 源码固定到提交 `b49b60cb04687783153f24ff7f9b0a0af59334af`，选取的模块保存在 `src/galaxy/vendor/`，保留原 MIT 许可于 `licenses/galaxy-view-MIT.txt`。

- 复用聚合渲染、背景、着色器、辉光、镜头控制、三维力布局与视觉预设，不加载 Obsidian 插件入口、文件读取和设置面板。
- `src/galaxy/data.js` 从现有阅读图中提取文档与 `wiki` 连线，去除导航用中心和分类节点，转换为节点数组下标。
- `src/galaxy/scene.js` 管理布局、选取、分类聚焦、相机、质量档位和资源释放；`Home.jsx` 连接 React 搜索、路由和阅读侧栏。
- Worker 改用 Vite 的 `?worker` 入口。初始化失败或超时回退主线程逐帧布局；布局就绪后再显示入场动画。初版没有接入原插件的自动漫游、标签 hub 和建议关系。
- 网页适配调整了远景星空跟随相机、云雾范围、选点距离和小图节点尺寸；暂停环境运动时，聚焦高亮仍能更新。保留全部文档，质量档位不截断节点。
- `src/galaxy/nebulaBackdrop.js` 用多尺度三维噪声生成环绕视野的星云天幕，局部呈现冷蓝光晕、暖铜色云尘和暗尘空隙；亮度随云气密度与细碎纹理变化，不加载背景照片。`src/galaxy/nebulaLandmarks.js` 在不同固定方向生成尘埃柱、环状星云和倾斜旋涡星系，作为可随镜头探索的风格化景观，不对应真实天体坐标；三处景观缩小并分散在相距约 120° 的方向，普通云气稀疏分布，局部保留冷蓝和暗红光晕，暖金色只点亮景观边缘。默认收敛星点辉光和引用线，悬停文档星点时突出其真实引用，选中后保持当前文档的引用高亮。天幕只跟随相机的位置，保留世界方向，拖动和自动环绕时能看到不同云气；银河、深空、分类与阅读状态降低背景亮度，让文档星点保持清楚。减少动态效果时仍可手动转动视角。

整体视图按真实引用进行力布局；分类视图只替换显示坐标，把同类文档归入互不重叠的星云空间，保留真实引用数据；分类位置仅由名称排序、视图模式和画布比例决定，按统一间距缩放，引用数量不改变排列。分类模式隐藏所有跨分类线，内部引用淡化。`categoryLayout.js` 计算分组布局与可逆动画，`categoryEffects.js` 绘制短暂的爆发光迹与节点拖尾；动画中连续切换会从当前坐标继续，切换视觉预设与文档更新时保留分类状态。原来的图片星云和扇形分页不参与当前渲染。

## 早期场景与来源

从用户本机的 `~/github/neural-creator-dashboard` Git 仓库克隆独立副本后引入原代码。该仓库 origin 指向目标 GitHub 仓库，克隆时工作目录无未提交改动。基准提交为 `769d690fa1c06d985926d8f16772d15514b718e1`；本次 GitHub HTTPS 直接克隆仍因 HTTP/2 连接错误失败，未核验远端是否存在更晚提交。

- 早期曾适配 `src/neural/Home.jsx`、`NetworkCanvas.jsx`、`neural.css`、`theme.js`、`icons.jsx`，以及原项目的光球视频、封面和头像。当前 `Home.jsx` 已替换为三维入口；旧 Canvas 和素材保留来源记录，不参与首页渲染。
- 替换：`graph.js` 仅使用实际文档、主题归属与真实双链；`main.jsx` 只提供本地阅读导航；`DocumentReader.jsx` 提供 Markdown 正文与引用入口。
- 未引入：示例数据、作品指标、账号快照、创作计划、选题管理、草稿编辑、推测共振关系与本地创作存储。
- 已移除前两版独立绘制的 `app.js`、`cosmos.js` 和 `style.css`。

保留原项目的 `LICENSE`、`NOTICE.md` 和 `licenses/MIT-legacy.txt`。Required Notice: Copyright (c) 2026 luoluo-121 and neural-creator-dashboard contributors。当前许可为 PolyForm Noncommercial 1.0.0，历史 MIT 权利按原说明保留；第三方依赖保留自身许可。

早期星云素材位于 `public/media/nebula.png`，由内置 imagegen 生成；当前三维场景不再使用该图片。保留原始生成提示词：

> Create one production-ready website sprite: a single isolated luminous astronomical nebula, not a planet and not an animal, on a perfectly pure black background (#000000). Square 1024x1024 composition with generous black margins. The nebula occupies the center 70 percent, irregular billowing translucent interstellar gas clouds with fine wispy branching filaments, luminous silver-white pale champagne dust and a dense small star cluster glowing inside. Scientific deep-space telescope aesthetic with artistic high fidelity. Mostly monochrome silver with subtle warm gold highlights so it can be colorized by CSS. Very high contrast on pure black, soft diffuse fading edges dissolving seamlessly into black, exceptionally detailed gaseous volume and tiny sparkling stars, asymmetrical elegant oval cloud formation, no circular disk, no sphere, no jellyfish, no tentacles, no solid geometric surface, no words, no labels, no frames. It will replace a floating jellyfish node sprite in an immersive dark knowledge graph interface, shown at 150-200 pixels.

## 文档与边界

正式笔记按约定直接平铺在 `content/notes/`；读取器兼容递归读取，不收录 inbox、sources、项目配置。notes 为空时，本地看板没有正式文档可展示。title 缺省时显示文件名；别名参与检索，type 优先、兼容 classes；摘要缺省取正文开头，未知日期不补造。

支持 Obsidian 双链的文件名、显示名、显式路径、章节与段落块引用，兼容 Markdown 代码与表格中的链接。文档嵌入显示目标摘要与入口，避免递归复制正文。重复文件名阻止索引生成；歧义、断链和缺失锚点显示提示。列表或表格整块的块引用尚未支持。

文档图片与附件只允许读取 `content/` 内 `assets/` 目录的真实文件，支持 PNG、JPEG、GIF、WebP、PDF、MP3、MP4，拒绝越界与外指符号链接。远程图片不自动加载，SVG 附件尚未支持。正文 HTML 显示为文本，不执行脚本。前端代码与素材在应用目录内单独提供。

`npm --prefix apps/web test` 检查文档渲染、引用与锚点、内容安全、附件边界、文件更新，以及三维图谱适配后的关系真实性、分类聚焦和布局边界。`npm --prefix apps/web run build` 检查前端能否构建，产物不包含文档正文；正文仍须本地接口提供。Pages 版本使用同一读取器导出全部正式笔记及其引用附件。

重命名文档时需另行维护旧地址映射，目前未自动建立重命名历史。文件读取不突破允许目录，文档内容不作为可执行代码。

## GitHub Pages

GitHub Pages 与本地服务共用 `loadLibrary`，文档来源统一为 `content/notes/` 下的全部 Markdown 文档，兼容递归读取。新增、修改或删除 notes 文档会在下次部署时同步，inbox、trash 和 sources 不收录。`content/notes/` 中的内容会随站点公开。

```sh
npm --prefix apps/web run build:pages
npm --prefix apps/web run preview:pages
```

静态产物位于 `apps/web/dist-pages/`，包含与本地一致的正文、属性、搜索数据与引用关系，无需本地文档接口。预览地址为 `http://127.0.0.1:4174`。正文引用的有效附件会一并复制并改写为静态地址，沿用本地的附件目录与格式限制。

推送 `main` 后，`.github/workflows/pages.yml` 自动安装依赖、导出并部署。构建成功后运行测试，测试失败保留日志但不阻断部署；导出或构建失败仍会阻断部署。测试使用独立样例，不依赖知识库中的固定文章或引用数量。仓库 Settings → Pages 的 Source 设为 GitHub Actions。发布地址为 [星云](https://lllllan02.github.io/brain/)。页面只读，文档更新仍直接修改源文件。
