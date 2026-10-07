---
title: "回表、覆盖索引与索引条件下推怎样配合？"
category: "MySQL"
updated_at: "2026-10-07"
tags: ["回表", "覆盖索引", "ICP"]
type: "concept"
aliases: ["覆盖索引", "回表", "索引条件下推"]
---

回表是通过二级索引中的聚簇键继续读取聚簇记录。覆盖索引让查询所需列可从索引取得，ICP 则在必须继续读行时先用索引中的条件过滤，减少候选回表次数。

以下以 InnoDB 表 `users(id PRIMARY KEY, name, age, email)` 与联合索引 `(name, age)` 为例，SQL 仅用于解释，未运行。

```sql
SELECT id, age FROM users WHERE name = 'Alice';
SELECT email FROM users WHERE name = 'Alice' AND age = 20;
```

第一条所需列都能从二级索引取得，其中 id 是随二级条目保存的主键。第二条仍需要 email，通常还要读取聚簇记录。覆盖是索引与查询的关系，不是额外一种树结构；事务可见性检查等路径也可能需要访问聚簇记录，不能承诺物理上永远零回表。

## 范围扫描以后，后续列还有什么用

对 `(name, age)` 执行 `name LIKE '张%' AND age = 20` 时，即使 age 不能进一步缩小当前选定的扫描区间，它仍可从索引条目中读取。若采用 ICP，存储引擎先检查 age，仅对保留的候选读取完整行。

因此要区分「参与定位扫描范围」「在索引上过滤」「提供查询所需列」。不能把某列未参与范围定位说成完全没用到索引。具体计划还取决于表达式、索引与优化器选择。

## 如何验证收益

[[mysql-explain-extra|Extra]] 中 `Using index` 提示覆盖访问，`Using index condition` 表示使用 ICP，二者含义不同。没有前者也不能单凭这一项断定回表次数，例如主键访问本来就直接读取聚簇记录。

扩大联合索引可能减少读行，却增加空间与写入维护成本。比较候选行数、实际扫描与耗时，避免只为消除某个标记而加宽索引。

机制见 [MySQL ICP](https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html)，结构前提见 [[mysql-index-structure|InnoDB 索引组织]]。
