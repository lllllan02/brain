---
learning_status: understood
title: "InnoDB 怎样选择聚簇键"
category: "MySQL"
parent: mysql-clustered-index
tags: ["MySQL", "聚簇索引", "主键"]
created_at: "2026-10-12T16:12:02+08:00"
updated_at: "2026-10-12T16:12:02+08:00"
---

**InnoDB 按「主键 → 所有列均为 NOT NULL 的首个唯一索引 → 隐藏行 ID」选择聚簇键，因此没有显式主键的表也有聚簇索引。** 聚簇键决定行记录在聚簇树中的组织顺序，二级索引也要依靠它定位行。

MySQL 8.4 的选择规则按表实际定义判断：

1. 存在主键（Primary Key）时，直接使用主键，可以是单列或多列。
2. 没有主键时，使用首个「每一列都声明为 `NOT NULL`」的唯一索引（Unique Index）。
3. 两者都没有时，建立名为 `GEN_CLUST_INDEX` 的隐藏聚簇索引，以内部生成的 6 字节递增行 ID 为键。

例如，表没有主键，只有 `UNIQUE(email)`，且 email 允许 NULL，即使当前所有邮箱都有值，它也不满足第二步。是否合格取决于「列定义」，不取决于当前数据碰巧没有 NULL。若 email 声明为 `NOT NULL`，且该索引是首个符合条件的唯一索引，便可用于聚簇组织。

以上规则来自 [[mysql-manual-queries#索引怎样找到记录|官方手册导读]]。隐藏行 ID 是引擎的内部标识，不能当作业务可直接使用的主键列；选择聚簇索引也不会使其他唯一索引失去唯一性约束。
