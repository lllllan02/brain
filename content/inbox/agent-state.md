---
title: "Agent 状态管理"
aliases: ["State Management", "Agent State"]
category: "Agent"
tags: ["Agent", "状态管理"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**Agent 状态管理是由 Runtime 维护会话、任务与执行数据的机制。** 它记录「执行到了哪里」，[[agent-context|上下文管理]]则决定「模型本轮需要看到什么」；两者可以共用数据与存储。

## 为什么需要管理状态？

程序需要明确记录进度、结果与审批状态，才能调度下一步、重试或恢复执行。仅靠模型从对话中推断不足以作为执行依据；跨进程恢复还需要持久化。[持久化与恢复](https://docs.langchain.com/oss/python/langgraph/persistence)

## 管理哪些状态？

可按业务职责分为三层，不要求拆成独立组件：

- **会话状态**：会话 ID、用户与任务关联。
- **任务状态**：目标、[[agent-planning|计划]]、进度与产物。
- **运行状态**：迭代次数、工具执行、审批、重试与错误。

## 怎么维护，什么时候更新？

Runtime 用结构化字段记录状态，在任务创建、计划调整、工具成功或失败、审批变化及任务终止时更新。模型可以提出变更，程序依据实际执行结果校验后写入。

需要恢复的关键节点保存快照，恢复前读取记录；具体方式见 [[agent-checkpoint-recovery|Checkpoint 与中断恢复]]。

