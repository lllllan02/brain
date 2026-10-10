---
title: "工具调用的权限与审批"
parent: tool-calling
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10"
updated_at: "2026-10-10T20:24:03+08:00"
---

**权限与审批关注一次工具调用是否获准、是否需要人确认，以及批准后如何继续执行。** 执行环境的隔离机制由[[agent-sandbox|沙箱专题]]展开，两者在[[sandbox-execution|调用链中的衔接]]另有说明。

Agent 权限设计的阅读主线：

1. [[aws-agentcore-authorization-summary|AWS AgentCore]]：将工具调用变成统一授权请求，用集中策略与默认拒绝、禁止优先决定结果。
2. [[openfga-agent-authorization-summary|OpenFGA]]：用授权关系表达可调用能力，用运行时条件限定资源和参数；动态条件属于实验功能。
3. [[permit-agent-approvals-summary|Permit]]：在授权后组合审批规则，并区分获得访问权限与批准具体操作。

规则在程序中的执行位置见[[agent-guardrails|行为约束]]，暂停与恢复见[[agent-human-in-the-loop|人工介入]]；这两篇分别连接 Claude 和 OpenAI 的 SDK 实现参考。
