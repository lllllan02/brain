---
title: "OpenTelemetry Collector 与采样"
category: "可观测性"
updated_at: "2026-10-08"
tags: ["OpenTelemetry", "Collector", "采样"]
aliases: ["Collector", "Sampling", "采样"]
---

**SDK 通常通过有界队列和批量导出把数据送出去，再由 Collector 统一接收、处理和转发。** Collector 里 receiver 接收，processor 批处理、过滤或采样，exporter 转发到存储；观测链路出问题时，要决定缓冲、丢弃和重试策略，避免业务线程被无限阻塞。

采样分两种：

- **Head sampling**：在请求开始时决定采不采，成本低，但不知道请求最终会不会失败。
- **Tail sampling**：先把一段 Trace 汇总起来再决定是否保留，代价是缓存与路由要求；**上游已经丢掉的 Span，tail sampling 也找不回来**。

另外，指标可以采用不同的推送或抓取管线，不能把所有信号都当成同一条 HTTP 导出路径。[[slow-api-investigation|排障]]时，把 Trace、日志里的 trace_id 和指标时间窗口对应起来，才能把单次异常和总体变化联系起来。

职责见 [Collector 架构](https://opentelemetry.io/docs/collector/architecture/)。
