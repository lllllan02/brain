---
learning_status: pending
title: "EXPLAIN 查询块类型"
category: "MySQL"
parent: mysql-explain-reading
updated_at: "2026-10-12T22:13:41+08:00"
tags: ["MySQL", "执行计划", "子查询"]
aliases: ["EXPLAIN select_type", "MySQL EXPLAIN select_type"]
reading_suggestions:
  - mysql-manual-queries
---

**`select_type` 描述查询块在整个语句中的类型。** 以下是 MySQL 8.4 表格格式列出的 SELECT 类型，依据[[mysql-manual-queries#EXPLAIN 的字段与常见标记|官方输出说明]]。

| 值 | 含义 |
| --- | --- |
| `SIMPLE` | 不含子查询或 UNION 的简单 SELECT，可以包含 JOIN |
| `PRIMARY` | 最外层 SELECT |
| `UNION` | UNION 中第二个及后续 SELECT |
| `DEPENDENT UNION` | UNION 中第二个及后续 SELECT，且依赖外层查询 |
| `UNION RESULT` | UNION 的合并结果 |
| `SUBQUERY` | 子查询中的第一个 SELECT |
| `DEPENDENT SUBQUERY` | 子查询中的第一个 SELECT，且依赖外层查询 |
| `DERIVED` | 派生表对应的查询块 |
| `DEPENDENT DERIVED` | 依赖其他表的派生表查询块 |
| `MATERIALIZED` | 物化子查询，即将子查询结果保存为中间结果供后续使用 |
| `UNCACHEABLE SUBQUERY` | 结果不能被缓存复用、必须为外层查询的每一行重新求值的子查询 |
| `UNCACHEABLE UNION` | 属于不可缓存子查询的 UNION 中，第二个及后续 SELECT |

DEPENDENT 通常与相关子查询有关。DEPENDENT SUBQUERY 按外层上下文的不同参数值组合重新求值；UNCACHEABLE SUBQUERY 则要求为每个外层行重新求值，两者不能混同。

优化器可能合并派生表、改写或物化子查询，因此输出类型以实际计划为准。对于非 SELECT 语句，受影响表的 select_type 还可显示 DELETE、UPDATE 等语句类型。
