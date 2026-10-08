---
title: "MySQL EXPLAIN Extra"
category: "MySQL"
updated_at: "2026-10-08"
tags: ["MySQL", "执行计划", "覆盖索引", "索引条件下推", "排序", "临时表"]
aliases: ["EXPLAIN Extra"]
---

**`Extra` 是 EXPLAIN 里补充执行细节的字段**，同一行可有多个标记；**把标记当排查线索，结合候选行数和实际耗时判断代价**。

| 常见值 | 含义 | 下一步看什么 |
|---|---|---|
| `Using where` | 还要按条件过滤候选 | [[mysql-explain-rows-filtered\|rows/filtered]]，条件能否更早用于定位 |
| `Using index` | 所需列可从索引取得（[[mysql-covering-index\|覆盖索引]]） | 是否仍扫很多索引条目；不等于「用了索引」 |
| `Using index condition` | 索引条件下推（[[mysql-index-condition-pushdown\|ICP]]），先在索引层筛条件再读完整记录 | 哪些条件参与定位、是否减少回表 |
| `Using filesort` | 需要额外排序 | ORDER BY 与索引顺序是否匹配、待排序数据量 |
| `Using temporary` | 用了内部临时表 | GROUP BY / DISTINCT / ORDER BY 和中间结果规模 |

`Using where` 不等于索引失效；`Using index condition` 也不等于覆盖索引（ICP 是先筛掉一部分索引记录，减少完整记录读取）。**filesort 不必然写磁盘、temporary 也不必然落盘**——排序可以在内存完成，是否落盘看数据量、资源限制和执行方式。

例如 `Using temporary; Using filesort`，先找出产生临时结果和排序的操作，再看能否减少输入或利用索引顺序；小结果集的额外排序可能完全可接受，不必为了消标记盲目加索引。参考：[排序优化](https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html)、[ICP](https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html)。
