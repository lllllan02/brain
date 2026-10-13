---
parent: agent-replanning
title: "smolagents：按行动步数更新计划"
category: "Agent"
tags: ["Agent", "任务规划"]
created_at: "2026-10-12T00:56:04+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "[agents.py（v1.18.0）](https://github.com/huggingface/smolagents/blob/v1.18.0/src/smolagents/agents.py)"
  - "[Agents API（v1.18.0）](https://huggingface.co/docs/smolagents/v1.18.0/reference/agents)"
---

**「smolagents 的规划入口由行动步数调度，不依赖先检测到错误。」** 本文节选 v1.18.0 的规划循环与记录方式，未运行代码。

## 什么时候调用规划模块？

`_run_stream` 在行动开始前检查 `planning_interval`。配置后，第 1 步生成初始计划，之后按间隔更新；例如间隔为 3 时，在第 1、4、7…步进入规划。这个数是说明计数方式的示例，不是推荐配置。未设置时不会启用这条定期规划路径。

## 怎样根据已有结果更新？

`_generate_planning_step` 首次使用任务和工具信息生成计划；后续将执行记忆、任务及剩余行动预算交给模型，生成更新后的计划。结果写为 `PlanningStep`，包含模型输入、输出、计划与耗时等信息，再继续行动循环。

这里的计划作为记忆指导后续动作，**「不是由程序逐项消费的待执行队列」**；这一点与 LangGraph 的剩余步骤列表不同。

## 取舍是什么？

固定间隔容易配置，能限制规划调用频率；但**「到达间隔不意味着当前计划有错」**，间隔内也不保证及时纠偏。源码另有行动错误记录和最终回答校验入口，不能将它们与定期更新计划混为同一机制。
