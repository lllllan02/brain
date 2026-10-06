---
title: "MySQL EXPLAIN id"
updated_at: "2026-10-06"
tags: ["MySQL"]
classes: ["concept"]
---

`id` 用来识别 **SELECT 查询块**。同一个查询块访问多张表时，多行执行计划可以具有相同的 id；它不是结果行编号，也不是 SQL 的性能评分。

```sql
SELECT * FROM users AS u
JOIN orders AS o ON o.user_id = u.id;
```

上面的 SQL 只有一个查询块，访问 u、o 的两行计划通常都为 `id=1`。如果还有独立保留在计划中的子查询块，则会出现不同 id；UNION 汇总结果行的 id 还可能为 NULL。

**不要用「id 越大越先执行」推断严格时序。** 查询可能被改写、合并、物化，相关子查询还可能重复求值。先用 id 看结构，再结合表访问顺序与 TREE 格式中的算子关系理解执行过程。
