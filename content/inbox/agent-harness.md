---
title: "Agent Harness 是什么"
aliases: ["Harness", "Agent Harness"]
category: "Agent"
tags: ["Agent", "Harness"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**Agent Harness 是围绕模型搭建的运行系统，负责组织模型调用、执行工具、管理上下文与状态，并提供权限约束、错误恢复等能力，让模型能够持续完成任务。** 模型决定下一步做什么，Harness 执行这个决定、反馈结果，并控制执行边界。

## 能力方向

结合工程资料，可按六类职责理解和扩展；这是职责归纳，不是统一标准或固定的模块划分：

- 执行循环与编排：驱动 [[agent-loop|Agent Loop]]，按需组织[[agent-planning|规划与重新规划]]，调度动作，支持暂停、继续、[[agent-human-in-the-loop|人工介入]]和多 Agent 交接。
- 工具与能力接入：注册、发现、加载工具及 Skill 等可复用指令，具体展开在[[tool-calling-harness|工具调用链路的 Harness 能力]]。
- 上下文、记忆与状态：通过[[agent-context|上下文管理]]组织模型输入与压缩历史，读取[[agent-memory|记忆]]，通过[[agent-task-state|任务状态管理]]单独维护目标、计划、进度与关键结果。会话关联、工具执行、审批与错误等运行数据也按业务需要记录，参与调度和恢复。[持久化与恢复](https://docs.langchain.com/oss/python/langgraph/persistence)
- 执行环境与资源：准备工作区、文件与依赖，连接或创建[[agent-sandbox|沙箱]]，协调环境生命周期。
- 约束与可靠性：通过[[agent-guardrails|行为约束]]执行权限、审批、隔离和预算规则，按反馈进行[[agent-self-correction|自我纠正]]，处理超时、[[agent-retry|重试]]、幂等与故障恢复。
- 观测与验证：通过 [[agent-trace-requirements|Trace]] 记录执行过程，检查实际结果是否满足任务完成条件。

这些能力按任务需要实现，不要求每个 Harness 都具备全部能力。

## 职责边界

执行环境是 Harness 连接或协调的对象，可以由独立服务或应用管理。会话存储、运行循环和沙箱也可以分离部署，不能把它们都等同于 Harness。[OpenAI 架构说明](https://developers.openai.com/api/docs/guides/agents-api/architecture)、[Anthropic 架构实践](https://www.anthropic.com/engineering/managed-agents)

运行时的结果验证可以属于 Agent Harness；批量测试、评分和回归比较通常由独立的 Evaluation Harness（评测运行系统）承担。两者可以共享执行记录，但职责不同。[Agent 与 Evaluation Harness 的区别](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

长任务还需明确完成标准，并留下未完成工作与进度，便于下一轮接续；只压缩上下文不足以保证任务持续推进。[长任务 Harness 实践](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
