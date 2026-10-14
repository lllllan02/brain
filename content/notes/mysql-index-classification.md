---
learning_status: understood
title: "主键、唯一、联合与聚簇索引怎样区分"
category: "MySQL"
parent: mysql-indexes
tags: ["MySQL", "索引", "主键", "联合索引"]
created_at: "2026-10-12T16:12:02+08:00"
updated_at: "2026-10-12T16:12:02+08:00"
reading_suggestions:
  - mysql-clustered-key
  - mysql-composite-index
---

**主键、唯一、联合与聚簇描述不同维度：约束、列的组合和行数据的组织方式。同一个索引可以同时具有多个属性。** 以下讨论 MySQL 8.4、InnoDB 的常规树索引。

| 判断什么 | 名称 | 含义 |
| --- | --- | --- |
| 是否约束取值 | 主键（Primary Key）、唯一索引（Unique Index）、普通索引 | 主键要求唯一且非空，一张表只能有一个；唯一索引约束键值，但可空列允许多个 NULL；普通索引不要求唯一。 |
| 由几列组成 | 单列索引、联合索引（Composite Index） | 联合索引由多列组成，主键或唯一索引都可以采用多列。 |
| 叶子保存什么 | 聚簇索引（Clustered Index）、二级索引（Secondary Index） | 聚簇叶子保存行记录；二级叶子保存索引列与聚簇键。 |

例如，假设订单明细表定义 `PRIMARY KEY(order_id, line_no)`，另有 `UNIQUE(order_id, product_id)`：前者同时是「联合主键」和「聚簇索引」；后者同时是「联合唯一索引」和「二级索引」。唯一性检查针对组合值，不要求每一列单独唯一。

上述约束依据 [[mysql-manual-queries#索引约束与列组合|CREATE TABLE 手册导读]]。联合索引的列顺序进一步决定[[mysql-composite-index|最左前缀的定位能力]]；聚簇与二级则决定取行路径，两种分类不能互相替代。

InnoDB 在表有主键时用主键做聚簇索引；没有主键时也会[[mysql-clustered-key|选择其他聚簇键]]。因此，「聚簇索引」不只包含用户显式定义的主键索引。
