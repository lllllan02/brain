---
title: "brain"
category: "知识库管理"
tags: ["知识库", "Obsidian", "项目使用", "服务启动"]
---

保存知识、想法、问题、计划和记录的个人大脑。内容以 Markdown 文件保存，Obsidian 与图谱阅读页面共享同一份正文。

## 使用与启动

- Obsidian：打开本项目的 `content/`，通过搜索、标签和正文链接阅读。
- Agent：在 brain 项目中工作，遵守 [[AGENTS|AGENTS.md]]。直接提出「把刚刚讨论的内容整理进知识库」，即可按「批量检索候选 → 阅读相关正文 → 判断更新或新建 → 写回并验收」处理；已完整覆盖的内容不重复保存。执行方式见 [[docs/knowledge-management#检索与候选阅读|检索与写入细则]]。
- 文档阅读页面：`apps/web/` 已提供本地「星云」，基于 Galaxy View 三维星空，以文档星点、真实引用和完整正文作为阅读入口。首次运行 `make install` 安装依赖，再运行 `make` 启动，打开 `http://127.0.0.1:4173`；使用说明见 [[apps/web/README|看板说明]]。已授权的公开版本发布到 [星云](https://lllllan02.github.io/brain/)，由 GitHub Pages 自动构建。

## 目录

```text
content/       个人内容：notes 正文、inbox 暂存、trash 归档
apps/web/      图谱看板代码
AGENTS.md      Agent 工作约束
docs/         管理规则的详细展开
```

正式笔记直接平铺在 `content/notes/`，不按月份、主题或类型建立子目录；暂存和待处理内容放在 `content/inbox/`，经整理后再移入 notes，更新旧文保持路径稳定。唯一分类通过 `category` 表达，多标签通过 `tags` 表达，文档类型通过 `type` 表达，已有 `classes` 兼容保留。自己的文档直接保存，外部资料默认引用链接；原文与附件按实际需要保存。看板开发范围见 [[apps/web/README|看板说明]]。
