---
title: "MySQL EXPLAIN id"
category: "MySQL"
updated_at: "2026-10-08"
tags: ["MySQL", "执行计划", "查询块", "JOIN", "子查询"]
aliases: ["EXPLAIN id", "查询块"]
---

**`id` 是 EXPLAIN 里标识 SELECT 查询块的字段**：同一个查询块访问多张表时，多行计划的 id 相同。它不是结果行编号，也不是性能评分。

```sql
SELECT * FROM users AS u JOIN orders AS o ON o.user_id = u.id;
```

上面只有一个查询块，访问 u、o 的两行通常都是 `id=1`；有独立子查询块时会出现不同 id，UNION 汇总行的 id 还可能为 NULL。

**别用「id 越大越先执行」推断时序**：查询可能被改写、合并、物化，相关子查询还会重复求值。先用 id 看结构，再结合访问顺序和 TREE 格式里的算子关系理解执行。
