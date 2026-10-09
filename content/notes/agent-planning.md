---
title: "Agent 的 Planning 与 Replanning"
aliases: ["Planning", "Replanning", "任务规划", "重新规划"]
category: "Agent"
tags: ["Agent", "任务规划"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**Planning（任务规划）是根据目标拆解任务、确定执行顺序的能力；Replanning（重新规划）是在执行结果或条件变化后调整原有计划的能力。** 前者提出计划，后者让后续行动适应新信息。

例如，排查性能问题时，可以先计划「查看指标 → 分析慢查询 → 检查索引 → 提出建议」。如果发现数据库指标正常、应用 CPU 异常，就调整后续任务，转向应用层排查。这是规划与调整的假设示例。

具备 Planning 能力，不代表每次任务都会生成显式计划，也不代表自动判断任务复杂度。是否触发规划，需要程序规则或模型决策机制来决定；简单任务可以直接通过 [[agent-loop|Agent Loop]] 逐步执行。

[[plan-and-execute|Plan-and-Execute]] 将规划与执行分成阶段，[[react-agent|ReAct]] 则让推理与行动交替进行。二者都可以包含计划调整，能力与执行模式不能等同。规划与重新规划的工程例子参考 [LangChain Planning Agents](https://www.langchain.com/blog/planning-agents)。
