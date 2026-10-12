---
parent: agent-replanning
title: "LangGraph：每步执行后的 Replan 节点"
category: "Agent"
tags: ["Agent", "任务规划"]
created_at: "2026-10-12T00:56:04+08:00"
updated_at: "2026-10-12T00:56:04+08:00"
source: "[Plan-and-Execute 官方示例（0.2.0 标签）](https://github.com/langchain-ai/langgraph/blob/0.2.0/examples/plan-and-execute/plan-and-execute.ipynb)"
---

**这个示例把 `replan` 固定接在执行节点之后，每完成一个计划步骤就回看剩余工作。** 它没有先判断“出错了没有”才进入重规划。本文只解释该历史版本的控制流，未运行代码，不作为当前 SDK 用法。

## 传入什么，返回什么？

状态包含原始目标 `input`、计划 `plan`、已执行步骤及结果 `past_steps`、最终回答 `response`。执行器取计划首项，结合计划上下文完成它，再追加本步结果。

`replan_step` 将状态交给模型。提示要求只保留仍需完成的步骤；模型通过结构化输出返回 `Plan` 或 `Response`，程序分别更新剩余计划或最终回答。

## 谁决定继续？

图中的路径为 `planner → agent → replan`。条件函数 `should_end` 检查是否已有非空回答：有则结束，否则再次进入执行器。回到执行器后仍取剩余计划的首项，因此能逐步推进。

这里将进度检查和剩余计划生成合并在一次调用里。访问 `replan` 不代表原计划方向必然改变，也可能只是移除已完成项。

## 示例没有保证什么？

结束判断依赖模型是否返回回答，未独立验证任务成功；图中也未实现完整的错误分类、重试和计划安全校验。这些需要应用补充。源码定位可搜索 `replanner_prompt`、`execute_step`、`replan_step` 与 `should_end`。
