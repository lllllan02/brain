---
title: "Anthropic：Skill 的分层加载"
category: "Agent"
tags: ["Agent", "按需加载"]
learning_status: pending
created_at: "2026-10-17T20:56:33+08:00"
updated_at: "2026-10-17T20:56:33+08:00"
source: "[Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)"
---

**Anthropic 用渐进式披露组织 Skill：先让 Agent 知道有哪些方法，再随任务读取指令与资源，避免一次占满上下文。** 本文节选其 2025-10-16 文章中 `The anatomy of a skill`、`Skills and the context window` 与 `Skills and code execution`，聚焦分层加载。

## 为什么分层？

专业任务需要操作知识，但复杂 Skill 的说明可能很长，部分内容只适用于特定场景。作者将 Skill 组织成包含指令、脚本和资源的目录，通过三层入口逐步展开：

1. 启动时提供各 Skill 的 `name` 与 `description`，供模型判断何时使用。
2. 任务匹配后，模型读取完整 `SKILL.md`。
3. 指令中引用的附属文件，仅在对应操作需要时读取。

PDF 示例将表单说明放入 `forms.md`，核心文件保留引用。填写表单时再读该文件，其他 PDF 任务无需带入这些细节。

## 执行也不等于全文读取

原文还用 Python 脚本提取 PDF 表单字段：Agent 可以执行脚本取得结果，无须把脚本源码和整份 PDF 都读入窗口。资源可保留在文件系统中，当前任务只读取或执行需要的部分。

这套方式依赖模型识别入口并选择后续文件。作者建议用真实任务观察触发和读取行为，再调整名称、描述与文件拆分；分层本身不保证每次都选对。
