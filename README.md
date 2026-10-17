---
title: "视界（Horizon）"
updated_at: "2026-10-18T00:48:16+08:00"
category: "知识库管理"
tags: ["知识库", "Obsidian", "项目使用", "服务启动"]
---

「视界」（Horizon）是面向个人学习的知识库，也保存想法、问题、计划和记录。Agent 负责整理与维护，用户通过 Obsidian 和「视界」阅读、理解和使用；两者共享同一份 Markdown 正文。

项目中文名统一为「视界」，英文名为 `Horizon`，本地根目录使用 `horizon`。星云、星图和黑洞分别描述场景、关系视图与标志，不作为另一套项目名称。

## 使用与启动

- Obsidian：打开本项目的 `content/`，通过搜索、标签和正文链接阅读。
- Agent：在视界（Horizon）项目中工作，遵守 [[AGENTS|AGENTS.md]]。该文件提供通用约束和任务入口，按任务链接到判断细则与操作 Skill。检索与巡检可用只读检索层 `npm --silent --prefix apps/web run retrieve --`（`query`/`links`/`lint`/`index`，需先 `make install`）。直接提出「把刚刚讨论的内容整理进知识库」，即可按「批量检索候选 → 阅读相关正文 → 判断更新或新建 → 写回并验收」处理，已完整覆盖的内容不重复保存；细则见 [[docs/knowledge-management|知识库管理细则]]。
- 文档阅读页面：`apps/web/` 已提供本地「视界」，基于 Galaxy View 三维星空，以文档星点、真实引用和完整正文作为阅读入口。首次运行 `make install` 安装依赖，再运行 `make` 启动稳定阅读模式（首次构建，后续复用未变化的前端缓存），打开 `http://127.0.0.1:4173`；使用说明见 [[apps/web/README|看板说明]]。`content/notes/`、`content/interviews/`、`content/readings/` 与 `content/glossary/` 均参与网页构建。各目录共用待学习、阅读中与已整理三种状态，分别偏雾蓝、灰青与香槟白；目录图标与星芒形态继续区分内容用途。内部链接高亮、预览图标、列表与节点标签同步显示状态；部署后的阅读入口为 [视界](https://lllllan02.github.io/brain/)，由 GitHub Pages 自动构建。

本地根目录可重命名为 `horizon`；先停止开发服务，改名后从新目录重新打开工作区并运行 `make`。启动、内容读取与构建均使用相对项目路径。只改本地目录不会改变 Git remote 或线上地址；当前远程仓库及 Pages 路径仍使用 `brain`。

默认阅读服务不随代码编辑热更新，文档变化自动局部同步，保留当前阅读位置和画布；开发界面可另开 `make dev PORT=4174`。

本地服务默认允许局域网访问，其他设备可打开启动日志中的「局域网访问」地址。使用 `make HOST=127.0.0.1` 可限制为仅本机访问；连接条件与状态写回范围见 [[apps/web/README#启动与使用|启动与使用说明]]。

开发验收可在根目录运行 `make check`（类型与格式）、`make test`（单元、接口与检索回归）、`make test-browser`（浏览器回归）和 `make build`（应用构建）。检索直接执行 `scripts/retrieve.ts`，例如 `npm --silent --prefix apps/web run retrieve -- query 覆盖索引 回表`，也可使用 `make search q="覆盖索引 回表"`。

需要先查资料再成文时，可以直接说「调研整理 X」，或补充「侧重方案对比」「用于入门」「整理成一篇」等要求。[knowledge-save](.agents/skills/knowledge-save/SKILL.md#调研整理) 会串起库内查重、外部资料核对、Reading 导读与知识笔记写回；用途和深度沿用上下文，大专题边界不明确时再确认。

## 目录

```text
content/       个人内容：notes 知识笔记、interviews 面试题、readings 外部导读、glossary 术语解释、sources 原始资料、archive 归档
apps/web/      图谱看板代码
scripts/       Agent 只读检索层（复用看板解析逻辑）
labs/          本地独立实验仓库，不进入知识库正文或 Horizon Git
AGENTS.md      Agent 工作约束与任务入口
docs/          管理判断、格式约定与个人写作和学习习惯
.agents/skills/ 保存、维护、学习与工具使用的按需流程
```

面试题写入 `content/interviews/`，采用 [[docs/writing-style#面试题|标题、一段口述回答与下方原理链接]] 的形式。内容目录的用途、学习／阅读状态及字段约定统一见 [[docs/metadata-and-links|文件名、元数据与链接]]；资料保存与引用见 [[docs/knowledge-management#来源与巡检|来源规则]]。看板开发范围见 [[apps/web/README|看板说明]]，Agent 规则及 Skill 的归属与选用见 [[docs/agent-rules|规则与 Skill 维护]]。

目录收录、名称、图标与基础样式配置在 [collections.config.json](apps/web/collections.config.json)，状态名称、颜色、高亮与星芒修饰配置在 [document-states.config.json](apps/web/document-states.config.json)。修改后重启本地服务或重新构建；配置方式见 [[apps/web/README#目录配置|目录配置]]。`content/glossary/` 保存随查术语解释，不随理解程度迁移，内容仍需核对来源和版本。

## 本地实验仓库

[Agent Trace 实验](labs/agent-trace/README.md)位于 `labs/agent-trace/`，保留独立 `.git`；Horizon 忽略该目录，笔记构建也不收录它。可以在当前工作区直接维护代码，操作前读取该目录的 `AGENTS.md`；实验运行、测试和 Git 命令以实验仓库为工作目录，例如 `git -C labs/agent-trace status`。

实验代码、配置和报告由实验仓库管理，知识结论按需整理回 `content/`。克隆 Horizon 不会自动获得实验仓库，换机器时需单独恢复或克隆至约定目录。本地配置与实验产物仍遵循实验仓库自己的忽略规则。
