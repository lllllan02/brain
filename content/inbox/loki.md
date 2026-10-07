---
title: "Loki 为什么强调低基数标签？"
category: "可观测性"
updated_at: "2026-10-07"
tags: ["Loki", "日志", "标签"]
---

Loki 主要为日志流的标签建立索引，日志正文压缩成块保存。先用标签和时间范围缩小候选日志，再过滤或解析正文，是理解其查询成本的关键。

一组标签定义一个日志流。服务、环境和集群通常适合做标签；请求 ID、用户 ID 和订单 ID 等无界字段会制造大量流与小块，增加索引和写入成本。这些信息更适合保留在正文或适用的结构化元数据中。

例如下面的 LogQL 用标签限定服务，再筛选错误文本，属于查询示例，未在实际环境执行：

```logql
{service_name="checkout", environment="prod"} |= "payment failed"
```

写入侧的 Distributor 校验并分发数据，Ingester 维护近期数据并形成日志块，持久块通常放入对象存储。查询既可能读取近期数据，也可能读取存储中的历史块；具体部署可以把组件合并或拆开，不应把某一种拓扑当作唯一架构。

保留策略需要相应存储与 Compactor 等配置配合，不能只设置一个看板时间范围就认为历史已被清除。租户隔离、查询范围和并发限制同样重要。

旧资料常用 Promtail 作为采集器，但它已于 2026 年 3 月 2 日结束生命周期；新方案应按官方迁移路径评估 Alloy 等受支持采集器。[Promtail 状态](https://grafana.com/docs/loki/latest/send-data/promtail/)

数据流见 [Loki 架构](https://grafana.com/docs/loki/latest/get-started/architecture/)，标签约束见 [Labels](https://grafana.com/docs/loki/latest/get-started/labels/)。
