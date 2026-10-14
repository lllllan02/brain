---
learning_status: understood
title: "为什么 InnoDB 选择 B+ 树而不是哈希索引"
category: "MySQL"
parent: mysql-index-structure
tags: ["MySQL", "B+树", "索引"]
created_at: "2026-10-12T15:25:39+08:00"
updated_at: "2026-10-12T15:59:40+08:00"
reading_suggestions:
  - mysql-manual-queries
---

**B+ 树「保留键的顺序」，能同时支持等值定位、范围查询与有序访问；哈希索引「不保留键序」，主要适合等值定位。因此，B+ 树更契合 InnoDB 常规索引的多种查询需求。**

| 关注点 | B+ 树 | 哈希索引 |
| --- | --- | --- |
| 等值定位 | 沿树定位记录 | **「按哈希定位桶」**，适合等值查询 |
| 范围与顺序 | **「保留键序」**，定位起点后沿叶子扫描 | **「不保留键序」**，不能直接按键范围或顺序扫描 |
| 数据增长时的维护 | 页空间不足时可能**「分裂页面」**并调整导航 | 需处理**「桶拥挤与扩容」**，具体方式取决于实现 |

前两项依据[[mysql-manual-queries#树索引与哈希的适用范围|官方比较]]。数据量大并不意味着哈希一定更差：例如 [PostgreSQL 的哈希索引](https://www.postgresql.org/docs/18/hash-index.html)可通过溢出页和增量分桶扩展，并非必须整体重建。因此，**「兼顾查询类型」才是这里的主要选型理由**，不能笼统归因于大数据量下的维护成本。
