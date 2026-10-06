---
title: "brain 知识星云"
category: "项目开发"
tags: ["知识库", "图谱", "Markdown", "服务启动", "GitHub-Pages"]
---

基于 [Neural Creator Dashboard](https://github.com/luoluo-121/neural-creator-dashboard) 裁剪的本地文档阅读页面。保留原项目中央光球、入场粒子、弹簧过渡、往返流光、主题列队与扇形展开；水母素材替换为星云，右侧分析面板替换为文档正文。正文直接读取 `content/` 文件，不维护第二份内容。项目介绍见 [[README|README]]。

## 启动与使用

需要 Node.js 22.12 或以上。在项目根目录执行：

```sh
make install
make
```

首次启动前用 `make install` 安装依赖，之后直接运行 `make` 或 `make run`。打开 `http://127.0.0.1:4173`。服务只监听本机；可用 `make PORT=4174` 更换端口，按 Ctrl+C 停止服务。开发页面与文档接口由同一个本地服务提供。

- 首页默认把所有文档汇聚为一个知识星云；点击「展开分类」或中央星云，各 category 星云从中心依次散开，点击「汇聚星云」回流合并。分类按钮在手机上也可使用。
- 点击分类星云，光球缩到左侧、星云列队、文档分支逐条展开；每组最多 12 篇，可分页。总览优先展示。
- 点击文档，打开原场景中的右侧阅读面板；支持正文、代码高亮与复制、表格、目录、出站引用和反向引用。面板右上角可切换专注阅读。
- 底部搜索标题、别名、标签与正文；按 `/` 或 `⌘/Ctrl + K` 聚焦搜索。顶部「文档」提供完整列表。
- 「暂停」控制场景运动，「重播」回到入场动画；Esc、面包屑与返回按钮逐层返回。尊重系统的减少动态效果设置。
- 每 4 秒检查文件变化，同步正文、搜索与真实引用，页面隐藏时暂停检查。文档地址使用唯一文件名，月份目录变化不改变地址。

展开后的分类星云按文档 YAML 元数据中的单值 `category` 动态生成，名称与数量随分类变化，每篇文档只进入一个分类。未填写或留空时归入「未分类」。分类按名称排列，文件名与目录不决定归属；`tags` 保留为多标签检索，`type`（兼容 `classes`）表达文档类型，总览优先显示。

```yaml
---
title: "RAG 检索评测"
category: "RAG"
tags: ["Agent", "检索", "评测"]
---
```

该文档进入 RAG 星云，标签参与搜索。category 是本项目约定的自定义文本属性，填写一个分类名称；Obsidian 内置属性包括 tags、aliases、cssclasses，其中 cssclasses 用于样式。[官方属性说明](https://obsidian.md/help/properties)

## 裁剪与来源

从用户本机的 `~/github/neural-creator-dashboard` Git 仓库克隆独立副本后引入原代码。该仓库 origin 指向目标 GitHub 仓库，克隆时工作目录无未提交改动。基准提交为 `769d690fa1c06d985926d8f16772d15514b718e1`；本次 GitHub HTTPS 直接克隆仍因 HTTP/2 连接错误失败，未核验远端是否存在更晚提交。

- 保留并适配：`src/neural/Home.jsx`、`NetworkCanvas.jsx`、`neural.css`、`theme.js`、`icons.jsx`，原项目的光球视频、封面和头像。
- 替换：`graph.js` 仅使用实际文档、主题归属与真实双链；`main.jsx` 只提供本地阅读导航；`DocumentReader.jsx` 提供 Markdown 正文与引用入口。
- 未引入：示例数据、作品指标、账号快照、创作计划、选题管理、草稿编辑、推测共振关系与本地创作存储。
- 已移除前两版独立绘制的 `app.js`、`cosmos.js` 和 `style.css`。

保留原项目的 `LICENSE`、`NOTICE.md` 和 `licenses/MIT-legacy.txt`。Required Notice: Copyright (c) 2026 luoluo-121 and neural-creator-dashboard contributors。当前许可为 PolyForm Noncommercial 1.0.0，历史 MIT 权利按原说明保留；第三方依赖保留自身许可。

星云素材位于 `public/media/nebula.png`，由内置 imagegen 生成，再复制到本项目。画面经过原模块的色彩滤镜与轻微云气运动，未使用水母视频。生成提示词为：

> Create one production-ready website sprite: a single isolated luminous astronomical nebula, not a planet and not an animal, on a perfectly pure black background (#000000). Square 1024x1024 composition with generous black margins. The nebula occupies the center 70 percent, irregular billowing translucent interstellar gas clouds with fine wispy branching filaments, luminous silver-white pale champagne dust and a dense small star cluster glowing inside. Scientific deep-space telescope aesthetic with artistic high fidelity. Mostly monochrome silver with subtle warm gold highlights so it can be colorized by CSS. Very high contrast on pure black, soft diffuse fading edges dissolving seamlessly into black, exceptionally detailed gaseous volume and tiny sparkling stars, asymmetrical elegant oval cloud formation, no circular disk, no sphere, no jellyfish, no tentacles, no solid geometric surface, no words, no labels, no frames. It will replace a floating jellyfish node sprite in an immersive dark knowledge graph interface, shown at 150-200 pixels.

## 文档与边界

递归读取 `content/notes/`，不收录 inbox、sources、项目配置。title 缺省时显示文件名；别名参与检索，type 优先、兼容 classes；摘要缺省取正文开头，未知日期不补造。

支持 Obsidian 双链的文件名、显示名、显式路径、章节与段落块引用，兼容 Markdown 代码与表格中的链接。文档嵌入显示目标摘要与入口，避免递归复制正文。重复文件名阻止索引生成；歧义、断链和缺失锚点显示提示。列表或表格整块的块引用尚未支持。

文档图片与附件只允许读取 `content/` 内 `assets/` 目录的真实文件，支持 PNG、JPEG、GIF、WebP、PDF、MP3、MP4，拒绝越界与外指符号链接。远程图片不自动加载，SVG 附件尚未支持。正文 HTML 显示为文本，不执行脚本。前端代码与素材在应用目录内单独提供。

`npm --prefix apps/web test` 检查文档渲染、引用与锚点、内容安全、附件边界、文件更新，以及原场景适配后的关系真实性。`npm --prefix apps/web run build` 检查前端能否构建，产物不包含文档正文；正文仍须本地接口提供。公开版本按下述清单单独导出，在渲染、搜索、关系和附件生成之前过滤。

重命名文档时需另行维护旧地址映射，目前未自动建立重命名历史。文件读取不突破允许目录，文档内容不作为可执行代码。

## GitHub Pages

用户已授权公开清单中的笔记。移除 5 篇导航文档后，获准的 56 个文件逐项记录于 `pages-public.json`；新增文档不会自动加入公开版本，附件清单当前为空。

```sh
npm --prefix apps/web run build:pages
npm --prefix apps/web run preview:pages
```

静态产物位于 `apps/web/dist-pages/`，包含获准正文、搜索索引与引用关系，无需本地文档接口。预览地址为 `http://127.0.0.1:4174`。未公开目标在导出前移除，未获准附件不复制。

推送 `main` 后，`.github/workflows/pages.yml` 自动安装依赖、运行测试、导出并部署。仓库 Settings → Pages 的 Source 设为 GitHub Actions。发布地址为 [知识星云](https://lllllan02.github.io/brain/)。页面只读，文档更新仍直接修改源文件。
