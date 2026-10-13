---
learning_status: understood
title: "索引与排序"
category: "MySQL"
parent: mysql-indexes
tags: ["索引", "SQL优化"]
created_at: "2026-10-12T17:42:58+08:00"
updated_at: "2026-10-12T22:08:19+08:00"
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

## 少扫描还是省排序

假设查询某地区最近二十笔订单，region、created_at 非空，id 唯一，现有索引分别为 `(region)` 与 `(created_at, id)`：

```sql
SELECT id, created_at FROM orders
WHERE region = 'east'
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

| 候选路径 | 做哪些工作 | 取舍 |
| --- | --- | --- |
| 用 region 索引筛选，再排序 | 取得 east 候选的时间与 ID，再选出最近二十条 | east 很少时可少扫描；仍需读取匹配候选，LIMIT 不会免掉这些输入 |
| 沿时间索引反向扫描，逐行检查 region | 依次判断最近订单，找足二十条即可停止 | 可省排序；east 稀少或集中在较早位置时，可能越过大量不匹配订单 |

索引 `(region, created_at, id)` 可把固定地区的定位与时间顺序结合起来，减少这两条路径之间的冲突；是否新增还需评估其他查询、空间与写入成本。如果匹配不足二十条，也须扫描完该地区的候选范围。

上述工作量由访问路径推演。[[mysql-manual-queries#分页与连接的工作量|官方 LIMIT 示例]]展示了有序主键扫描与过滤索引加 filesort 的选择变化，但没有证明哪条固定更快。实际比较应看为找到二十条而检查了多少候选、是否需要回表和总耗时；不要仅以消除 filesort 判定优化成功。

## 怎样确认

[[mysql-manual-queries#排序与分组的索引访问|官方排序说明]]将额外排序称为 filesort；EXPLAIN 的 `Using filesort` 表示存在这一步，**不等于一定写磁盘**，小结果可在内存中排序。检查是否省排序之外，还要观察扫描量和回表需求。

返回顺序必须由 ORDER BY 声明；时间相同时加唯一 id 可确定先后，这对[[mysql-index-pagination|分页]]尤其重要。以上例子为结构推演，未做性能测试。
