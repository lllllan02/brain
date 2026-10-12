---
title: "MySQL EXPLAIN rows 与 filtered"
category: "MySQL"
updated_at: "2026-10-08"
tags: ["MySQL", "执行计划", "行数估算", "统计信息", "JOIN"]
aliases: ["EXPLAIN rows", "EXPLAIN filtered"]
---

**`rows` 是当前步骤预计检查的候选行数，`filtered` 是这些候选行经过剩余条件后预计留下的百分比**，两者都是优化器估算——InnoDB 的 rows 尤其不能当成实际读取行数。

估算输出 ≈ `rows × filtered / 100`（如 `1000 × 10% = 100`）。`filtered=10` 表示留下约 10%、滤掉约 90%；`filtered=100` 只表示这一步预计全留下，不代表查询高效。

- **单表**：rows 大而 filtered 低，说明可能先读大量候选再丢弃，可检查能否把高选择性条件用于索引定位。
- **JOIN**：嵌套循环里内表 rows 是每次查找的估算——外表输出 100 行、内表每次查 10 行留 20%，内表累计约查 1000 行、连接输出约 200 行。别把内表 `rows=10` 当成整条查询只读 10 行，也别把各行 rows 简单相加。
- **对照实测**：数据倾斜、统计偏差会误估；验证时用 `EXPLAIN ANALYZE` 看实际行数、loops 和耗时。这个乘法不适用于所有连接算法，也不等于聚合 / 去重 / LIMIT 后的最终行数。

参考：[条件过滤与行数估算](https://dev.mysql.com/doc/refman/8.4/en/condition-filtering.html)。
