---
title: "MySQL EXPLAIN 辅助字段"
category: "MySQL"
updated_at: "2026-10-08"
tags: ["MySQL", "执行计划", "分区裁剪", "索引", "JOIN"]
aliases: ["EXPLAIN table/partitions/ref"]
---

**`table / partitions / ref` 是 EXPLAIN 里说明「访问谁、访问哪些分区、等值查找拿什么匹配」的三个字段。**

- **table**：表、别名或结果集。`FROM users AS u` 通常显示 u；也可能是 `<derived2>`、`<subquery2>`、`<union1,2>` 这类中间结果，数字用来关联查询块。
- **partitions**：计划访问的分区，非分区表通常为 NULL。分区表逻辑上仍是一张表，分区裁剪能排除不可能满足条件的分区，分区内再选索引或扫描方式。
- **ref**：索引的匹配对象。`const` 是常量，`库.表.列` 是拿别的表的列匹配，`func` 是表达式结果；NULL 表示没有等值匹配对象（范围扫描也可能为 NULL），不能据此断言没用索引。

例：订单表按年分 `p2025` / `p2026`，能裁剪时 partitions 显示 `p2026`，跨年时 `p2025,p2026`，通常仍只有一行表访问计划。JOIN 时 `table=o、key=idx_user_id、ref=示例库名.u.id` 表示用 u.id 去查 o——注意这里的 `ref` 是列名，和 `type=ref` 这个访问方式取值不同。
