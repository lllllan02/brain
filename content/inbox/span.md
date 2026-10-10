---
title: "Span（操作记录）"
category: "可观测性"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["Span", "分布式追踪"]
aliases: ["Span", "操作单元"]
---

**Span 是 [[trace|Trace]] 中描述一次操作从开始到结束的结构化记录，包含操作名称、时间、状态及上下文信息。** 一次 HTTP 请求处理、数据库查询或工具调用，都可以各自记录为一个 Span。

下面是用于理解字段的简化示例，ID 和时间为示意值，不是实际采集结果，也不是某个 SDK 的完整导出格式：

```json
{
  "trace_id": "trace-A",
  "span_id": "span-2",
  "parent_span_id": "span-1",
  "name": "查询订单",
  "start_time": "10:00:00.000",
  "end_time": "10:00:00.030",
  "status": "OK",
  "attributes": {
    "database": "mysql",
    "operation": "SELECT"
  }
}
```

这条记录表示：`trace-A` 中的 `span-2` 是由 `span-1` 发起的一次查询，耗时 30ms。`trace_id` 用于归属链路，`span_id` 区分操作，`parent_span_id` 关联父操作，`attributes` 补充操作细节；根 Span 没有父 Span。

例如，处理 HTTP 请求的父 Span 耗时 100ms，其中查询 MySQL 的子 Span 耗时 30ms，调用 Redis 的子 Span 耗时 10ms。同步等待子调用时，这些时间已经包含在父 Span 内，不能相加得到 140ms；异步操作则不能一概假设父 Span 的时间范围覆盖子 Span。

字段核对：[OpenTelemetry Span](https://opentelemetry.io/docs/concepts/signals/traces/#spans)。
