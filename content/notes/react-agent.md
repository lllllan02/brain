---
learning_status: organized
parent: agent-planning
title: "ReAct（推理与行动交替）"
aliases: ["ReAct", "Reasoning and Acting"]
category: "Agent"
tags: ["Agent", "ReAct", "执行模式"]
created_at: "2026-10-09"
updated_at: "2026-10-17T17:48:56+08:00"
reading_suggestions:
  - agent-loop
  - react-paper-summary
  - plan-and-execute
---

**ReAct（Reasoning and Acting）是一种让模型交替进行推理与行动，并根据行动结果决定下一步的执行模式。**

任务需要外部信息时，模型很难仅凭已有知识确定答案或安排全部步骤。ReAct 让模型边获取信息、边调整判断，使后续行动有新的依据。

## 怎样运作？

[[react-paper-summary|ReAct 论文]]将过程组织为「推理（Thought）→ 行动（Action）→ 观察（Observation）→ 再次推理」：模型根据目标和已有证据选择动作，程序执行工具并回传结果，模型再决定继续、换方向或结束。Thought 不要求公开模型的完整内部推理。

![[assets/react-agent-cycle.png|ReAct：行动结果回到推理，改变下一步选择]]

## 适合什么？

**「下一步依赖刚获得的信息」**的任务适合采用 ReAct，例如检索问答、故障排查和交互式操作。步骤已经固定、无需根据结果重新选择时，直接按流程执行通常更简单。

代价是多轮模型与工具调用增加耗时和上下文，也可能围绕错误猜测反复行动；需要明确的停止条件，反馈本身不保证判断正确。

[[agent-loop|Agent Loop]]描述执行与反馈循环，ReAct 强调其中推理与行动的配合；它也可用于[[plan-and-execute|Plan-and-Execute]]的单步执行，不必与整体规划二选一。
