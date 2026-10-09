---
title: "Agent 如何按需扩展能力"
category: "Agent"
tags: ["Agent", "工程选型"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**从 [[agent-loop|最小 Agent Loop]] 出发，根据执行遇到的问题选择机制。** 各项能力按需引入，不是必须依次完成的阶段。

- 任务复杂、需要拆解与调整：按需引入[[agent-planning|规划（Planning）与重新规划（Replanning）]]，是否触发规划另由规则或模型决策。
- 历史越来越长、执行进度难以追踪：通过[[agent-context|上下文管理]]组织模型输入，通过[[agent-task-state|任务状态管理]]单独维护目标、计划、进度与关键结果，减少裁剪或压缩造成的信息损失。
- 决策或工具执行失败、操作需要约束：按问题引入[[agent-self-correction|自我纠正（Self-correction）]]、[[agent-retry|重试（Retry）]]、[[agent-guardrails|行为约束（Guardrails）]]或[[agent-human-in-the-loop|人工介入（HITL）]]。
- 需要跨会话信息、外部知识或协作：按需引入[[agent-memory|记忆（Memory）]]、[[rag|检索增强生成（RAG）]]、工具与能力扩展机制，或多 Agent 协作。
- 需要长期运行与持续改进：考虑持久化、中断恢复、并发控制、幂等、[[agent-trace-requirements|执行追踪（Trace）]]和评测（Evaluation）。
