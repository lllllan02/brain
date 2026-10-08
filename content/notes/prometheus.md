---
title: "Prometheus"
category: "可观测性"
updated_at: "2026-10-08"
tags: ["Prometheus", "指标", "PromQL"]
aliases: ["Prometheus 监控", "时序指标"]
---

**Prometheus 是一个开源的时序指标监控系统**：它定期抓取目标暴露的指标，用「指标名 + 标签集合」标识一条时间序列，再用 PromQL 查询随时间变化的数值。它记录的是聚合后的观测量，替代不了逐条日志或请求追踪。

一个目标暴露的指标分 Counter、Gauge、Histogram 等[[prometheus-metrics|类型]]；除了指标名，[[prometheus-labels|标签]]决定了时间序列的维度。Prometheus 按你写的[[prometheus-alerting|告警规则]]判断是否触发，再由 Alertmanager 负责分组、抑制和通知。

[[grafana|Grafana]] 可以查询并展示这些指标；远程写入能接入其他存储，但仍要设计队列容量、重试与保留策略，不等于自动高可用。查询语言见 [PromQL](https://prometheus.io/docs/prometheus/latest/querying/basics/)。
