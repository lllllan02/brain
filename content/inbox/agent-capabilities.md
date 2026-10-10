---
title: "Agent 学习与能力扩展"
category: "Agent"
tags: ["Agent", "工程选型"]
created_at: "2026-10-09"
updated_at: "2026-10-10T21:10:22+08:00"
---

**Agent 的学习主线是理解决策循环，再按任务需要补充工具、上下文、状态与执行约束。** 各项能力按问题引入，不是每个项目都必须实现的清单。

## 从基本机制开始

先理解[[agent-definition-and-boundaries|Agent 是什么]]，用[[agent-vs-workflow|Agent 与工作流的区别]]判断何时需要自主决策，再看[[agent-loop|最小 Agent Loop]]怎样把模型、执行与反馈串起来。[[agent-harness|Harness]]说明这些运行职责由谁组织，与模型、执行环境有什么区别。

## 工具与行动

[[tool-calling|工具调用与外部交互]]是工具相关内容的统一入口，覆盖接口设计、注册与加载、MCP、调度、结果处理和权限审批。

多步骤任务可引入[[agent-planning|规划与重新规划]]；该入口区分规划能力与 ReAct、Plan-and-Execute 等执行模式。规划决定做哪些步骤，工具调度决定依赖满足后何时执行。

## 上下文、记忆与状态

- [[agent-context|上下文管理]]：决定模型本轮看到什么，组织预算、裁剪、压缩与按需加载。
- [[agent-memory|记忆]]：区分会话内延续和跨会话复用，进入长期记忆的提取、检索与维护专题。
- [[agent-task-state|任务状态]]：维护当前目标、约束、进度和关键结果，避免只依赖历史摘要。
- [[agent-storage|历史与状态存储]]：选择表示格式和存储位置；[[agent-checkpoint-recovery|Checkpoint 与中断恢复]]进一步处理暂停后从哪里、按什么状态继续。

## 约束、反馈与验证

[[agent-guardrails|行为约束]]决定在哪些环节检查和拦截，[[agent-human-in-the-loop|人工介入]]涵盖审批、补充信息和审核；[[agent-sandbox|沙箱]]负责实际执行的访问与资源边界。

失败后区分[[agent-retry|重试原操作]]与[[agent-self-correction|根据反馈修正行动]]，过程由[[agent-trace-requirements|Trace]]记录，供排查与评测使用。通用错误分类和幂等原则由重试专题引用，不局限于 Agent。

需要外部知识时可结合[[rag|RAG]]；多 Agent 协作与通用评测暂列为后续学习方向。
