---
title: "MySQL EXPLAIN 辅助字段"
updated_at: "2026-10-06"
tags: ["MySQL"]
classes: ["concept"]
---

`table / partitions / ref` 分别说明**访问谁、访问哪些分区、索引等值查找拿什么来匹配**。它们把 [[mysql-explain-type|type]]、[[mysql-explain-index-fields|key]]、[[mysql-explain-rows-filtered|rows]] 等字段对应到具体对象。

1. **table：表、别名或结果集**。`FROM users AS u` 的计划通常显示 u；还可能显示 `<derived2>`、`<subquery2>`、`<union1,2>` 之类的中间结果名称，数字用来关联查询块。
2. **partitions：计划访问的分区**。非分区表通常为 NULL。MySQL 分区表逻辑上仍是一张表，由预定义规则划分数据；分区裁剪能排除不可能满足条件的分区，分区内仍要选择索引或扫描方式。
3. **ref：索引匹配对象**。`const` 表示常量，`库.表.列` 表示拿其他表的列值匹配，`func` 表示表达式结果；NULL 表示没有这里可展示的等值匹配对象，范围扫描也可能为 NULL，不能据此断言没用索引。

例如订单表按年份分为 `p2025` 和 `p2026`：仅查 2026 年且能裁剪时，partitions 可显示 `p2026`；跨两个年份时可显示 `p2025,p2026`。通常仍只有一行表访问计划，不会每个分区自动产生一行。

JOIN 时若 `table=o`、`key=idx_user_id`、`ref=示例库名.u.id`，表示对 o 使用该索引，拿 u.id 作为查找值。这里 ref 是输出列名，与 `type=ref` 这个访问方式取值需要区分。
