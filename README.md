---
title: "brain"
updated_at: "2026-10-09"
category: "知识库管理"
tags: ["知识库", "Obsidian", "项目使用", "服务启动"]
---

面向个人学习的知识库，也保存想法、问题、计划和记录。Agent 负责整理与维护，用户通过 Obsidian 和「视界」阅读、理解和使用；两者共享同一份 Markdown 正文。

## 使用与启动

- Obsidian：打开本项目的 `content/`，通过搜索、标签和正文链接阅读。
- Agent：在 brain 项目中工作，遵守 [[AGENTS|AGENTS.md]]。该文件是操作契约，规定「会话定向 → 检索与查询 → 保存与归属 → 修改与关系维护 → 使用与发布」的完整流程。检索与巡检可用只读检索层 `node scripts/retrieve.mjs`（`query`/`links`/`lint`/`index`，需先 `make install`）。直接提出「把刚刚讨论的内容整理进知识库」，即可按「批量检索候选 → 阅读相关正文 → 判断更新或新建 → 写回并验收」处理，已完整覆盖的内容不重复保存；细则见 [[docs/knowledge-management|知识库管理细则]]。
- 文档阅读页面：`apps/web/` 已提供本地「视界」，基于 Galaxy View 三维星空，以文档星点、真实引用和完整正文作为阅读入口。首次运行 `make install` 安装依赖，再运行 `make` 启动，打开 `http://127.0.0.1:4173`；使用说明见 [[apps/web/README|看板说明]]。`content/notes/` 与 `content/inbox/` 均参与网页构建，两者沿用原有星点样式，Inbox 星点稍小、星芒较弱；部署后的阅读入口为 [视界](https://lllllan02.github.io/brain/)，由 GitHub Pages 自动构建。

## 目录

```text
content/       个人内容：notes 正文、inbox 暂存、trash 归档
apps/web/      图谱看板代码
scripts/       Agent 只读检索层（复用看板解析逻辑）
AGENTS.md      Agent 工作约束
docs/         管理规则的详细展开
```

新建及仍在学习的文档直接平铺在 `content/inbox/`；用户确认本篇所需概念已理解后再移入 `content/notes/`，不按月份、主题或类型建立子目录。整理完成不自动触发迁移；更新旧文保持路径稳定。唯一分类通过 `category` 表达，多标签通过 `tags` 表达，文档类型通过 `type` 表达，已有 `classes` 兼容保留。自己的文档直接保存，外部资料默认引用链接；原文与附件按实际需要保存。看板开发范围见 [[apps/web/README|看板说明]]。
