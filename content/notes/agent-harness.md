---
learning_status: pending
parent: agent
title: "Agent Harness"
aliases: ["Harness", "Agent Harness"]
category: "Agent"
tags: ["Agent", "Harness"]
created_at: "2026-10-09"
updated_at: "2026-10-17T23:29:15+08:00"
reading_suggestions:
  - langchain-harness-anatomy-summary
  - openai-agents-architecture-summary
  - anthropic-long-running-harness-summary
  - anthropic-harness-design-summary
  - agent-evaluation
---

**Agent Harness 是围绕模型建立的运行系统，负责组织输入、执行模型提出的动作、回传结果，并控制执行边界。** 模型提供决策能力，Harness 使决策能够持续作用于实际任务。

单次模型调用不会自行执行工具、保存任务进度或发起下一轮调用。这些职责由模型之外的程序与配置承担，构成 Harness；[[langchain-harness-anatomy-summary|从模型限制推导 Harness 的组成]]解释了为什么需要这层系统。

Harness 的范围随语境不同：广义上可包含工具、状态、提示配置与配套基础设施；具体架构中则可把运行控制与执行环境、会话存储分开。因此，Harness 不限定为一个框架、进程或容器。[[openai-agents-architecture-summary|OpenAI 的职责划分]]与[[anthropic-managed-agents-summary|Anthropic 的组件解耦]]展示了这种边界。

Agent Harness 负责运行任务；[[agent-evaluation#运行与比较|Evaluation Harness（评测运行系统）]]负责组织测试、评分与汇总。任务中的结果验证可以属于前者，批量评估模型与运行系统的表现则属于后者。

## 参考实践

[[anthropic-long-running-harness-summary|长任务交接]]说明循环与压缩为什么还不够，[[anthropic-harness-design-summary|生成与评估分工]]进一步讨论如何改善质量，以及何时应精简 Harness。

[[langchain-harness-middleware-summary|中间件扩展]]展示机制如何接入循环；[[openai-harness-engineering-summary|工程环境设计]]则说明文档、工具与可执行规则如何支持 Agent 工作。

## 一个能运行的循环，为什么接入业务后仍不可靠？

订单查询在演示中只有一个请求；上线后会同时遇到用户改口、客户端断线、工具超时和重复投递。如果各工具分别保存状态、处理重试，主循环就可能不知道哪一步已经发生，恢复时再次执行。

Harness 应明确几个共同约定：一次用户任务由谁持有，需求更新怎样通知正在运行的步骤，工具结果怎样绑定操作对象，哪些失败允许重试，以及什么证据才能把任务标为完成。这些约定应贯穿入口、工具执行和恢复流程；框架提供了相应组件，也仍需应用确定业务语义。

排查时先沿一次失败找责任边界：模型没获得正确资料，改输入组织；工具已完成却丢了回执，改恢复协议；规则检查被绕过，改执行入口。不要把所有失败都归因于提示词，也不必一次引入全部基础设施。
