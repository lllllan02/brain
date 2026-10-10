---
title: "Pydantic AI：区分重试层次与预算"
parent: agent-retry
category: "Agent"
tags: ["Agent", "重试"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Retries](https://pydantic.dev/docs/ai/core-concepts/retries/)"
---

**Pydantic AI 将请求重发、模型修正和工作流重执行分开配置；它们的预算不共享，叠加后可能放大实际请求数。**

## 谁在重试什么

传输层和 Provider SDK 重发 HTTP 请求，模型看不到这些失败；工具重试则把错误交给模型，要求修正调用，会增加模型往返。输出校验失败也可请求模型修正。切换模型属于 fallback，不是重新尝试同一个模型。[层次与放大](https://pydantic.dev/docs/ai/core-concepts/retries/#the-layers)

例如查询工具要求完整姓名，第一次只有名字时返回 `ModelRetry`，模型补齐后再调用；普通失败结果 `ToolFailed` 的区别见 [[pydantic-tool-execution-summary|工具执行与失败反馈]]。

## 为什么局部次数不够

SDK 和传输层若各允许三次尝试，一次上层请求最多可能触发九次网络尝试。只限制 Agent 的模型轮数，不能限制这些隐藏请求。

文档中的工具计数按工具名维护、成功后重置；`max_retries=N` 允许初次加 N 次重试。因此还需运行级预算，不能把单工具修正次数当作整次任务的总上限。

具体实现可看原文的 [HTTP 客户端示例](https://pydantic.dev/docs/ai/core-concepts/retries/#a-retrying-client)：分别配置错误筛选、尊重 `Retry-After` 的等待策略及停止条件。按 2026-10-10 文档总结，未运行示例。
