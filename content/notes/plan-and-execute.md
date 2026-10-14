---
learning_status: understood
parent: agent-planning
title: "Plan-and-Execute（先规划再执行）"
aliases: ["Plan and Execute", "Plan-and-Execute"]
category: "Agent"
tags: ["Agent", "任务规划", "执行模式"]
created_at: "2026-10-09"
updated_at: "2026-10-12T00:50:05+08:00"
reading_suggestions:
  - react-agent
  - agent-replanning
  - langchain-planning-summary
---

**Plan-and-Execute 是先生成任务计划，再逐步执行计划的组织模式。** 它将整体任务拆解与单步执行分开，让执行某一步时仍有明确的整体目标和后续安排。

## 规划与执行怎样分工？

核心流程是：**用户目标 → 制定计划 → 执行各步骤 → 汇总结果**。

Planner（规划器）和 Executor（执行器）是程序中分别负责规划与执行的模块：前者根据目标生成步骤，后者接收当前步骤及必要上下文，通过工具完成它。两者可以使用同一个模型，也可以分别配置模型。

单个步骤可以由 [[react-agent|ReAct]] 循环执行，内部包含多次工具调用。

这种模式默认先规划再执行；若希望简单任务跳过规划，需要另外设置判断或路由规则。

例如，性能排查计划中的「分析慢查询」是一个子目标，执行器还需具体决定查询哪些日志、怎样筛选以及结果是否足够。计划中写了一步，不代表执行时只有一次调用。

![[assets/plan-and-execute-flow.png|Plan-and-Execute：整体计划交给执行器逐步落实，单步可用 ReAct，可选重规划根据反馈更新计划]]

## 怎样接入重新规划？

加入 [[agent-replanning|Replanning（重新规划）]] 后，执行结果会交回规划模块，检查并更新剩余计划，再由执行器继续处理下一步；任务已完成时则结束。

这是一条可选的反馈路径，Plan-and-Execute 本身不保证包含它。[[langchain-planning-summary|LangChain 从一次规划到加入重规划的演进]]展示了两种实现的区别。

## 收益与代价

显式计划便于检查目标覆盖和步骤关系；执行器也可以只接收当前步骤需要的信息。但规划、执行与复核都可能增加调用，计划出错还会影响后续工作。只有减少不必要的往返、使用合适的执行模型等收益抵过这些开销时，整体成本才可能降低，不能仅凭模式名称判断更快或更便宜。
