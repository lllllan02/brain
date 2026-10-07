---
title: "Elasticsearch 如何把文档变成可检索索引？"
category: "数据存储"
updated_at: "2026-10-07"
tags: ["Elasticsearch", "倒排索引", "搜索"]
---

Elasticsearch 把文档字段映射成适合检索与聚合的索引结构，再通过分片分散存储和查询。它适合搜索派生视图，写入确认与搜索可见不是同一个时刻。

Mapping 决定字段类型。`text` 通常经过分析器分词，适合全文匹配；`keyword` 保留整体值，适合精确过滤、聚合和排序。数字与日期也应使用对应类型。错误的动态映射会影响查询语义，并可能需要重建索引才能修正。

倒排索引把词项映射到文档，列式的 doc values 支持许多排序与聚合操作。索引不断形成 Segment，后台合并减少段的数量并清理删除标记；频繁更新和删除会带来额外写入与合并成本。

文档按路由映射到主分片，主分片协调副本写入。查询可能访问多个分片，再由协调节点汇总；分片过多会增加请求扇出与管理成本。副本提高容错和部分读能力，但不解决同一主分片的全部写入瓶颈。

Refresh 让新 Segment 对搜索可见；Flush、事务日志和持久化提交承担不同职责，不能把 refresh 当作刷盘保证。应用若要求写后立即搜到，应明确所用等待机制及其成本。

与权威数据库同步时，需要 [[cdc|CDC]] 或可靠事件记录处理新增、更新与删除，并保留文档版本以处理重试和乱序。字段模型见 [Mapping](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference)，可见性见 [近实时搜索](https://www.elastic.co/docs/manage-data/data-store/near-real-time-search)。
