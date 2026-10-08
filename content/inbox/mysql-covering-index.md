---
title: "覆盖索引（Covering Index）"
category: "MySQL"
updated_at: "2026-10-08"
tags: ["覆盖索引", "回表", "索引"]
aliases: ["覆盖索引", "Covering Index"]
---

**覆盖索引是让「查询需要的列都能从索引里取到」的索引**，这样就不必拿聚簇键 [[mysql-clustered-index|回表]]读整行。以 InnoDB 表 `users(id, name, age, email)` 上的联合索引 `(name, age)` 为例：`SELECT id, age ... WHERE name = 'Alice'` 被覆盖（id 随二级条目保存），而 `SELECT email ...` 需要 email，通常要回表。

**覆盖是「索引与查询」的关系，不是一种额外的树结构**——同一个索引对这条查询覆盖、对另一条不覆盖；事务可见性检查等路径有时仍要读聚簇记录，不能承诺永远零回表。后续列即使不参与范围定位，也可能在索引上过滤（见[[mysql-index-condition-pushdown|ICP]]）或直接提供所需列。

验证收益看 [[mysql-explain-extra|Extra]] 的 `Using index`，但它没出现也不能断定回表多（主键访问本就直读聚簇记录）。扩大索引能少读行，却增加空间和写入维护——比较候选行数与实测耗时，别只为消标记而加宽。结构见 [[mysql-index-structure|InnoDB 索引结构]]。
