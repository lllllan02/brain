---
title: "怎么读 EXPLAIN 结果"
category: "MySQL"
updated_at: "2026-10-08"
tags: ["MySQL", "执行计划", "示例"]
aliases: ["EXPLAIN 读法", "执行计划示例"]
---

**单表**：非分区表 `orders` 有 `user_id INT NOT NULL`、`status INT NOT NULL`，各建普通索引：

```sql
EXPLAIN FORMAT=TRADITIONAL
SELECT * FROM orders WHERE user_id = 100 AND status = 1;
```

一种可能计划（**数值示意，未实跑**；索引选择和估算随数据分布、统计信息、版本变化）：

```text
id  select_type  table   partitions  type  possible_keys           key          key_len  ref    rows  filtered  Extra
1   SIMPLE       orders  NULL        ref   idx_user_id,idx_status  idx_user_id  4        const  100   20.00     Using where
```

读法：`id=1`、`SIMPLE`、`orders` 是简单查询块访问订单表；两个索引都是候选，计划选了 `idx_user_id` 做 `ref` 等值查找（`key_len=4`、`ref=const`）；预计约 100 行候选，经 `status=1` 后留下 20%，即约 20 行，`Using where` 提示还要过滤。

**JOIN**：同一个 SELECT 访问两张表时，**一个查询块会有多行**（普通 JOIN 不会变成 PRIMARY/SUBQUERY）。`users.id` 是主键、`orders.user_id` 有普通索引时，通常是先从 u 做 `range` 取候选，再按 `ref` 用 `u.id` 查 o；优化器也可能选别的连接顺序或算法。分区表同样是「一行表访问」，跨年查询的 `partitions` 可能为 `p2025,p2026`。

参考：[EXPLAIN 文档](https://dev.mysql.com/doc/refman/8.4/en/explain.html)。
