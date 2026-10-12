---
title: "OpenTelemetry：GenAI 与 Agent 的追踪约定"
category: "可观测性"
tags: ["OpenTelemetry", "Agent", "Trace"]
created_at: "2026-10-12T23:19:16+08:00"
updated_at: "2026-10-12T23:19:16+08:00"
source:
  - "https://github.com/open-telemetry/semantic-conventions-genai"
  - "https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md"
  - "https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md"
---

**GenAI 语义约定在 OpenTelemetry Span 上统一操作名称与属性，让模型、Agent 和工具调用能够被一致识别。** 本文节选与 Agent Trace 记录内容有关的部分，不覆盖全部指标和供应商扩展。

## 怎样区分一次运行中的操作？

[Agent spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md) 区分创建 Agent、调用 Agent、工作流和规划等操作。调用 Agent 使用 `gen_ai.operation.name=invoke_agent`；远程调用对应 `CLIENT`，进程内执行对应 `INTERNAL`，说明操作语义与通信边界是两层信息。

规划只有在埋点能够可靠识别时才记录为 `plan`。生成计划的模型调用可作为其子 Span，计划产生的工具或任务通常位于同一 Agent 下；不能把每次普通推理都标成规划。

[GenAI spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md) 中的工具执行约定包含名称、调用 ID，以及按需采集的参数和结果。调用 ID 可帮助把模型提出的调用与程序返回的结果对应起来；发生错误时记录错误类型。

## 记录内容与默认采集如何取舍？

规范区分操作属性与内容载荷。模型输入、输出、指令可能很大并包含敏感数据，因此默认不采集正文，允许显式开启；工具参数、结果也标为 Opt-In。需要记录内容时，可使用结构化属性，或在不支持结构化 Span 属性的实现中序列化为 JSON。

文档还讨论截断及外部存储钩子：保留 JSON 结构的截断便于解析，大内容可由应用上传到另一个存储位置。由此可见，「字段有定义」不表示「采集器默认保存了字段」，排查前必须核对实际配置与载荷。

## 版本边界

2026-10-12 核对时，[旧文档页](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/) 已指向独立的 `semantic-conventions-genai` 仓库；所读 Agent spans 文档标为 **Development**。这里依据当日 `main` 文档，未固定发行版本或运行 SDK。工程接入应固定约定与埋点库版本，升级时核对字段及后台解析规则。
