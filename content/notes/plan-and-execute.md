---
learning_status: organized
parent: agent-planning
title: "Plan-and-Execute（先规划再执行）"
aliases: ["Plan and Execute", "Plan-and-Execute"]
category: "Agent"
tags: ["Agent", "任务规划", "执行模式"]
created_at: "2026-10-09"
updated_at: "2026-10-17T17:53:58+08:00"
reading_suggestions:
  - react-agent
  - agent-replanning
  - langchain-planning-summary
learning_status_changed_at: "2026-10-17T18:39:03.378+08:00"
---

**Plan-and-Execute（先规划再执行）是一种先生成整体任务计划，再逐步完成计划的 Agent 执行模式。**

任务包含多个阶段时，只关注下一步可能遗漏要求，或在局部问题上反复尝试。[[langchain-planning-summary|先把整体步骤列出来]]，可以提前检查目标是否覆盖、前后顺序是否合理，让当前行动对应一个明确的子目标。

## 规划与执行的分工

基本流程是：**用户目标 → 制定计划 → 逐步执行 → 汇总结果**。

- 规划器（Planner）：根据目标生成步骤，安排整体任务。
- 执行器（Executor）：接收当前步骤和必要上下文，选择工具与具体行动，完成这个子目标。

两者是职责分工，可以使用同一个模型。一个计划步骤也可以通过多轮 [[react-agent|ReAct]] 完成，包含多次工具调用。

下图以产品比较为假设任务：计划已有三个步骤，执行器当前只负责收集资料，比较和建议仍待后续完成。

![[assets/plan-and-execute-illustration.png|整体计划与单步执行：执行器通过多次查询完成收集资料这一个步骤]]

## 适用场景与代价

它更适合**「能识别主要阶段、需要跟踪多项要求的任务」**，例如资料调研后形成报告、修改代码后验证结果。显式计划便于检查遗漏，也让执行器集中处理当前步骤。

但制定计划会增加调用和等待，错误计划也可能让后续工作沿着错误方向推进。简单查询通常无需专门规划；下一步高度依赖新发现时，逐步探索可能更合适。是否更快、更便宜，仍取决于具体实现与任务。

执行中若发现前提变化，可加入 [[agent-replanning|Replanning（重新规划）]]，根据反馈调整剩余计划；这是可选机制，先规划本身不保证计划会自动更新，也不保证步骤会并行执行。
