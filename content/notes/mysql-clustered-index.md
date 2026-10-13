---
learning_status: understood
title: "InnoDB 的聚簇索引与二级索引"
category: "MySQL"
parent: mysql-indexes
updated_at: "2026-10-12T16:58:43+08:00"
tags: ["MySQL", "聚簇索引", "主键", "二级索引"]
aliases: ["InnoDB 聚簇索引", "聚簇索引", "Clustered Index", "聚簇键"]
---

**聚簇索引（Clustered Index）是一种叶子保存行记录的索引结构。**

**二级索引（Secondary Index）是一种叶子保存索引列与聚簇键的索引结构。**

以下讨论 MySQL 8.4、InnoDB 的常规索引。两者都采用 [[mysql-index-structure|B+ 树]]：内部页负责导航，叶子保存各自的记录。

## 为什么需要两类索引

聚簇索引按聚簇键组织行记录，一张表只有一套这样的组织。若还要按姓名、邮箱等其他列查找，就建立相应的二级索引，也常称非聚簇索引。

二级索引保存聚簇键以定位对应行，不复制整行，减少重复存储。它找到的记录若缺少查询所需列，就要[[mysql-covering-index|回表]]补取；所需列齐全时则形成覆盖访问。

## 聚簇键与行记录

聚簇键通常是主键；没有主键时，InnoDB 会[[mysql-clustered-key|选择合适的非空唯一索引，或生成隐藏行 ID]]。二级索引也保存聚簇键，因此主键越宽，二级索引通常占用越多存储与缓存空间。

「聚簇、二级」描述行数据的存储组织，与主键、唯一、联合属于[[mysql-index-classification|不同分类维度]]，同一个索引可以兼具多种属性。

聚簇叶子保存行记录，长字段放不下时怎么办？可以将字段内容放到[[mysql-row-overflow|溢出页]]，在行记录中保留指针；读取这些内容时还需访问页外数据。
