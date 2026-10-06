---
title: "MySQL EXPLAIN select_type"
updated_at: "2026-10-06"
tags: ["MySQL"]
classes: ["concept"]
---

# MySQL EXPLAIN select_type

`select_type` 表示**查询块在整个查询中的角色**。它帮助识别普通查询、外层查询和子查询，与描述表访问方式的 [[mysql-explain-type|type]] 是两个层次。

| 常见值 | 含义 |
|---|---|
| `SIMPLE` | 不含子查询或 UNION 的简单查询，允许包含 JOIN |
| `PRIMARY` | 存在复杂查询结构时的最外层查询 |
| `SUBQUERY` | 子查询中的第一个 SELECT；相关情形通常另有 DEPENDENT 标记 |
| `DEPENDENT SUBQUERY` | 依赖外层查询值的子查询 |
| `DERIVED` | FROM 中的派生表查询 |
| `MATERIALIZED` | 采用物化方式处理的子查询 |
| `UNION` | UNION 中第二个及后续 SELECT |
| `UNION RESULT` | UNION 的汇总结果 |

```sql
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders);
```

从 SQL 结构上可以区分外层查询和内层子查询，但**实际结果不保证固定是 PRIMARY + SUBQUERY**：MySQL 可能把 IN 子查询改写为半连接，或采用物化。以当前计划为准。

普通的 `users JOIN orders` 只有一个简单查询块时，两张表对应的行通常都是 SIMPLE。先掌握 SIMPLE、PRIMARY、SUBQUERY，再用其他标记识别具体结构，不根据名称直接判断快慢。
