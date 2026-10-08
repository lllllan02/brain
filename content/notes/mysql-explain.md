---
title: "MySQL EXPLAIN"
category: "MySQL"
updated_at: "2026-10-08"
tags: ["MySQL", "执行计划", "SQL优化", "索引", "JOIN"]
classes: ["overview"]
aliases: ["EXPLAIN", "执行计划"]
---

**`EXPLAIN` 展示 MySQL 为一条 SQL 选择的执行计划**：访问哪些表、怎么查找、用哪个索引、预计检查多少行，以及是否需要排序或临时表。字段含义如下（点链接看详解）：

| 字段 | 含义 |
|---|---|
| [[mysql-explain-id\|id]] | 查询块编号；同一块访问多表时多行同 id |
| [[mysql-explain-select-type\|select_type]] | 查询块类型，如 SIMPLE、PRIMARY、SUBQUERY |
| [[mysql-explain-auxiliary-fields\|table]] | 这一行访问的表、别名或中间结果 |
| `partitions` | 访问的分区；非分区表通常为 NULL |
| [[mysql-explain-type\|type]] | 访问方式，如 ref、range、ALL |
| [[mysql-explain-index-fields\|possible_keys]] | 候选索引 |
| `key` | 实际选用的索引 |
| `key_len` | 使用的索引键长度 |
| `ref` | 等值查找匹配的常量、列或表达式 |
| [[mysql-explain-rows-filtered\|rows]] | 预计检查的行数 |
| `filtered` | 候选行经剩余条件留下的百分比 |
| [[mysql-explain-extra\|Extra]] | 覆盖索引、过滤、排序、临时表等补充 |

分析顺序：先看 `id/select_type/table/partitions` 确认对象，再按 **type → key → rows/filtered → Extra** 判断访问和代价，用 `possible_keys/key_len/ref` 解释「为什么这样访问」；具体例子见[[mysql-explain-reading|怎么读 EXPLAIN 结果]]。

`EXPLAIN` 只给计划和估算，不给实测——要真实耗时/行数用 `EXPLAIN ANALYZE`。理解回表先分清[[mysql-clustered-index|聚簇索引与二级索引]]；SQL 之前还可能有[[db-connection-pool|连接池排队]]。参考：[EXPLAIN 文档](https://dev.mysql.com/doc/refman/8.4/en/explain.html)。
