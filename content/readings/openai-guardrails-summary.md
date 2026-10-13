---
title: "OpenAI：自动检查与工具审批"
parent: agent-human-in-the-loop
category: "Agent"
tags: ["Agent", "行为约束", "权限"]
created_at: "2026-10-10"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "[Guardrails](https://openai.github.io/openai-agents-python/guardrails/)"
  - "[Guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)"
  - "[Human-in-the-loop](https://openai.github.io/openai-agents-python/human_in_the_loop/)"
---

**「自动检查根据规则决定是否继续，审批记录对具体操作的批准或拒绝。」** 本文聚焦 OpenAI Agents Python SDK 的检查覆盖与暂停恢复，不展开全部工具类型的配置。

## 检查放在哪里？

输入检查只在链条首个 Agent 上执行，输出检查只覆盖最终回答。默认并行输入检查可能在拦截前就让 Agent 消耗 token、执行工具；`run_in_parallel=False` 才会等待检查结束后启动 Agent。

检查函数返回 `tripwire_triggered=True` 时，Runner 抛出对应异常，由应用处理拒绝。函数工具的输入检查在执行前拦截，输出检查在执行后处理结果；后者不能撤销工具副作用。

工具 Guardrails 使用 `FunctionTool` 管线，可用于配置了检查的本地 MCP 工具；托管工具、Shell 等内置执行工具**「不自动经过这套管线」**，需单独核对执行与审批入口。需审批的函数工具默认在批准后执行输入检查，也可配置审批前检查，并在批准后再查一次。[检查覆盖与时机](https://openai.github.io/openai-agents-python/guardrails/#tool-guardrails)

## 审批怎样恢复执行？

工具以 `needs_approval` 声明审批条件 → 返回待处理的 `interruptions` → 应用取得 `result.to_state()` → 调用 `state.approve(...)` 或 `state.reject(...)` → 用 `Runner.run(agent, state)` 恢复。

原文以取消订单演示暂停；条件也可按调用参数动态判断。嵌套 Agent 的请求仍从原顶层运行恢复。它补充了[[sandbox-execution|执行前的权限检查]]，不说明操作系统隔离如何落实。

## 批准的范围与状态归属

单次决定按调用 ID 关联；`always_approve`／`always_reject` 将决定扩大到同一运行后续的同一工具身份，恢复状态时仍可保留，**「不能当作仅批准一次」**。

长期等待可序列化 `RunState`，但**「反序列化不验证身份或快照真实性」**。完整状态应存可信服务端；客户端只提交待审批标识与决定，服务端校验审批者及范围，并防止同一待处理请求被重复消费。[审批状态的可信边界](https://openai.github.io/openai-agents-python/human_in_the_loop/#keep-approval-state-on-the-server)

以上按 2026-10-13 文档核对，未固定 SDK 发布版本，示例未运行。
