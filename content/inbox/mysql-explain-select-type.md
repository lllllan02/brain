---
title: "MySQL EXPLAIN select_type"
category: "MySQL"
updated_at: "2026-10-08"
tags: ["MySQL", "执行计划", "查询块", "子查询", "UNION"]
aliases: ["EXPLAIN select_type"]
---

**`select_type` 是 EXPLAIN 里描述「查询块在整个查询中的角色」的字段**，用来识别普通查询、外层查询和子查询；和描述访问方式的 [[mysql-explain-type|type]] 是两个层次。

| 常见值 | 含义 |
|---|---|
| `SIMPLE` | 不含子查询或 UNION 的简单查询，可含 JOIN |
| `PRIMARY` | 复杂结构里的最外层查询 |
| `SUBQUERY` | 子查询中的第一个 SELECT；相关时通常带 DEPENDENT |
| `DEPENDENT SUBQUERY` | 依赖外层值的子查询 |
| `DERIVED` | FROM 中的派生表 |
| `MATERIALIZED` | 按物化方式处理的子查询 |
| `UNION` | UNION 第二个及之后的 SELECT |
| `UNION RESULT` | UNION 的汇总结果 |

SQL 结构上能区分外层和内层，但**实际不一定固定是 PRIMARY + SUBQUERY**——MySQL 可能把 `IN` 子查询改写成半连接或物化，以当前计划为准。普通 `users JOIN orders` 只有简单查询块时，两行通常是 SIMPLE。先掌握 SIMPLE / PRIMARY / SUBQUERY，再看其他标记，别据名称判断快慢。
