---
learning_status: pending
title: "Trace 与 Span"
category: "可观测性"
created_at: "2026-10-09"
updated_at: "2026-10-18T00:28:03+08:00"
tags: ["Trace", "Span", "分布式追踪"]
aliases: ["Trace", "Span", "追踪链路", "操作记录", "操作单元", "分布式追踪", "Tracing"]
---

**Trace（追踪链路）是描述一次请求或任务执行过程的一组相关操作记录。** 当一次请求经过多个服务时，它把各环节的调用关系、耗时和状态串起来，帮助判断请求经过哪里、慢在哪里、哪里出错。

**Span（操作记录）是 Trace 的组成单元，记录一次操作从开始到结束的过程。** 一次 HTTP 请求处理、数据库查询或工具调用都可以记录为一个 Span，包含操作名称、起止时间、状态及补充细节的属性（attributes）。一条 Trace 由一个或多个 Span 组成，根操作本身也是一个 Span。

## 调用关系与耗时

例如，一次请求处理期间查询 MySQL 和 Redis，可记录为下面这组 Span；ID 和耗时均为示意值：

```text
Trace ID = trace-A
span-1  处理 HTTP 请求  100ms
├── span-2  查询 MySQL   30ms
└── span-3  查询 Redis   10ms
```

`trace_id` 把这些操作归入同一条链路，`span_id` 区分每次操作，`parent_span_id` 表示父子关系。这里 `span-2` 和 `span-3` 的父 ID 都是 `span-1`；根 Span 没有父 Span。父子关系表达子操作归属，两个同级 Span 可以串行，也可以并行，不能仅凭树形缩进判断先后。

如果 HTTP 处理同步等待这两次查询，查询时间已经包含在父 Span 的 100ms 内，不能相加得到 140ms。读取耗时还要看起止时间和重叠区间；异步子操作也可能在父操作结束后继续执行。

## 采集边界

Trace 只呈现已采集的操作。缺少埋点、[[otel-trace-collection#调用关系怎样传到另一个执行单元？|上下文传播]]中断、采样或导出丢失，都可能使链路缺环节；看到一条 Trace，不代表请求的每个内部步骤都已被记录。

在 OpenTelemetry 中，[[otel-trace-collection#Trace 与 Span 的数据模型|Span 状态]]描述操作的技术结果；操作正常结束，也不代表业务产物一定正确。
