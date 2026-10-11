---
parent: agent
title: "Agent Harness 是什么"
aliases: ["Harness", "Agent Harness"]
category: "Agent"
tags: ["Agent", "Harness"]
created_at: "2026-10-09"
updated_at: "2026-10-10T21:10:22+08:00"
---

**Agent Harness 是围绕模型搭建的运行系统，负责组织模型调用、执行工具、管理上下文与状态，并提供权限约束、错误恢复等能力，让模型能够持续完成任务。** 模型决定下一步做什么，Harness 执行这个决定、反馈结果，并控制执行边界。

## 能力方向

Harness 组织[[agent-loop|执行循环]]与[[tool-calling|工具接入]]，准备[[agent-context|模型上下文]]，读取[[agent-memory|记忆]]并维护[[agent-task-state|任务状态]]。运行时再落实[[agent-guardrails|行为约束]]、[[agent-human-in-the-loop|人工介入]]和[[agent-retry|失败重试]]，用[[agent-trace-requirements|Trace]]记录实际过程。

这些职责可由应用代码、框架或独立服务共同承担，不要求实现成单一组件，也不要求每个 Harness 都具备全部能力。能力如何按问题引入，由[[agent|Agent 专题入口]]组织。

## 职责边界

执行环境是 Harness 连接或协调的对象，可以由独立服务或应用管理。会话存储、运行循环和沙箱也可以分离部署，不能把它们都等同于 Harness。[OpenAI 架构说明](https://developers.openai.com/api/docs/guides/agents-api/architecture)、[Anthropic 架构实践](https://www.anthropic.com/engineering/managed-agents)

运行时的结果验证可以属于 Agent Harness；批量测试、评分和回归比较通常由独立的 Evaluation Harness（评测运行系统）承担。两者可以共享执行记录，但职责不同。[Agent 与 Evaluation Harness 的区别](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

长任务还需明确完成标准，并留下未完成工作与进度，便于下一轮接续；只压缩上下文不足以保证任务持续推进。[长任务 Harness 实践](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
