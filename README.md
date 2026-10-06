---
title: "brain"
category: "知识库管理"
tags: ["知识库", "Obsidian", "项目使用", "服务启动"]
---

保存知识、想法、问题、计划和记录的个人大脑。内容以 Markdown 文件保存，Obsidian 与图谱阅读页面共享同一份正文。

## 使用与启动

- Obsidian：打开本项目的 `content/`，通过搜索、标签和正文链接阅读。
- Agent：在 brain 项目中工作，遵守 [[AGENTS|AGENTS.md]]。直接提出「把刚刚讨论的内容整理进知识库」，即可保存并维护链接。
- 文档阅读页面：`apps/web/` 已提供本地「知识宇宙」，基于原项目场景，以主题星云、文档分支和完整正文作为阅读入口。首次运行 `make install` 安装依赖，再运行 `make` 启动，打开 `http://127.0.0.1:4173`；使用说明见 [[apps/web/README|看板说明]]。已授权的公开版本发布到 [知识星云](https://lllllan02.github.io/brain/)，由 GitHub Pages 自动构建。

## 目录

```text
content/       个人内容：inbox 暂存、notes 正文
apps/web/      图谱看板代码
AGENTS.md      Agent 工作约束
docs/         管理规则的详细展开
```

正式笔记存放在 notes，按入库月份分目录，如 `notes/202610/`，月内文件平铺；更新旧文留在原目录。唯一分类通过 `category` 表达，多标签通过 `tags` 表达，文档类型通过 `type` 表达，已有 `classes` 兼容保留。自己的文档直接保存，外部资料默认引用链接；原文与附件按实际需要保存。看板开发范围见 [[apps/web/README|看板说明]]。
