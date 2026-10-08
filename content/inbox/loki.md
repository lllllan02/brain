---
title: "Loki"
category: "可观测性"
updated_at: "2026-10-08"
tags: ["Loki", "日志", "标签"]
aliases: ["Loki 标签", "LogQL"]
---

**Loki 是一个面向日志的存储与查询系统（日志聚合），思路类似 Prometheus，把每条日志归入一个带标签的「日志流」。** 它只为日志流的标签建索引，日志正文压缩成块保存——理解它的查询成本，关键是先用标签和时间范围缩小候选，再过滤或解析正文。

- **一组标签定义一个日志流**。服务、环境、集群通常适合当标签；**请求 ID、用户 ID、订单 ID 这类无界字段会制造海量流和小块**，增加索引与写入成本——这些信息更适合放在正文或结构化元数据里。
- 下面的 LogQL 用标签限定服务、再筛错误文本（查询示例，未实际执行）：

```logql
{service_name="checkout", environment="prod"} |= "payment failed"
```

- **写入侧**：Distributor 校验并分发数据，Ingester 维护近期数据、形成日志块，持久块通常放对象存储。查询既可能读近期数据，也可能读历史块；部署可以把组件合并或拆开，别把某一种拓扑当唯一架构。
- **保留**要相应存储与 Compactor 等配合，**不是设个看板时间范围就算清除了历史**；租户隔离、查询范围和并发限制同样重要。
- **采集器**：旧资料常用 Promtail，但它已于 2026 年 3 月 2 日结束生命周期；新方案按官方迁移路径评估 Alloy 等受支持采集器。[Promtail 状态](https://grafana.com/docs/loki/latest/send-data/promtail/)

数据流见 [Loki 架构](https://grafana.com/docs/loki/latest/get-started/architecture/)，标签约束见 [Labels](https://grafana.com/docs/loki/latest/get-started/labels/)。
