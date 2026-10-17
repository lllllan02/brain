---
learning_status: organized
parent: agent
title: "Agent 上下文管理"
aliases: ["Context Management"]
category: "Agent"
tags: ["Agent", "上下文管理"]
created_at: "2026-10-09"
updated_at: "2026-10-17T20:37:59+08:00"
reading_suggestions:
  - agent-context-input
  - agent-task-state
  - context-budget
  - context-trimming
  - context-compaction
  - history-storage
  - context-loading
learning_status_changed_at: "2026-10-17T20:48:36.440+08:00"
---

**Agent 上下文管理（Context Management）是在有限窗口内，为每次调用选择、更新和组织[[agent-context-input|模型输入]]的机制。**

历史与工具结果不断增长，管理目标是让模型每轮拿到当前有效的要求、进度和证据，并留下继续交互的空间。

![[assets/agent-context-cooperation.png|上下文管理的整体协作：窗口外材料按用途处理，组成本轮输入，交互记录再写回存储]]

- [[langchain-model-context-summary|分层维护]]：按输入用途保留有效指令，随进度更新[[agent-task-state|任务状态]]，按需要提供[[tool-loading|工具定义]]。
- [[context-budget|按预算取舍]]：为输出留出空间；历史过长时，通过[[context-trimming|裁剪与筛选]]选择原文，或用[[context-compaction|压缩]]提炼摘要，两者可组合。
- [[history-storage|保存原文以便回查]]：本轮省略的历史仍可保留，需要细节时再[[context-loading|按需读取]]。

这些方法共同服务于任务的准确延续：缩减时保留关键约束与证据，补读时也要计入预算。
