---
title: "MySQL EXPLAIN rows 与 filtered"
category: "MySQL"
updated_at: "2026-10-06"
tags: ["MySQL", "执行计划", "行数估算", "统计信息", "JOIN"]
classes: ["concept"]
---

`rows` 是当前访问步骤预计检查的候选行数；`filtered` 是这些候选行经过剩余条件后**预计留下的百分比**。两者均为优化器估算，InnoDB 的 rows 尤其不能当作实际读取计数。

```text
当前步骤预计输出行数 ≈ rows × filtered / 100
例如：1000 × 10 / 100 = 100 行
```

`filtered=10.00` 表示留下约 10%，即滤掉约 90%；`filtered=100` 表示这一步预计全部留下，不代表查询一定高效。优化器依据统计信息、数据分布等估算这些数字，不会先完整执行 SQL 获得真实命中数。

1. **单表看候选量和剩余过滤**。rows 很大而 filtered 很低，说明可能先读取了大量候选再丢弃，可检查是否能把高选择性的条件用于索引定位。
2. **JOIN 看重复访问的放大**。在嵌套循环中，内表 rows 通常是每次查找的估算：若外表预计输出 100 行，内表每次检查 10 行、留下 20%，则内表累计检查约 1000 行，连接输出约 200 行。不能把内表 rows=10 当作整条查询只读 10 行，也不能简单相加各行 rows。
3. **估算与实际对照**。数据倾斜、统计信息偏差可能造成误估。需要验证时使用 EXPLAIN ANALYZE 查看实际行数、loops 和耗时；这里的乘法不直接适用于所有连接算法，也不等于经过聚合、去重或 LIMIT 后的最终行数。

参考：[MySQL 条件过滤与行数估算](https://dev.mysql.com/doc/refman/8.4/en/condition-filtering.html)。
