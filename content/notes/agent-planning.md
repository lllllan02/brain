---
learning_status: organized
parent: agent
title: "Agent 的规划与执行模式"
aliases: ["Planning", "任务规划", "Agent 的 Planning 与 Replanning"]
category: "Agent"
tags: ["Agent", "任务规划"]
created_at: "2026-10-09"
updated_at: "2026-10-17T18:57:46+08:00"
reading_suggestions:
  - react-agent
  - plan-and-execute
  - agent-replanning
  - tool-scheduling
learning_status_changed_at: "2026-10-17T18:59:57.185+08:00"
---

**任务规划（Planning）是根据目标拆解任务、安排步骤的能力。** 它帮助 Agent 在多步工作中跟踪整体目标，再根据执行反馈调整安排。

## 三个核心概念

[[react-agent|ReAct（推理与行动交替）]]是一种根据当前信息选择行动、观察结果，再决定下一步的执行模式，适合边探索边推进。

[[plan-and-execute|Plan-and-Execute（先规划再执行）]]是一种先制定整体计划、再逐步完成子目标的执行模式，用来减少多阶段任务中的遗漏。

[[agent-replanning|Replanning（重新规划）]]是根据新证据或要求，调整剩余步骤、顺序或策略的过程，避免继续执行已经失效的安排。

## 怎样配合？

三者可以组合：**「整体先规划，当前步骤用 ReAct 推进，必要时重新规划。」** 一个计划步骤可以包含多轮行动；新反馈出现后，先判断原计划是否仍有效，需要时才调整，达到任务完成条件后结束。

![[assets/agent-planning-overview.png|整体计划选出当前步骤，ReAct 完成逐步决策，Replanning 按需更新剩余安排]]

也可以只用 ReAct 逐步探索，或按既定计划执行，不必每次都启用三者。

## 怎样取舍？

- 下一步依赖新信息：优先逐步探索，避免过早细化未知步骤。
- 有多个阶段或需要跟踪多项要求：采用显式计划，按[[agent-task-decomposition|可验收的成果拆分任务]]。
- 执行中前提发生变化：检查剩余计划，必要时调整；局部参数或答案错误通常只需纠正。

规划和反复检查都会增加调用与等待，应比较完成质量、总耗时和费用。先规划也不会自动带来并行；步骤能否并发取决于依赖关系与[[tool-scheduling|工具执行调度]]。
