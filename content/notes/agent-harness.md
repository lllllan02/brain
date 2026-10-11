---
parent: agent
title: "Agent Harness 是什么"
aliases: ["Harness", "Agent Harness"]
category: "Agent"
tags: ["Agent", "Harness"]
created_at: "2026-10-09"
updated_at: "2026-10-11T12:14:02+08:00"
---

**Agent Harness 是围绕模型建立的运行系统，负责组织输入、执行模型提出的动作、回传结果，并控制执行边界。** 模型提供决策能力，Harness 使决策能够持续作用于实际任务。

单次模型调用不会自行执行工具、保存任务进度或发起下一轮调用。这些职责由模型之外的程序与配置承担，构成 Harness；[[langchain-harness-anatomy-summary|从模型限制推导 Harness 的组成]]解释了为什么需要这层系统。

Harness 的范围随语境不同：广义上可包含工具、状态、提示配置与配套基础设施；具体架构中则可把运行控制与执行环境、会话存储分开。因此，Harness 不限定为一个框架、进程或容器。[[openai-agents-architecture-summary|OpenAI 的职责划分]]与[[anthropic-managed-agents-summary|Anthropic 的组件解耦]]展示了这种边界。

Agent Harness 负责运行任务；[[anthropic-agent-evals-summary|Evaluation Harness（评测运行系统）]]负责组织测试、评分与汇总。任务中的结果验证可以属于前者，批量评估模型与运行系统的表现则属于后者。

## 参考实践

[[anthropic-long-running-harness-summary|长任务交接]]说明循环与压缩为什么还不够，[[anthropic-harness-design-summary|生成与评估分工]]进一步讨论如何改善质量，以及何时应精简 Harness。

[[langchain-harness-middleware-summary|中间件扩展]]展示机制如何接入循环；[[openai-harness-engineering-summary|工程环境设计]]则说明文档、工具与可执行规则如何支持 Agent 工作。
