---
title: "Agent"
category: "Agent"
tags: ["Agent", "工程选型"]
created_at: "2026-10-09"
updated_at: "2026-10-11T11:37:46+08:00"
---

**LLM Agent（智能体）是以大模型为决策核心，在给定目标与约束下自主选择动作，并根据执行结果持续调整行动的系统。**

当任务步骤难以预先确定时，Agent 根据执行反馈动态决定下一步。

它通过「模型决策 → 程序执行工具 → 结果回传 → 模型再次决策」循环推进任务。

![[assets/agent-cycle.png|Agent：模型决策、工具执行与结果反馈]]

「自主」仍受工具权限、执行次数和终止条件约束。模型决定结束，或程序因达到限制而停止，都不等于任务已经成功；结果仍需验证。

## 从循环到完整运行

需要动态决策的任务，可以从[[agent-loop|最小 Agent Loop]]开始；固定步骤则可采用[[agent-vs-workflow|工作流]]。循环跑起来后，再按实际问题补充能力。

窗口有限，需要[[agent-context|上下文管理]]；压缩后仍要保留目标与进度，需要[[agent-task-state|任务状态]]。复用过去经验靠[[agent-memory|记忆]]，补充外部知识可用 [[rag|RAG]]。

工具增多，需要完善[[tool-calling|工具接入与调度]]；步骤复杂，需要[[agent-planning|规划与调整]]；任务跨越多次运行，则需要[[agent-storage|保存历史与状态]]及[[agent-checkpoint-recovery|中断恢复]]。

执行失败时，区分[[agent-retry|重试]]与[[agent-self-correction|修正行动]]，通过 [[agent-trace-requirements|Trace]]追查过程；控制执行风险则涉及[[agent-guardrails|行为约束]]、[[agent-sandbox|沙箱隔离]]与[[agent-human-in-the-loop|人工介入]]。

组织这些运行职责的系统就是 [[agent-harness|Agent Harness]]，按需从最小循环逐步完善。多 Agent 协作与通用评测暂留待后续展开。
