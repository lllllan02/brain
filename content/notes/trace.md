---
title: "Trace（追踪链路）"
category: "可观测性"
updated_at: "2026-10-09"
tags: ["Trace", "分布式追踪"]
aliases: ["Trace", "分布式追踪", "Tracing", "追踪链路"]
---

**Trace（追踪链路）是描述一次请求或任务执行过程的一组相互关联的操作记录，由一个或多个 [[span|Span]] 组成。** 它把各环节的调用关系、耗时和状态关联起来，帮助判断请求经过哪里、慢在哪里、哪里出错。

例如，一次请求经过 `API 网关 → 用户服务 → 订单服务 → MySQL`，各环节产生的 Span 使用同一个 Trace ID 关联到同一条 Trace，再通过父子关系表达调用关系。Trace ID 标识整条追踪链路，Span ID 标识其中的一次操作；链路也可以包含并行分支，不一定是一条直线。

可以把 Trace 记作「一次请求的完整链路记录」，但实际采集到的内容取决于[[tracing-instrumentation|埋点与上下文传播]]，也可能因采样或数据丢失而缺少环节。因此，看到一条 Trace 不代表请求的每个内部步骤都已被记录。

参考：[OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/)。
