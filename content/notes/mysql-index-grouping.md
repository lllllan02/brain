---
learning_status: understood
title: "索引与分组"
category: "MySQL"
parent: mysql-indexes
tags: ["索引", "SQL优化"]
created_at: "2026-10-12T17:42:58+08:00"
updated_at: "2026-10-12T17:42:58+08:00"
reading_suggestions:
  - mysql-manual-queries
---

**GROUP BY 是按指定列的相同取值，将输入行归组并计算聚合结果的操作。** 在 MySQL 8.4 中，索引能否帮助分组，取决于相同组能否按键序找到，以及聚合是否需要读取组内所有记录。

## 同样按用户分组，读取量为何不同

假设 InnoDB 订单表有索引 `(user_id, created_at)`：

```sql
SELECT user_id, MIN(created_at) FROM orders GROUP BY user_id;
SELECT user_id, COUNT(*) FROM orders GROUP BY user_id;
```

索引先按用户排列，同一用户内部再按时间排列。第一条只求最早时间，在满足优化条件时可直接访问各组边界；第二条要统计每组有多少条，普通索引条目没有预存组计数，仍需检查组内记录。两条都可能利用索引，却不会因此具有相同扫描量。

## 两种访问方式

**松散索引扫描（Loose Index Scan）是一种只访问各组所需少量索引键的分组访问方式。** 上面的 MIN 示例符合典型形态：单表、分组列构成索引最左前缀，MIN 的列紧随其后。还需满足完整列索引及其他条件，不能推广为所有聚合都能跳组；EXPLAIN 中的 `Using index for group-by` 是识别线索。

**紧凑索引扫描（Tight Index Scan）是一种读取所选索引范围内全部条目，再利用其顺序归组的访问方式。** 它可能省去临时归组工作，但通常没有省去组内扫描。前导或中间列若被等值条件固定，也可能让所需分组列在扫描范围内连续。

上述区分及限制来自[[mysql-manual-queries#排序与分组的索引访问|GROUP BY 官方说明]]。不能把 `Using index` 的覆盖访问与 `Using index for group-by` 混为一谈；MySQL 8.4 的 GROUP BY 不保证输出有序，需要顺序时另写 ORDER BY。示例未运行性能测试。
