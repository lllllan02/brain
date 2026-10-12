---
title: "索引与排序"
category: "MySQL"
parent: mysql-indexes
tags: ["索引", "SQL优化"]
created_at: "2026-10-12T17:42:58+08:00"
updated_at: "2026-10-12T17:42:58+08:00"
---

**利用索引排序，是按索引已有的键序读取记录，使结果满足 ORDER BY，省去额外排序。** 关键在于扫描得到的顺序是否符合查询要求，不是排序列有没有出现在某个索引中。以下讨论 MySQL 8.4、InnoDB。

## 先固定前导列，后续顺序才有用

假设订单索引为 `(user_id, created_at, id)`，id 是主键：

```sql
SELECT id, created_at FROM orders
WHERE user_id = 7
ORDER BY created_at, id;
```

采用该索引时，先定位用户 7；这一段中记录已经按时间、id 排好，沿叶子扫描即可输出。

若改成 `WHERE user_id IN (7, 8) ORDER BY created_at, id`，索引先列出用户 7 的记录，再列出用户 8 的记录；两段各自有序，合在一起未必全局按时间有序。因此，仅凭这个扫描顺序不能省去排序。原因来自[[mysql-composite-index|联合索引的逐列排列]]。

## 升降序与成本

全升序索引可反向扫描，满足对应列的全降序。若要求 `created_at DESC, id ASC`，则需要匹配的混合方向索引，或其整体反向；把全升序索引倒着读，会同时反转两列，不能只反转其中一列。MySQL 8.4 支持在索引定义中指定 DESC。

能提供顺序，也未必值得使用：一个索引可能筛选得更少，另一个能省排序。若后者扫描或回表过多，优化器可能选择前者再排序，仍需按[[mysql-index-access-cost|总成本]]比较。

## 怎样确认

[[mysql-manual-queries#排序与分组的索引访问|官方排序说明]]将额外排序称为 filesort；EXPLAIN 的 `Using filesort` 表示存在这一步，**不等于一定写磁盘**，小结果可在内存中排序。检查是否省排序之外，还要观察扫描量和回表需求。

返回顺序必须由 ORDER BY 声明；时间相同时加唯一 id 可确定先后，这对[[mysql-index-pagination|分页]]尤其重要。以上例子为结构推演，未做性能测试。
