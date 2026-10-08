---
title: "索引条件下推（ICP）"
category: "MySQL"
updated_at: "2026-10-08"
tags: ["索引条件下推", "ICP", "回表"]
aliases: ["ICP", "索引条件下推"]
---

**索引条件下推（Index Condition Pushdown, ICP）是把「只用索引列就能判断的条件」交给存储引擎先过滤、再回表**，从而减少回表次数。

**前提**：InnoDB 二级索引只存「索引列 + 主键」（见[[mysql-clustered-index|聚簇索引]]），查询要索引外的列就得回表；而 `WHERE` 过滤默认在 MySQL server 层做——存储引擎把行交上去才判断。所以**只用索引列就能判断的条件，本来也要先回表才能筛**，ICP 把它们下推到存储引擎，在回表前先筛。

例：联合索引 `(name, age)` 上执行 `name LIKE '张%' AND age = 20`，`age` 不用于缩小扫描区间，但能在索引条目里判断——ICP 先检查它，只对留下的候选读完整行。[[mysql-explain-extra|Extra]] 的 `Using index condition` 即 ICP，它**不等于[[mysql-covering-index|覆盖索引]]**（后者是 `Using index`，根本不用回表）。来源：[MySQL ICP](https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html)。
