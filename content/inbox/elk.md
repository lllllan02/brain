---
title: "ELK"
category: "可观测性"
updated_at: "2026-10-08"
tags: ["ELK", "Elasticsearch", "Logstash"]
aliases: ["ELK 日志链路", "Elastic 日志"]
---

**ELK 是「[[elasticsearch|Elasticsearch]] 存储检索 + Logstash 处理数据 + Kibana 查询展示」这套日志链路的统称。** 实际链路也可以用 Elastic Agent 或 Beats 采集、按需跳过 Logstash——三个名字不要求每次部署都完整串联。

应用日志先由采集器读取并记录进度，处理层解析字段、规范时间、补服务信息，再批量写入 Elasticsearch；Kibana 对索引或数据流执行查询、展示过滤与聚合。

- **字段要约定类型**：结构化 JSON 能少些文本解析，但同名字段时而数字、时而字符串会引起映射冲突；时间解析和时区错误会让日志看起来「丢了」，其实只是落到了错误的时间范围。
- **批量写不等于每条都成功**：批量接口的 HTTP 请求成功，不代表其中每条文档都写入成功。采集端必须检查逐项结果，区分可重试失败和永久格式错误，别提前确认整批。持久队列提高恢复能力，但不自动带来全链路恰好一次。
- **索引生命周期**按保留时间和容量控制分片与冷热层；日志量涨时先核对字段、索引范围和查询模式，别只靠不断加分片。

数据处理见 [Logstash pipeline](https://www.elastic.co/guide/en/logstash/current/pipeline.html)，采集见 [Filebeat](https://www.elastic.co/docs/reference/beats/filebeat)，查询见 [Kibana Discover](https://www.elastic.co/docs/explore-analyze/discover)。
