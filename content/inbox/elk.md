---
title: "ELK 如何把原始日志变成检索结果？"
category: "可观测性"
updated_at: "2026-10-07"
tags: ["ELK", "Elasticsearch", "Logstash"]
---

ELK 通常由 Elasticsearch 存储和检索、Logstash 处理数据、Kibana 查询与展示组成。实际链路也可由 Elastic Agent 或 Beats 采集，按需要跳过 Logstash；三个名字并不要求每次部署都完整串联。

应用日志先由采集器读取并记录进度，处理层解析字段、规范时间、补充服务信息，再批量写入 [[elasticsearch|Elasticsearch]]。Kibana 对索引或数据流执行查询，展示过滤结果和聚合视图。

结构化 JSON 可减少复杂文本解析，但仍要约定字段类型。相同字段时而数字、时而字符串会引起映射冲突；时间解析和时区错误也会让日志看起来“丢失”，实际只是落到了错误时间范围。

批量接口的 HTTP 请求成功，不代表其中每一条文档都写入成功。消费或采集端必须检查逐项结果，区分可重试失败与永久格式错误，避免提前确认整批数据。持久队列提高恢复能力，但不会自动赋予全链路恰好一次语义。

索引生命周期需要按保留时间和容量控制分片与冷热层。日志量增长时，优先核对字段、索引范围与查询模式，不应只靠不断增加分片。

数据处理见 [Logstash pipeline](https://www.elastic.co/guide/en/logstash/current/pipeline.html)，采集见 [Filebeat](https://www.elastic.co/docs/reference/beats/filebeat)，查询见 [Kibana Discover](https://www.elastic.co/docs/explore-analyze/discover)。
