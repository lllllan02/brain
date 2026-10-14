---
learning_status: understood
title: "工具接口设计"
aliases: ["Tool Interface Design"]
parent: tool-calling
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-10"
updated_at: "2026-10-12T12:11:11+08:00"
reading_suggestions:
  - openai-function-design-summary
  - anthropic-tool-design-summary
  - agent-trace
---

**工具接口设计围绕模型使用工具的三个环节：选对工具、填对参数、读懂结果。** 名称、描述、参数和返回值，都应帮助模型减少猜测。

## 选对工具：职责与用途要能区分

**「一个工具承接一项清楚的任务」**，不必与底层 API 一一对应。固定的关联操作可以合并；中途需要模型判断或用户确认的步骤，应保留独立边界。名称和描述再把用途、适用条件及副作用说清楚，避免多个工具看起来都能做同一件事。[[anthropic-tool-design-summary|Anthropic 的工具设计经验]]展开了这种粒度取舍。

## 填对参数：减少模型需要猜的输入

参数明确类型、必填项、单位和默认行为。**「程序已经确定的值，由程序补入」**；需要模型选择的输入才交给模型填写，执行端仍须校验。[[openai-function-design-summary|OpenAI 的定义建议]]说明了怎样用参数结构减少歧义。

## 读懂结果：让模型知道下一步能做什么

返回值保留任务信息与后续所需标识，并明确**「结果是否完整、操作是否完成」**：分页或截断要能继续读取，写操作区分「已受理」与「已完成」，错误指出可修正的问题。

接口是否好用，最终用任务结果和[[agent-trace|调用轨迹]]检验：选错、填错、误读分别定位到上述环节；调整后用独立任务比较成功率、调用次数、耗时与成本，不凭单次表现增删工具。
