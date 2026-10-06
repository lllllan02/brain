---
title: "MySQL EXPLAIN Extra"
updated_at: "2026-10-06"
tags: ["MySQL"]
classes: ["concept"]
---

# MySQL EXPLAIN Extra

`Extra` 补充当前计划的执行细节，同一行可有多个标记。**把标记当作排查线索，结合候选行数和实际耗时判断代价**。

| 常见值 | 含义 | 下一步看什么 |
|---|---|---|
| `Using where` | 还需要按条件过滤候选记录 | [[mysql-explain-rows-filtered\|rows 是否很大、filtered 是否很低]]，条件能否更早用于定位 |
| `Using index` | 所需列可从索引取得，通常称为覆盖索引 | 是否仍扫描很多索引条目；不等于仅仅「使用了索引」 |
| `Using index condition` | 使用索引条件下推（ICP），先在索引层检查可用条件，再读取需要的完整记录 | 哪些条件参与定位、哪些被下推，是否减少回表 |
| `Using filesort` | 需要额外排序，未直接用索引顺序完成所需排序 | ORDER BY 与索引顺序是否匹配，以及待排序的数据量 |
| `Using temporary` | 使用内部临时表处理中间结果 | GROUP BY、DISTINCT、ORDER BY 等操作和中间结果规模 |

`Using where` 是常见的过滤步骤，不直接等于索引失效。`Using index condition` 也不等于覆盖索引：ICP 的作用是先筛掉一部分索引记录，减少后续完整记录读取。

**filesort 不必然写磁盘，temporary 也不必然是磁盘临时表。** 排序可以在内存完成；是否落盘还取决于数据量、资源限制和执行方式。

例如出现 `Using temporary; Using filesort`，先找出 SQL 中产生临时结果和排序的操作，再检查能否减少输入数据或利用合适的索引顺序。小结果集的额外排序可能完全可接受，不必为了消除标记盲目加索引。

参考：[MySQL 排序优化](https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html)、[索引条件下推](https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html)。
