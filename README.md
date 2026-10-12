---
title: "视界（Horizon）"
updated_at: "2026-10-12"
category: "知识库管理"
tags: ["知识库", "Obsidian", "项目使用", "服务启动"]
---

「视界」（Horizon）是面向个人学习的知识库，也保存想法、问题、计划和记录。Agent 负责整理与维护，用户通过 Obsidian 和「视界」阅读、理解和使用；两者共享同一份 Markdown 正文。

项目中文名统一为「视界」，英文名为 `Horizon`，本地根目录使用 `horizon`。星云、星图和黑洞分别描述场景、关系视图与标志，不作为另一套项目名称。

## 使用与启动

- Obsidian：打开本项目的 `content/`，通过搜索、标签和正文链接阅读。
- Agent：在视界（Horizon）项目中工作，遵守 [[AGENTS|AGENTS.md]]。该文件是操作契约，规定「会话定向 → 检索与查询 → 保存与归属 → 修改与关系维护 → 使用与发布」的完整流程。检索与巡检可用只读检索层 `npm --silent --prefix apps/web run retrieve --`（`query`/`links`/`lint`/`index`，需先 `make install`）。直接提出「把刚刚讨论的内容整理进知识库」，即可按「批量检索候选 → 阅读相关正文 → 判断更新或新建 → 写回并验收」处理，已完整覆盖的内容不重复保存；细则见 [[docs/knowledge-management|知识库管理细则]]。
- 文档阅读页面：`apps/web/` 已提供本地「视界」，基于 Galaxy View 三维星空，以文档星点、真实引用和完整正文作为阅读入口。首次运行 `make install` 安装依赖，再运行 `make` 启动稳定阅读模式（等待前端构建完成），打开 `http://127.0.0.1:4173`；使用说明见 [[apps/web/README|看板说明]]。`content/notes/`、`content/inbox/`、`content/readings/` 与 `content/glossary/` 均参与网页构建，Notes 近核偏香槟白、Inbox 偏雾蓝、Readings 偏灰青且横向星芒稍长，Glossary 近核偏淡紫且星芒呈斜向，四者保留白亮星核，搜索结果标识目录，Inbox 星点稍小、星芒较弱；部署后的阅读入口为 [视界](https://lllllan02.github.io/brain/)，由 GitHub Pages 自动构建。

本地根目录可重命名为 `horizon`；先停止开发服务，改名后从新目录重新打开工作区并运行 `make`。启动、内容读取与构建均使用相对项目路径。只改本地目录不会改变 Git remote 或线上地址；当前远程仓库及 Pages 路径仍使用 `brain`。

默认阅读服务不随代码编辑热更新，文档变化自动局部同步，保留当前阅读位置和画布；开发界面可另开 `make dev PORT=4174`。

开发验收可在根目录运行 `make check`（类型与格式）、`make test`（单元、接口与检索回归）、`make test-browser`（浏览器回归）和 `make build`（应用构建）。检索直接执行 `scripts/retrieve.ts`，例如 `npm --silent --prefix apps/web run retrieve -- query 覆盖索引 回表`，也可使用 `make search q="覆盖索引 回表"`。

## 目录

```text
content/       个人内容：notes 知识笔记、inbox 待学笔记、readings 外部导读、glossary 术语解释、sources 原始资料、archive 归档
apps/web/      图谱看板代码
scripts/       Agent 只读检索层（复用看板解析逻辑）
AGENTS.md      Agent 工作约束与任务入口
docs/          管理判断、格式约定与个人写作和学习习惯
.agents/skills/ 保存、维护、学习与工具使用的按需流程
```

除随查术语解释外，自己的知识笔记中新建及仍在学习的文档直接平铺在 `content/inbox/`；用户确认本篇所需概念已理解后再移入 `content/notes/`，不按月份、主题或类型建立子目录。整理完成不自动触发迁移；更新旧文保持路径稳定。唯一分类通过 `category` 表达，多标签通过 `tags` 表达，文档类型通过 `type` 表达，已有 `classes` 兼容保留。外部资料的摘要与导读平铺在 `content/readings/`，保留来源链接，读完不迁入 notes。`content/sources/` 仅保留无法仅靠链接复现、可能失效或需要格式转换的资料，注明出处并保留原件；不参与网页文章收录。看板开发范围见 [[apps/web/README|看板说明]]。

目录收录、名称、图标、颜色与节点样式统一配置在 [collections.config.json](apps/web/collections.config.json)，修改后重启本地服务或重新构建；配置方式见 [[apps/web/README#目录配置|目录配置]]。`content/glossary/` 保存随查术语解释，不随理解程度迁移，内容仍需核对来源和版本。
