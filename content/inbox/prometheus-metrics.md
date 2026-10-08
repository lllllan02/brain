---
title: "Prometheus 指标类型"
category: "可观测性"
updated_at: "2026-10-08"
tags: ["Prometheus", "指标"]
aliases: ["指标类型", "Counter", "Gauge", "Histogram"]
---

**[[prometheus|Prometheus]] 有三类基本指标，选错类型会让查询和告警算错。**

- **Counter**：累计次数等只增不减的量；进程重启可归零，所以通常用 `rate` 等函数看**变化速率**，而不是直接读原始值。
- **Gauge**：当前连接数、队列长度等可增可减的值，直接读就是瞬时状态。
- **Histogram**：分布；经典直方图按桶累计计数，可以估算分位数，精度受桶边界影响。

语义依据见 [Metric types](https://prometheus.io/docs/concepts/metric_types/)。
