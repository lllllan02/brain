---
title: "工具调用需要哪些 Harness 能力"
parent: tool-calling
category: "Agent"
tags: ["Agent", "工具调用", "Harness"]
created_at: "2026-10-09"
updated_at: "2026-10-10"
---

**工具调用侧的 [[agent-harness|Harness]] 能力覆盖工具的管理、执行约束与失败恢复。** 从 [[tool-calling|工具调用]] 的基本交互出发，可以沿完整链路按需补充：

- 发现与注册：通过[[tool-registry|工具注册中心]]接入和管理本地或外部工具，统一定义与执行入口，管理版本、连接和可用状态。
- 按需加载：按任务与权限选择工具，通过[[tool-loading|工具按需加载]]将需要的定义提供给模型，减少上下文占用。
- 生成调用：通过[[tool-interface-design|工具接口设计]]说明适用条件、参数与使用示例，控制本轮可调用的工具集合，帮助模型正确选择。
- 校验与授权：校验工具、参数和业务条件，执行时检查权限，必要时人工确认。
- 执行与恢复：通过[[tool-scheduling|工具执行调度]]处理依赖、并发、限流、超时与取消；采用[[agent-retry|有限重试]]，写操作保证幂等；长任务按需保存状态、支持恢复。
- 结果回传：关联调用 ID，明确成功、失败或状态未知；筛选、截断或脱敏大结果，将外部内容作为数据而非指令。
- 继续决策：更新上下文，通过[[agent-self-correction|自我纠正]]修正参数或调整行动；设置调用次数、时间和费用预算，避免循环失控。

程序侧发现与注册解决工具接入，模型侧按需加载决定本轮提供哪些定义。工具少时可以全部加载，工具多时再引入搜索等选择机制。[工具搜索与加载参考](https://developers.openai.com/api/docs/guides/tools-tool-search)

贯穿全程的能力包括通过[[agent-sandbox|沙箱]]限制程序执行，以及记录工具选择、参数、耗时、结果和错误的 [[agent-trace-requirements|Trace]]，用于排查与评测。工具可见不代表调用已获授权，执行时仍需检查权限。[权限与约束参考](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)

重试前需判断操作是否可重复；超时不代表操作未发生，应通过状态查询或幂等机制避免重复副作用。[执行与重试参考](https://developers.openai.com/api/docs/guides/tools-programmatic-tool-calling)
