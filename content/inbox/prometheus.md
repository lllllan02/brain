---
title: "Prometheus 如何把指标变成可查询的时间序列？"
category: "可观测性"
updated_at: "2026-10-07"
tags: ["Prometheus", "指标", "PromQL"]
---

Prometheus 定期抓取目标暴露的指标，以指标名和标签集合标识一条时间序列，并用 PromQL 查询随时间变化的数值。它记录聚合后的观测量，不能替代逐条日志或请求追踪。

Counter 表达累计次数等只增量，进程重启可归零，通常用 rate 等函数观察变化速率；Gauge 表达当前连接数、队列长度等可增可减的值。Histogram 记录分布，经典直方图按桶累计计数，可以估算分位数，但估算精度受桶边界影响。

标签适合服务、实例、状态码和规范化路由。用户 ID、订单 ID 或原始 URL 等无界值会制造大量时间序列，显著增加抓取、存储和查询成本；这些细节更适合日志或 Trace 属性。

例如下面是错误率查询示例，未在实际环境执行，指标名和标签需按埋点调整：

```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
```

`up=1` 表示抓取成功，不代表业务一定正常。告警还需结合业务成功率、延迟和依赖状态，并处理低流量与无数据情况。Prometheus 评估告警规则，Alertmanager 负责分组、抑制和通知路由，二者职责不同。

[[grafana|Grafana]] 可以查询并展示这些指标。远程写入可接入其他存储，但仍需要设计队列容量、重试与保留策略，不能把它视为自动完成高可用。

指标语义见 [Metric types](https://prometheus.io/docs/concepts/metric_types/)，查询见 [PromQL](https://prometheus.io/docs/prometheus/latest/querying/basics/)，通知职责见 [Alerting](https://prometheus.io/docs/alerting/latest/overview/)。
