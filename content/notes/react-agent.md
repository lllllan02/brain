---
title: "ReAct（推理与行动交替）"
aliases: ["ReAct", "Reasoning and Acting"]
category: "Agent"
tags: ["Agent", "ReAct", "执行模式"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**ReAct 是让模型交替进行推理与行动、利用行动结果继续推理的模式。** 原论文以推理（Thought）、行动（Action）和观察（Observation）组织任务过程：推理指导动作，外部反馈帮助调整后续判断。

核心流程是：**推理 → 行动 → 观察结果 → 再次推理**。不必先列出完整计划，也可以在过程中形成或修改计划。

[[agent-loop|Agent Loop]] 描述执行与反馈循环，ReAct 进一步强调循环中推理与行动的结合，不能把所有工具调用循环都直接称为 ReAct。它也可作为 [[plan-and-execute|Plan-and-Execute]] 的子任务执行方式，两种模式并不互斥。

机制依据 [ReAct 原论文](https://arxiv.org/abs/2210.03629)。
