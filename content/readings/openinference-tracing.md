---
title: "OpenInference：AI 操作语义与埋点仓库"
category: "可观测性"
tags: ["Agent", "Trace", "OpenTelemetry"]
created_at: "2026-10-12T23:19:16+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://github.com/Arize-ai/openinference"
  - "https://github.com/Arize-ai/openinference/blob/main/spec/semantic_conventions.md"
---

**「OpenInference 提供 AI 应用的语义约定和埋点插件，利用 OpenTelemetry 传递追踪数据。」** 本文关注其如何表达模型与工具之间的信息，依据 2026-10-12 的仓库 README 和规范，未部署或运行示例。

## 一个 Span 怎样说明自己做了什么？

[语义规范](https://github.com/Arize-ai/openinference/blob/main/spec/semantic_conventions.md) 要求 OpenInference Span 带有 `openinference.span.kind`，用 `AGENT`、`LLM`、`TOOL`、`RETRIEVER` 等值标明操作。它是 Span 的属性，与 OpenTelemetry 的 `CLIENT`、`INTERNAL` 等 SpanKind 分别表达业务操作和通信角色。

输入输出、模型消息、工具调用与检索文档使用约定字段。消息列表通过带下标的属性名展平，例如 `llm.input_messages.0.message.role`；工具结果消息的 `message.tool_call_id` 对应 `tool_call.id`。这种对应关系使读者可以追查某个工具结果来自哪次请求，避免只凭显示顺序配对。

## 仓库承担哪些工作？

[仓库](https://github.com/Arize-ai/openinference) 将规范放在 `spec/`，将多语言埋点实现分别组织在 `python/`、`js/`、`java/`、`go/`。README 列出框架与模型 SDK 的集成和示例；Go 部分也提供语义常量、上下文传播及遮蔽配置等工具。

其数据可发送到兼容 OpenTelemetry 的后端，Phoenix 和 Arize 提供原生支持。接入时仍要区分「后端接受 Span」与「后端认识这些 AI 属性」：传输兼容不能自行保证专用视图、消息展示或成本统计。

OpenInference 与 [[otel-genai-tracing|OTel GenAI 约定]] 都为 AI 操作赋予语义，但**「字段并不相同」**。选择集成时应核对实际导出格式和后台支持；自动埋点覆盖的是所支持 SDK 的调用，应用自己的验收结果与业务状态仍需明确记录。
