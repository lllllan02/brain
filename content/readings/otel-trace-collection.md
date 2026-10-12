---
title: "OpenTelemetry：上下文传播、错误记录与采样"
category: "可观测性"
tags: ["OpenTelemetry", "Trace", "采样"]
created_at: "2026-10-12T23:28:23+08:00"
updated_at: "2026-10-12T23:28:23+08:00"
source:
  - "https://opentelemetry.io/docs/concepts/context-propagation/"
  - "https://opentelemetry.io/docs/languages/go/instrumentation/"
  - "https://opentelemetry.io/docs/concepts/sampling/"
  - "https://opentelemetry.io/docs/concepts/signals/traces/"
---

**正确的 Trace 依赖调用时传播上下文、在操作边界创建 Span，以及明确的采集策略。** 本文节选官方文档中与应用埋点有关的机制，核对日期为 2026-10-12，未运行 SDK。

## 调用关系怎样传到另一个执行单元？

[上下文传播文档](https://opentelemetry.io/docs/concepts/context-propagation/) 将 Context 与 Propagation 分开：前者携带关联信息，后者负责跨进程序列化和提取。服务 A 发出请求时传递当前 Trace ID 和 Span ID，服务 B 从这些信息建立自己的 Span，并将 A 的 Span 作为父级。HTTP 常用 W3C `traceparent` 头；埋点库可自动完成传播，自定义边界则使用 Propagator。

这里传递的是追踪关联信息，不是模型对话正文。文档同时提醒注意外部服务与 Baggage 的信息传播边界，不能因为字段便于跨服务访问就放入敏感载荷。

[Span Links](https://opentelemetry.io/docs/concepts/signals/traces/#span-links) 则用于关联可能属于不同 Trace 的操作。原文以延迟执行的异步任务为例：后续任务可以单独追踪，再用 Link 关联原操作，不要求它们具有直接父子关系。

## Go 里怎样创建和结束操作记录？

[Go 埋点说明](https://opentelemetry.io/docs/languages/go/instrumentation/) 使用 `tracer.Start(ctx, name)` 返回携带新 Span 的 Context；后续操作用这个 Context 创建子 Span，并在操作结束时调用 `End()`。因此传错 Context 会改变归属，只有相同的业务 ID 并不能替代父子关系。

错误事件与状态也分开处理：`RecordError(err)` 本身不会把 Span 状态设为 Error，失败操作还需调用 `SetStatus`。SDK 的 TracerProvider、处理器和导出器需要初始化，退出前需要完成关闭处理；只调用 API 不等于后端已收到记录。

## 采样的收益与代价

[采样说明](https://opentelemetry.io/docs/concepts/sampling/) 区分请求开始时决定的 Head sampling 和观察更多执行结果后决定的 Tail sampling。前者较早降低采集成本，但无法预知最后是否失败；后者可按错误或耗时选取，却需要保留中间数据并协调采集。

把这些机制用于 Agent 时，需要另外考虑质量判断可能晚于执行结束：模型正常返回但回答错误，未必触发技术错误采样条件。若要依用户反馈筛选错例，应在设计时明确基础保留范围，不能期待事后评分恢复已丢弃的数据。此项是对采样时序的应用推导。
