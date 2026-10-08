---
title: "Elasticsearch"
category: "数据存储"
updated_at: "2026-10-08"
tags: ["Elasticsearch", "倒排索引", "搜索"]
aliases: ["ES 倒排索引", "Elasticsearch 索引"]
---

**Elasticsearch 是面向搜索与聚合的文档索引库：把字段映射成倒排索引等结构，再分片存储和查询。** 它适合做搜索派生视图；写入确认和搜索可见不是同一个时刻，读到的可能是上一刻的索引状态。

- **Mapping** 决定字段类型：`text` 经分析器分词、适合全文匹配，`keyword` 保留整体值、适合精确过滤与聚合排序，数字和日期用对应类型。错误的动态映射会影响查询语义，可能得重建索引才能修正。
- **索引结构**：倒排索引把词项映射到文档，列式 doc values 支持排序与聚合。索引不断形成 Segment，后台合并减少段数并清理删除标记；频繁更新删除会带来额外写入与合并成本。
- **分片**：文档按路由进主分片，主分片协调副本写入；查询可能访问多个分片、再由协调节点汇总，分片过多会加大扇出和管理成本。副本提高容错和部分读能力，但不解决同一主分片的写瓶颈。
- **可见性**：Refresh 让新 Segment 对搜索可见；Flush、事务日志和持久化提交各司其职，不能把 refresh 当刷盘保证。要求「写后立即搜到」时，要明确用什么等待机制、代价多大。
- **与权威库同步**：需要 [[cdc|CDC]] 或可靠事件记录处理增删改，并保留文档版本以应对重试和乱序。

字段模型见 [Mapping](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference)，可见性见 [近实时搜索](https://www.elastic.co/docs/manage-data/data-store/near-real-time-search)。
