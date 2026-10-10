---
title: "OpenAI：自动检查与工具审批"
parent: agent-human-in-the-loop
category: "Agent"
tags: ["Agent", "行为约束", "权限"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source:
  - "[Guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)"
  - "[Human-in-the-loop](https://openai.github.io/openai-agents-python/human_in_the_loop/)"
---

**自动检查判断规则是否满足，审批决定敏感操作能否执行。** 本文总结 OpenAI Agents SDK 的工作流机制。

## 检查放在哪里？

输入检查处理请求，输出检查处理最终回答，工具检查处理函数参数或结果。输入检查可阻塞主流程，也可并行以降低延迟；需要避免提前产生工作或副作用时，应选择阻塞。

SDK 的输入检查只覆盖链条首个 Agent，输出检查只覆盖最终输出 Agent；不能据此认为每次工具调用都已检查。副作用相关校验应贴近具体工具。

## 审批怎样恢复执行？

工具声明需要审批 → 暂停并返回 `interruptions` 与可恢复的 `state` → 应用批准或拒绝 → 从同一状态继续。等待较久时可序列化状态保存；不必新开一轮用户请求重做任务。

原文以取消订单演示 `needsApproval`／`needs_approval`，并给出批准后恢复的代码。它补充了[[sandbox-execution|执行前的权限检查]]；审批机制本身不说明操作系统隔离如何落实。

## 批准的范围与状态归属

Python SDK 的单次批准按调用 ID 关联；`always_approve`／`always_reject` 可将决定扩展到同一运行后续的同一工具。两者授权范围不同，不能无意中把一次批准变成持续放行。

暂停后通过 `result.to_state()` 取得状态，批准或拒绝，再交给 `Runner.run` 恢复；嵌套 Agent 的审批也从原顶层 Agent 恢复。审批条件可根据调用参数动态判断。

长时间等待可序列化状态，但应保存在可信服务端。反序列化并不会验证提交者身份或快照真实性；客户端只应提交待审批项的标识与决定，由应用校验。

以上按 2026-10-10 两篇文档整理，SDK 示例未运行。
