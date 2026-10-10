---
parent: agent-planning
title: "Plan-and-Execute（先规划再执行）"
aliases: ["Plan and Execute", "Plan-and-Execute"]
category: "Agent"
tags: ["Agent", "任务规划", "执行模式"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**Plan-and-Execute 是先生成任务计划，再逐步执行计划的组织模式。** Planner 确定要完成哪些步骤，Executor 决定每一步具体如何完成。

核心流程是：**用户目标 → 制定计划 → 执行各步骤 → 汇总结果**。单个步骤可以由 [[react-agent|ReAct]] 执行；发现原计划不适用时，也可以加入重新规划机制。

[[agent-planning|Planning]] 是制定计划的能力，Plan-and-Execute 则规定一次执行先经过规划阶段。若系统固定采用这个模式，简单任务也可能先规划，只是计划更短；要跳过规划，需要另设路由或触发规则。

这种模式适合需要整体拆解的多步骤任务，但规划会增加开销，计划也可能出错。它本身不保证成功，也不自动包含 Replanning。[模式说明](https://www.langchain.com/blog/plan-and-execute-agents)、[含重新规划的实现](https://www.langchain.com/blog/planning-agents)
