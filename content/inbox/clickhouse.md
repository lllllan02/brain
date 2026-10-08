---
title: "ClickHouse"
category: "数据存储"
updated_at: "2026-10-08"
tags: ["ClickHouse", "列式存储", "OLAP"]
aliases: ["ClickHouse 列式分析", "MergeTree"]
---

**ClickHouse 是列式分析数据库，用按列读取、压缩、向量化执行，以及靠排序和索引跳过数据，把大范围聚合查询的成本压下来。** 它擅长扫描大量行中的少数列，不代表点查或高频单行修改也合适。

- **MergeTree**：把写入数据组织成不可变数据片段，后台合并。小批次频繁写会产生大量小片段，增加合并和元数据负担；一次 INSERT 跨多个分区时也可能形成多个片段。
- **ORDER BY** 定义排序方式，也决定稀疏主索引能跳过多少范围。稀疏主索引定位的是数据粒度范围，不是关系库里逐行的唯一约束。
- **PARTITION BY** 偏生命周期管理和裁剪，分区过细反而增加片段管理成本；它也不等于跨节点分片。
- **ReplacingMergeTree** 等引擎能在合并时处理同键版本，但合并通常异步；查询要不要 FINAL 或按版本聚合取决于语义，后台去重不等于每次读都只剩最新记录。
- **增量物化视图**只响应源表插入的数据块，源数据后续变更不会自动重算历史聚合，撤销或修正要另行设计。更新能力随版本发展，不能笼统说「只能追加」。

分片分摊数据、副本提高可用性；Distributed 表提供跨节点访问和分发。机制见 [MergeTree](https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree)、[主索引](https://clickhouse.com/docs/primary-indexes) 与 [水平扩展](https://clickhouse.com/docs/architecture/horizontal-scaling)。
