---
learning_status: understood
title: "MySQL 索引"
category: "MySQL"
parent: mysql-overview
tags: ["MySQL", "索引", "B+树"]
created_at: "2026-10-12T15:03:03+08:00"
updated_at: "2026-10-12T18:17:22+08:00"
reading_suggestions:
  - mysql-index-structure
  - mysql-clustered-index
  - mysql-index-classification
  - mysql-composite-index
  - mysql-index-predicates
  - mysql-covering-index
  - mysql-index-condition-pushdown
  - mysql-index-access-cost
  - mysql-index-maintenance
---

**索引（Index）是数据库按键值组织记录或记录定位信息、用于加速数据访问的数据结构。** 它提供额外的查找路径，让查询有机会少扫描、少取行或少排序；代价是存储空间和写入维护。以下以 MySQL 8.4、InnoDB 为范围。

## 数据怎样组织

常规索引采用 [[mysql-index-structure|B+ 树]]：内部页导航，叶子按键序组织记录，支持等值定位与范围扫描。[[mysql-clustered-index|聚簇索引与二级索引]]的区别在叶子：前者保存行记录，后者保存索引列和聚簇键，以较少的重复存储提供其他查找入口。

主键、唯一、联合、聚簇属于[[mysql-index-classification|不同分类维度]]，分别涉及约束、列组合和数据组织，不能当成互斥的几类索引。

## 查询开销与对应机制

分析查询时，分清「定位候选、扫描过滤、补取字段、排序或聚合」各步的工作，再选择对应方案：

| 要减少什么工作 | 对应机制或做法 | 关键边界 |
| --- | --- | --- |
| 扫描无关记录 | 让[[mysql-index-predicates\|查询条件]]形成键值范围，按[[mysql-composite-index\|联合索引的列序与最左前缀]]定位 | 未参与定位的列仍可能用于过滤或覆盖 |
| 从二级索引补取完整行 | [[mysql-covering-index\|覆盖索引]]提供查询所需全部列；仍需回表时，[[mysql-index-condition-pushdown\|ICP]]先过滤不合格候选 | 覆盖与 ICP 减少取行，不保证扫描范围小 |
| 排序与分组处理 | [[mysql-index-ordering\|排序]]利用已有键序；[[mysql-index-grouping\|分组]]在条件允许时按组扫描或访问组边界 | 省去排序不等于省去组内扫描 |
| 分页中的跳过与大量取数 | [[mysql-index-pagination\|分页优化]]汇总延迟关联、游标、位置预计算及分批读取 | 分别减少取行、偏移扫描或单批资源占用，不能互相替代 |
| 多表反复匹配 | [[mysql-index-joins\|JOIN 索引]]减少参与连接的行，或每轮匹配的候选 | 还要看连接算法、顺序与循环次数 |

这些机制可以组合。普通前缀定位之外，[[mysql-index-access-strategies|索引合并与跳跃扫描]]还可通过合并候选、逐组定位扩展访问路径，但有适用条件和额外成本。

词项、空间关系和 JSON 数组成员需要不同的匹配入口，可使用[[mysql-specialized-indexes|全文、空间与多值索引]]，不能直接套用普通列值查找的语义。

## 怎样设计与验证

设计从实际查询出发，同时考虑过滤、排序、所需列和读写负载。长字符串可用[[mysql-prefix-index|前缀索引]]缩小条目，但截短会损失完整值的信息，影响过滤、覆盖和排序能力。

**「能使用索引」不等于「使用它最便宜」。** [[mysql-index-access-cost|索引选择]]比较扫描、取行等成本；用 EXPLAIN 查看计划，再用会实际执行查询的 EXPLAIN ANALYZE 核对行数、循环与耗时。

[[mysql-index-maintenance|索引维护]]把设计落实到创建、验证和移除：检查现有索引与约束，用不可见索引观察停用影响，并评估空间、写入和 DDL 成本。各机制的证据与版本条件集中在[[mysql-manual-queries|官方手册导读]]。
