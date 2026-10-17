---
learning_status: understood
title: "索引合并与跳跃扫描"
category: "MySQL"
parent: mysql-indexes
tags: ["索引", "执行计划"]
created_at: "2026-10-12T17:42:58+08:00"
updated_at: "2026-10-12T17:42:58+08:00"
reading_suggestions:
  - mysql-composite-index
  - mysql-manual-queries
---

**索引合并（Index Merge）是对同一张表执行多个索引范围扫描，再合并候选结果的访问策略。**

**跳跃扫描（Skip Scan）是枚举联合索引中缺少查询条件的前导键值，再对每组执行后续列范围扫描的访问策略。**

两者都扩展了「沿一个索引前缀定位」的简单路径；以下讨论 MySQL 8.4，是否采用仍由优化器按成本决定。

## 索引合并：把多个查找结果组合起来

假设 t 分别有 a、b 的单列索引，查询 `WHERE a = 1 OR b = 2`。只扫描 a 的匹配区间会遗漏仅满足 b 的行；只扫描 b 也一样。可分别找出两批候选，再取并集并去重，这就是一种 Index Merge 路径。

某些 AND 条件可使用交集；具体受算法条件限制。它合并的是同一张表的扫描结果，不是多表 JOIN，也不会把两个单列索引变成联合索引。

合并需要读取多批条目并组合结果；对于频繁的 `a = 1 AND b = 2`，联合索引可能直接定位较小范围，更省工作，但仍要比较实际成本。EXPLAIN 的 `type=index_merge` 和 Extra 中的 union、intersect 等可用于识别。

## 跳跃扫描：为缺失的前导列逐组补入口

假设索引为 `(a, b)`，查询 `SELECT a, b FROM t WHERE b > 100`。b 在各个 a 组内有序，却没有跨组的全局顺序，不能直接按普通[[mysql-composite-index|最左前缀方式]]定位。

若 a 只有 1、2 两种值，可分别扫描 `(a=1, b>100)` 和 `(a=2, b>100)`，跳过各组中不满足范围的部分。前导值很多时，需要反复定位，收益可能下降。

[[mysql-manual-queries#扩展索引访问策略|官方规则]]对 Skip Scan 有明确限制，包括单表、只引用索引中的列、无 GROUP BY 或 DISTINCT，以及后续键上的范围条件等；不能把它当作缺少前导条件时的通用补救。EXPLAIN 的 `Using index for skip scan` 可识别该路径。以上为假设推演，未运行 SQL。
